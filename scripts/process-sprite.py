#!/usr/bin/env python3
"""
把 AI 生成的色键版角色图处理成真正的低分辨率像素精灵。每个角色一个文件夹：

    .venv-tools/bin/python scripts/process-sprite.py            # 处理 assets/character/ 下所有角色
    .venv-tools/bin/python scripts/process-sprite.py daoshi     # 只处理一个

输入  assets/character/<id>/key.png         色键版（大面积换色区洋红、小面积换色区青色），正式素材
      assets/character/<id>/ref.png         原配色参考（不参与处理）
      assets/character/<id>/character.json  名字、印字区域排法 writing: vertical | horizontal
输出  src/assets/sprite/<id>.json           精灵数据（底层像素 + 换色索引 + 印字区域的位置）
      preview/character/<id>/sprite-base.png      底层（放大，便于检查）
      preview/character/<id>/sprite-regions.png   换色区域与深浅档（放大）
      preview/character/<id>/outfits.png          木火土金水五种日子的配色

处理步骤：
1. 沿边缘强度用动态规划找出每一条实际网格线（AI 画的格子不均匀），每格取主色，不插值
2. alpha 二值化，去掉孤立杂点和极小的碎块
3. 按色相识别洋红（道袍）和青色（腰带），每格的深浅归成 暗 / 中 / 亮 三档
4. 其余像素原样保留为底层
5. 找出印字区域的米白空白矩形（幡面、扇面、告示）和整个书写物的范围（点击判定、卷轴动画用）
   竖幡（道士）按木轴和握杆的手找范围；横排的书写物从米白区域向外扩到边框为止
6. 用 rules/default.json 的像素色阶画出五种配色的预览，并检查没有残留洋红 / 青色
"""
import colorsys
import math
import json
import sys
from collections import Counter
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
CHAR_DIR = ROOT / "assets/character"
SPRITE_DIR = ROOT / "src/assets/sprite"
# 横排书写物：从米白区域向外最多扩几格算边框（character.json 的 writingFrame 可以按角色改）
H_FRAME = 3
# 竖排书写物：character.json 的 writingSide 是写字面那几行里、写字面左右各最多算几格边框
# （再往外是紧贴着的耳朵、脑袋）；不写就不限制（道士的幡边框宽，不能限制）

REGIONS = {1: "robe", 2: "sash"}
SHADES = ("dark", "mid", "light")


# ── 1. 网格 ─────────────────────────────────────────────

def edge_profiles(rgb, opaque):
    dx = (np.abs(np.diff(rgb, axis=1)).sum(axis=2) > 50) & (opaque[:, 1:] | opaque[:, :-1])
    dy = (np.abs(np.diff(rgb, axis=0)).sum(axis=2) > 50) & (opaque[1:, :] | opaque[:-1, :])
    # 加上透明度的边缘，轮廓外沿也算格线
    ax = np.abs(np.diff(opaque.astype(int), axis=1)) > 0
    ay = np.abs(np.diff(opaque.astype(int), axis=0)) > 0
    col = (dx | ax).sum(axis=0).astype(float)
    row = (dy | ay).sum(axis=1).astype(float)
    # 边缘在第 i 和 i+1 像素之间 → 记为格线位置 i+1
    return np.concatenate([[0], col]), np.concatenate([[0], row])


def estimate_period(profile, lo=6.0, hi=16.0):
    e = profile - profile.mean()
    k = np.arange(len(e))
    best = max(np.arange(lo, hi, 0.02), key=lambda s: abs((e * np.exp(-2j * np.pi * k / s)).sum()))
    return float(best)


# AI 画的像素格本来是正方形、约 10.5 原图像素；两个方向各自估出来的周期差太多时不可信
PERIOD_AGREE = 0.06
PERIOD_RANGE = (9.8, 11.5)


def joint_period(colp, rowp, lo=PERIOD_RANGE[0], hi=PERIOD_RANGE[1]):
    """两个方向的频谱各自归一化后相加，在合理范围内取峰值，横竖用同一个周期（格子保持正方形）"""
    ss = np.arange(lo, hi, 0.02)

    def spectrum(profile):
        e = profile - profile.mean()
        k = np.arange(len(e))
        pw = np.array([abs((e * np.exp(-2j * np.pi * k / s)).sum()) for s in ss])
        return pw / pw.max()

    return float(ss[int(np.argmax(spectrum(colp) + spectrum(rowp)))])


def find_lines(profile, start, end, period):
    """在 [start, end] 内选一串格线，相邻间距在 0.75~1.3 倍周期之间，使格线上的边缘强度之和最大。"""
    smooth = np.convolve(profile, [0.25, 1.0, 0.25], mode="same")
    dmin, dmax = int(np.floor(period * 0.75)), int(np.ceil(period * 1.3))
    n = end - start + 1
    best = np.full(n, -1e18)
    prev = np.full(n, -1, dtype=int)
    best[0] = smooth[start]
    for i in range(1, n):
        lo, hi = max(0, i - dmax), i - dmin
        if hi < lo:
            continue
        j = lo + int(np.argmax(best[lo:hi + 1]))
        if best[j] > -1e17:
            # 轻微偏向标准间距，避免在大片纯色区随意取线
            penalty = 0.15 * abs((i - j) - period)
            best[i] = best[j] + smooth[start + i] - penalty
            prev[i] = j
    # 终点取最后一个周期内得分最高的位置
    tail = max(range(max(0, n - dmax), n), key=lambda i: best[i])
    lines = []
    i = tail
    while i >= 0:
        lines.append(start + i)
        i = prev[i]
    return lines[::-1]


# ── 2. 采样与清理 ──────────────────────────────────────

def sample_cells(img, xs, ys):
    h, w = len(ys) - 1, len(xs) - 1
    rgb = np.zeros((h, w, 3), dtype=np.uint8)
    alpha = np.zeros((h, w), dtype=bool)
    for cy in range(h):
        for cx in range(w):
            x0, x1, y0, y1 = xs[cx], xs[cx + 1], ys[cy], ys[cy + 1]
            # 取格子中间 60% 的像素，避开格线附近的过渡色
            mx, my = max(1, (x1 - x0) // 5), max(1, (y1 - y0) // 5)
            block = img[y0 + my:y1 - my, x0 + mx:x1 - mx].reshape(-1, 4)
            if len(block) == 0:
                block = img[y0:y1, x0:x1].reshape(-1, 4)
            opaque = block[block[:, 3] > 128]
            if len(opaque) * 2 < len(block):
                continue
            alpha[cy, cx] = True
            # 主色：先粗量化找众数，再对众数附近的像素取中位数
            q = (opaque[:, :3] // 24).astype(np.int32)
            keys = q[:, 0] * 10000 + q[:, 1] * 100 + q[:, 2]
            mode = Counter(keys.tolist()).most_common(1)[0][0]
            sel = opaque[keys == mode][:, :3]
            rgb[cy, cx] = np.median(sel, axis=0).astype(np.uint8)
    return rgb, alpha


def clean_alpha(alpha):
    h, w = alpha.shape
    a = alpha.copy()
    # 去掉孤立点：四邻都透明的不透明格
    for y in range(h):
        for x in range(w):
            if not a[y, x]:
                continue
            n = sum(a[yy, xx] for yy, xx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)) if 0 <= yy < h and 0 <= xx < w)
            if n == 0:
                a[y, x] = False
    # 去掉小于 4 格的连通碎块
    seen = np.zeros_like(a)
    for y in range(h):
        for x in range(w):
            if a[y, x] and not seen[y, x]:
                stack, comp = [(y, x)], []
                seen[y, x] = True
                while stack:
                    cy, cx = stack.pop()
                    comp.append((cy, cx))
                    for yy, xx in ((cy - 1, cx), (cy + 1, cx), (cy, cx - 1), (cy, cx + 1)):
                        if 0 <= yy < h and 0 <= xx < w and a[yy, xx] and not seen[yy, xx]:
                            seen[yy, xx] = True
                            stack.append((yy, xx))
                if len(comp) < 4:
                    for cy, cx in comp:
                        a[cy, cx] = False
    return a


# ── 3. 换色区域 ────────────────────────────────────────

def hsv(c):
    return colorsys.rgb_to_hsv(*(np.asarray(c, dtype=float) / 255.0))


def classify_region(c):
    h, s, v = hsv(c)
    hue = h * 360
    if s < 0.30 or v < 0.16:
        return 0
    if 280 <= hue <= 340:
        return 1  # 洋红 → 道袍
    if 165 <= hue <= 210:
        return 2  # 青色 → 腰带
    return 0


def luminance(c):
    r, g, b = (np.asarray(c, dtype=float) / 255.0)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def kmeans_1d(values, k=3, iters=50):
    values = np.asarray(values, dtype=float)
    centers = np.quantile(values, [0.15, 0.5, 0.85])
    for _ in range(iters):
        labels = np.argmin(np.abs(values[:, None] - centers[None, :]), axis=1)
        new = np.array([values[labels == i].mean() if np.any(labels == i) else centers[i] for i in range(k)])
        if np.allclose(new, centers):
            break
        centers = new
    order = np.argsort(centers)
    return centers[order]


def is_tinted(c, region):
    """偏洋红 / 偏青的残留色（比如轮廓边上的过渡色），饱和度门槛比 classify_region 低"""
    h, s, v = hsv(c)
    hue = h * 360
    if s < 0.18 or v < 0.10:
        return False
    if region == 1:
        return 280 <= hue <= 340
    return 165 <= hue <= 210


# ── 5. 幡 ─────────────────────────────────────────────

def is_paper(c):
    h, s, v = hsv(c)
    return v > 0.80 and s < 0.30 and 0.08 <= h <= 0.20


def largest_component(mask):
    h, w = mask.shape
    seen = np.zeros_like(mask)
    best = []
    for y in range(h):
        for x in range(w):
            if mask[y, x] and not seen[y, x]:
                stack, comp = [(y, x)], []
                seen[y, x] = True
                while stack:
                    cy, cx = stack.pop()
                    comp.append((cy, cx))
                    for yy, xx in ((cy - 1, cx), (cy + 1, cx), (cy, cx - 1), (cy, cx + 1)):
                        if 0 <= yy < h and 0 <= xx < w and mask[yy, xx] and not seen[yy, xx]:
                            seen[yy, xx] = True
                            stack.append((yy, xx))
                if len(comp) > len(best):
                    best = comp
    return best


def max_inner_rect(mask, y0, y1, x0, x1):
    """在 bbox 内找全为 True 的最大矩形（直方图法）"""
    best = (0, None)
    hts = np.zeros(x1 - x0 + 1, dtype=int)
    for y in range(y0, y1 + 1):
        row = mask[y, x0:x1 + 1]
        hts = np.where(row, hts + 1, 0)
        stack = []
        for i in range(len(hts) + 1):
            cur = hts[i] if i < len(hts) else 0
            start = i
            while stack and stack[-1][1] >= cur:
                s, hh = stack.pop()
                area = hh * (i - s)
                if area > best[0]:
                    best = (area, (x0 + s, y - hh + 1, i - s, hh))
                start = s
            stack.append((start, cur))
    return best[1]


def process(cid):
    src = CHAR_DIR / cid / "key.png"
    meta = json.loads((CHAR_DIR / cid / "character.json").read_text(encoding="utf-8"))
    writing = meta.get("writing", "vertical")
    out_json = SPRITE_DIR / f"{cid}.json"
    print(f"── {cid}（{meta['name']['zh-CN']}，{'竖排' if writing == 'vertical' else '横排'}）")
    img = np.asarray(Image.open(src).convert("RGBA")).astype(np.int32)
    rgb, a = img[..., :3], img[..., 3]
    opaque = a > 128
    ys_op, xs_op = np.nonzero(opaque)
    bx0, bx1, by0, by1 = xs_op.min(), xs_op.max() + 1, ys_op.min(), ys_op.max() + 1

    colp, rowp = edge_profiles(rgb, opaque)
    px, py = estimate_period(colp), estimate_period(rowp)
    if abs(px - py) / min(px, py) > PERIOD_AGREE:
        # 例：小和尚横向估成 12.9、纵向 10.5，人会被压窄；改用两个方向共同的周期
        print(f"两个方向的格子周期差太多（x≈{px:.2f} y≈{py:.2f}），改用共同周期")
        px = py = joint_period(colp, rowp)
    xs = find_lines(colp, max(0, bx0 - 2), min(img.shape[1], bx1 + 2), px)
    ys = find_lines(rowp, max(0, by0 - 2), min(img.shape[0], by1 + 2), py)
    print(f"格子周期 x≈{px:.2f}px y≈{py:.2f}px，网格 {len(xs) - 1}×{len(ys) - 1}")

    cell_rgb, cell_a = sample_cells(img.astype(np.uint8), xs, ys)
    cell_a = clean_alpha(cell_a)

    # 裁掉四周全透明的行列
    rows = np.nonzero(cell_a.any(axis=1))[0]
    cols = np.nonzero(cell_a.any(axis=0))[0]
    cell_rgb = cell_rgb[rows[0]:rows[-1] + 1, cols[0]:cols[-1] + 1]
    cell_a = cell_a[rows[0]:rows[-1] + 1, cols[0]:cols[-1] + 1]
    H, W = cell_a.shape
    print(f"精灵图 {W}×{H} 格")

    # 3. 换色区域
    region = np.zeros((H, W), dtype=int)
    for y in range(H):
        for x in range(W):
            if cell_a[y, x]:
                region[y, x] = classify_region(cell_rgb[y, x])
    # 残留的偏色格：紧挨着区域的并入区域，其他的去饱和
    for _ in range(2):
        for y in range(H):
            for x in range(W):
                if not cell_a[y, x] or region[y, x]:
                    continue
                for r in (1, 2):
                    if is_tinted(cell_rgb[y, x], r):
                        near = any(
                            0 <= yy < H and 0 <= xx < W and region[yy, xx] == r
                            for yy, xx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1))
                        )
                        if near:
                            region[y, x] = r
                        else:
                            g = int(luminance(cell_rgb[y, x]) * 255)
                            cell_rgb[y, x] = (g, g, g)
    shade = np.full((H, W), -1, dtype=int)
    for r in (1, 2):
        idx = np.argwhere(region == r)
        lum = [luminance(cell_rgb[y, x]) for y, x in idx]
        centers = kmeans_1d(lum)
        for (y, x), l in zip(idx, lum):
            shade[y, x] = int(np.argmin(np.abs(centers - l)))
        counts = Counter(shade[region == r].tolist())
        print(f"{REGIONS[r]}：{len(idx)} 格，深浅档 {dict(sorted(counts.items()))}")

    # 4. 底层调色板
    base_colors = {}
    base_rows = []
    for y in range(H):
        line = []
        for x in range(W):
            if not cell_a[y, x] or region[y, x]:
                line.append(-1)
                continue
            hexc = "#%02X%02X%02X" % tuple(int(v) for v in cell_rgb[y, x])
            base_colors.setdefault(hexc, len(base_colors))
            line.append(base_colors[hexc])
        base_rows.append(line)
    # 合并非常接近的颜色，调色板控制在单字符能表示的范围
    palette = list(base_colors)
    alphabet = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ!#$%&()*+,-/:;<=>?@[]^_`{|}~"
    if len(palette) > len(alphabet):
        arr = np.array([[int(p[i:i + 2], 16) for i in (1, 3, 5)] for p in palette], dtype=float)
        # 逐步合并最近的两种颜色（按格数加权求平均）
        counts = Counter(v for line in base_rows for v in line if v >= 0)
        groups = [[i] for i in range(len(palette))]
        cents = arr.copy()
        weights = np.array([counts[i] for i in range(len(palette))], dtype=float)
        alive = np.ones(len(palette), dtype=bool)
        dist = np.abs(cents[:, None, :] - cents[None, :, :]).sum(axis=2)
        np.fill_diagonal(dist, np.inf)
        while alive.sum() > len(alphabet):
            i, j = np.unravel_index(np.argmin(dist), dist.shape)
            if i > j:
                i, j = j, i
            cents[i] = (cents[i] * weights[i] + cents[j] * weights[j]) / (weights[i] + weights[j])
            weights[i] += weights[j]
            groups[i] += groups[j]
            groups[j] = []
            alive[j] = False
            dist[j, :] = np.inf
            dist[:, j] = np.inf
            d = np.abs(cents - cents[i]).sum(axis=1)
            d[~alive] = np.inf
            d[i] = np.inf
            dist[i, :] = d
            dist[:, i] = d
        keep = [k for k in range(len(palette)) if alive[k]]
        groups = [groups[k] for k in keep]
        cents = [cents[k] for k in keep]
        remap = {}
        for gi, g in enumerate(groups):
            for old in g:
                remap[old] = gi
        palette = ["#%02X%02X%02X" % tuple(int(round(v)) for v in c) for c in cents]
        base_rows = [[remap[v] if v >= 0 else -1 for v in line] for line in base_rows]
    print(f"底层颜色 {len(palette)} 种")

    base = ["".join("." if v < 0 else alphabet[v] for v in line) for line in base_rows]
    region_code = {(1, 0): "a", (1, 1): "b", (1, 2): "c", (2, 0): "x", (2, 1): "y", (2, 2): "z"}
    regions = [
        "".join(region_code.get((region[y, x], shade[y, x]), ".") for x in range(W))
        for y in range(H)
    ]

    # 5. 幡
    paper = np.zeros((H, W), dtype=bool)
    for y in range(H):
        for x in range(W):
            paper[y, x] = cell_a[y, x] and not region[y, x] and is_paper(cell_rgb[y, x])
    comp = largest_component(paper)
    py0, py1 = min(c[0] for c in comp), max(c[0] for c in comp)
    px0, px1 = min(c[1] for c in comp), max(c[1] for c in comp)
    face = max_inner_rect(paper, py0, py1, px0, px1)
    fx, fy, fw, fh = (int(v) for v in face)
    print(f"幡面空白 x={fx} y={fy} {fw}×{fh} 格")

    if writing == "horizontal":
        mask = horizontal_mask(paper, cell_a, cell_rgb, region, face, H, W, meta.get("writingFrame", H_FRAME), meta.get("writingShape"))
    else:
        mask = vertical_mask(cell_a, cell_rgb, region, face, H, W, meta.get("writingSide"))
    ys_m, xs_m = np.nonzero(mask)
    bx0, bx1, by0, by1 = xs_m.min(), xs_m.max(), ys_m.min(), ys_m.max()
    banner = {"x": int(bx0), "y": int(by0), "w": int(bx1 - bx0 + 1), "h": int(by1 - by0 + 1)}
    banner_mask = ["".join("1" if mask[yy, xx] else "0" for xx in range(bx0, bx1 + 1)) for yy in range(by0, by1 + 1)]
    print(f"整个书写物 x={banner['x']} y={banner['y']} {banner['w']}×{banner['h']} 格，共 {int(mask.sum())} 格")

    # 头顶：角色头部最高处（书写物以外的不透明格）
    head_top = next(y for y in range(H) if any(cell_a[y, x] and not mask[y, x] for x in range(W)))

    data = {
        "$comment": f"由 scripts/process-sprite.py 从 assets/character/{cid}/key.png 生成，不要手改",
        "id": cid,
        "writing": writing,
        "width": W,
        "height": H,
        "palette": palette,
        "alphabet": alphabet[: len(palette)],
        "base": base,
        "regionCodes": {"a": ["robe", 0], "b": ["robe", 1], "c": ["robe", 2], "x": ["sash", 0], "y": ["sash", 1], "z": ["sash", 2]},
        "regions": regions,
        "bannerFace": {"x": fx, "y": fy, "w": fw, "h": fh},
        "banner": banner,
        "bannerMask": banner_mask,
        "headTop": int(head_top),
    }
    if meta.get("writingShape") == "fan":
        # 扇面是扇形（环形扇区），写字时沿弧排；矩形 bannerFace 只框得到中间一小块
        data["writingArc"] = fit_fan(paper & mask)
        a = data["writingArc"]
        print(f"扇面：圆心 ({a['cx']}, {a['cy']})，半径 {a['r0']}–{a['r1']}，角度 {math.degrees(a['a0']):.0f}°–{math.degrees(a['a1']):.0f}°")
    out_json.parent.mkdir(parents=True, exist_ok=True)
    out_json.write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"→ {out_json.relative_to(ROOT)}")

    write_previews(data, ROOT / "preview/character" / cid)


def fit_fan(paper):
    """
    扇面 = 以扇轴为圆心的环形扇区。在留白下方搜索圆心，对每个候选算留白格的半径、角度分布（去掉两头 3% / 2%），
    取「扇区里留白的密度 × 覆盖的留白比例」最大的一组。坐标都是格（格中心 +0.5），角度按屏幕坐标（y 向下），弧度。
    """
    ys, xs = np.nonzero(paper)
    P = np.stack([xs + 0.5, ys + 0.5], axis=1)
    pset = set(zip(xs.tolist(), ys.tolist()))
    x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
    h = y1 - y0 + 1
    best = None
    for cy in np.arange(y1, y1 + 2 * h, 0.5):
        for cx in np.arange(x0, x1 + 1, 0.5):
            dx, dy = P[:, 0] - cx, P[:, 1] - cy
            if (dy > 0).any():
                continue  # 留白都在扇轴上方
            r = np.hypot(dx, dy)
            a = np.arctan2(dy, dx)
            r0, r1 = np.percentile(r, 3), np.percentile(r, 97)
            a0, a1 = np.percentile(a, 2), np.percentile(a, 98)
            cnt = inside = 0
            for yy in range(int(cy - r1) - 1, int(cy) + 1):
                for xx in range(int(cx - r1) - 1, int(cx + r1) + 2):
                    rr = math.hypot(xx + 0.5 - cx, yy + 0.5 - cy)
                    aa = math.atan2(yy + 0.5 - cy, xx + 0.5 - cx)
                    if r0 <= rr <= r1 and a0 <= aa <= a1:
                        cnt += 1
                        inside += (xx, yy) in pset
            if cnt == 0:
                continue
            score = (inside / cnt) * (inside / len(P))
            if best is None or score > best[0]:
                best = (score, cx, cy, r0, r1, a0, a1)
    _, cx, cy, r0, r1, a0, a1 = best
    return {"cx": float(cx), "cy": float(cy), "r0": round(float(r0), 2), "r1": round(float(r1), 2), "a0": round(float(a0), 4), "a1": round(float(a1), 4)}


def horizontal_mask(paper, cell_a, cell_rgb, region, face, H, W, frame=H_FRAME, shape=None):
    """横排书写物（扇面、告示）：从米白区域出发连通填充，最多向外扩 frame 格（边框、扇骨、卷轴两头的木轴和金头）"""
    fx, fy, fw, fh = face
    comp = np.zeros((H, W), dtype=bool)
    for yy, xx in largest_component(paper):
        comp[yy, xx] = True
    ys, xs = np.nonzero(comp)
    y0, y1 = max(0, ys.min() - frame), min(H - 1, ys.max() + frame)
    x0, x1 = max(0, xs.min() - frame), min(W - 1, xs.max() + frame)
    py0, py1, px0, px1 = ys.min(), ys.max(), xs.min(), xs.max()

    def inside(yy, xx):
        if not (y0 <= yy <= y1 and x0 <= xx <= x1):
            return False
        # 卷轴（告示）：只有两头的木轴、金头伸出纸面上下，中间只有一两格边框（再往外是衣领、胡子）
        if shape == "scroll" and not (py0 - 2 <= yy <= py1 + 2):
            return xx <= px0 + frame or xx >= px1 - frame
        return True

    mask = comp.copy()
    stack = list(zip(*np.nonzero(comp)))
    while stack:
        yy, xx = stack.pop()
        for ny, nx in ((yy - 1, xx), (yy + 1, xx), (yy, xx - 1), (yy, xx + 1)):
            if inside(ny, nx) and not mask[ny, nx] and cell_a[ny, nx] and not region[ny, nx] and not is_skin(cell_rgb[ny, nx]):
                mask[ny, nx] = True
                stack.append((ny, nx))
    return mask


def vertical_mask(cell_a, cell_rgb, region, face, H, W, side=None):
    """竖幡：上下木轴、红框、米白幡面、旗杆上半段"""
    fx, fy, fw, fh = face
    # 整面幡：上下木轴、红框、米白幡面、旗杆上半段。
    # 1) 左右范围：上下木轴所在的行里，从幡面中心列向两边连续的不透明格（木轴两端有金色端头）
    cx = fx + fw // 2

    def run_from_center(y):
        if not (cell_a[y, cx] and not region[y, cx]):
            return None
        l = r = cx
        while l - 1 >= 0 and cell_a[y, l - 1] and not region[y, l - 1]:
            l -= 1
        while r + 1 < W and cell_a[y, r + 1] and not region[y, r + 1]:
            r += 1
        return l, r

    left, right = fx, fx + fw - 1
    top = fy
    while top > 0 and run_from_center(top - 1):
        top -= 1
        l, r = run_from_center(top)
        left, right = min(left, l), max(right, r)
    y = fy + fh
    rod_bottom = y
    while y < H:
        span = run_from_center(y)
        if span and span[1] - span[0] + 1 >= fw:
            left, right = min(left, span[0]), max(right, span[1])
            rod_bottom = y
        elif y - (fy + fh) >= 6:
            break
        y += 1
    # 2) 旗杆上半段：下木轴往下，直到握杆的手（幡的左右范围内第一次出现皮肤色）
    pole_end = rod_bottom
    for yy in range(rod_bottom + 1, H):
        if any(cell_a[yy, x] and is_skin(cell_rgb[yy, x]) for x in range(left, right + 1)):
            break
        pole_end = yy
    # 3) 从幡面出发做连通填充（不走换色区，限定在手以上、幡的左右范围内），得到幡的形状。
    #    顶上的金色宝珠颜色接近皮肤，所以这里不按皮肤色拦
    # 写字面那几行只算写字面和两边的边框：小和尚的耳朵紧贴木牌，不能算进木牌
    def inside(yy, xx):
        if not (top <= yy <= pole_end and left <= xx <= right):
            return False
        if side is not None and fy <= yy < fy + fh:
            return fx - side <= xx < fx + fw + side
        return True
    mask = np.zeros((H, W), dtype=bool)
    stack = [(fy + fh // 2, cx)]
    mask[fy + fh // 2, cx] = True
    while stack:
        yy, xx = stack.pop()
        for ny, nx in ((yy - 1, xx), (yy + 1, xx), (yy, xx - 1), (yy, xx + 1)):
            if inside(ny, nx) and not mask[ny, nx] and cell_a[ny, nx] and not region[ny, nx]:
                mask[ny, nx] = True
                stack.append((ny, nx))
    return mask


def is_skin(c):
    h, s, v = hsv(c)
    return 0.02 <= h <= 0.11 and 0.25 <= s <= 0.75 and v > 0.55


# ── 6. 预览 ──────────────────────────────────────────

def hex_rgb(h):
    return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))


def render(data, ramps=None):
    """ramps = {"robe": [暗, 中, 亮], "sash": [...]}；None 时画成色键原色"""
    W, H = data["width"], data["height"]
    out = np.zeros((H, W, 4), dtype=np.uint8)
    pal = [hex_rgb(c) for c in data["palette"]]
    alpha = data["alphabet"]
    key = {"robe": ["#8B1A6B", "#D61F9E", "#F25CC4"], "sash": ["#0E7C8C", "#22B8CC", "#7FE3EE"]}
    for y in range(H):
        for x in range(W):
            b, r = data["base"][y][x], data["regions"][y][x]
            if r != ".":
                name, lvl = data["regionCodes"][r]
                out[y, x] = (*hex_rgb((ramps or key)[name][lvl]), 255)
            elif b != ".":
                out[y, x] = (*pal[alpha.index(b)], 255)
    return out


def write_previews(data, preview):
    preview.mkdir(parents=True, exist_ok=True)
    scale = 6
    big = lambda arr, s=scale: Image.fromarray(arr).resize((arr.shape[1] * s, arr.shape[0] * s), Image.NEAREST)

    # 底层 + 区域
    base_only = render(data)
    for y in range(data["height"]):
        for x in range(data["width"]):
            if data["regions"][y][x] != ".":
                base_only[y, x] = 0
    big(base_only).save(preview / "sprite-base.png")
    big(render(data)).save(preview / "sprite-regions.png")

    rules = json.loads((ROOT / "rules/default.json").read_text(encoding="utf-8"))
    ramps = rules.get("pixelRamps")
    if not ramps:
        print("rules/default.json 里还没有 pixelRamps，跳过 outfits.png")
        return
    # 道袍 = 相（D 所生），腰带 = 旺（D）
    gen = {"木": "火", "火": "土", "土": "金", "金": "水", "水": "木"}
    days = ["木", "火", "土", "金", "水"]
    W, H = data["width"], data["height"]
    s = 4
    pad = 8
    label_h = 0
    sheet = Image.new("RGBA", (len(days) * (W * s + pad * 2), H * s + pad * 2 + label_h), (244, 238, 223, 255))
    bad = 0
    for i, d in enumerate(days):
        hexes = lambda e: [lvl["hex"] for lvl in ramps[e]]
        arr = render(data, {"robe": hexes(gen[d]), "sash": hexes(d)})
        for y in range(H):
            for x in range(W):
                if arr[y, x, 3] and data["regions"][y][x] == ".":
                    if classify_region(arr[y, x, :3]):
                        bad += 1
        sheet.alpha_composite(big(arr, s), (i * (W * s + pad * 2) + pad, pad))
    sheet.save(preview / "outfits.png")
    print(f"→ {(preview / 'outfits.png').relative_to(ROOT)}（底层里残留洋红 / 青色 {bad} 格）")
    if bad:
        sys.exit(1)


def main():
    ids = sys.argv[1:] or sorted(p.name for p in CHAR_DIR.iterdir() if (p / "key.png").exists())
    for cid in ids:
        process(cid)


if __name__ == "__main__":
    main()
