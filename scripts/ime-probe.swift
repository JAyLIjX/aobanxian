// 输入法组字自测（macOS）：npm run dev 后
//   swiftc -O scripts/ime-probe.swift -o /tmp/ime-probe && /tmp/ime-probe 'http://localhost:1420/?view=settings'
// 不抢焦点、看不见（透明、点穿、在普通窗口下面），不碰正式版的数据（非持久存储）。
// 屏幕外的 WKWebView（不激活、不成为前台窗口），按拼音输入法的调用顺序调 NSTextInputClient：
// 组字时 setMarkedText（拼音字母），选字后 insertText（汉字）。
import AppKit
import WebKit

let url = URL(string: CommandLine.arguments[1])!
let app = NSApplication.shared
app.setActivationPolicy(.prohibited)

// 只「自称」是键盘焦点窗口（WebKit 据此认为页面聚焦），并不真的抢走用户的键盘
final class FakeKeyWindow: NSWindow {
  override var isKeyWindow: Bool { true }
  override var canBecomeKey: Bool { true }
}

final class Probe: NSObject, WKNavigationDelegate {
  let web: WKWebView
  let win: NSWindow
  var log: [String] = []
  init(url: URL) {
    let conf = WKWebViewConfiguration()
    conf.websiteDataStore = .nonPersistent()
    web = WKWebView(frame: NSRect(x: 0, y: 0, width: 520, height: 640), configuration: conf)
    win = FakeKeyWindow(contentRect: NSRect(x: 40, y: 40, width: 520, height: 640), styleMask: [.borderless], backing: .buffered, defer: false)
    super.init()
    win.contentView = web
    // 完全透明、鼠标点穿、放在最底层：用户看不见也点不到
    win.alphaValue = 0
    win.ignoresMouseEvents = true
    win.level = NSWindow.Level(rawValue: NSWindow.Level.normal.rawValue - 1)
    win.orderBack(nil)
    web.navigationDelegate = self
    web.load(URLRequest(url: url))
  }
  func js(_ s: String) async -> String {
    let r = try? await web.evaluateJavaScript(s)
    return "\(r ?? "nil")"
  }
  func state() async -> String {
    await js("""
    (() => { const i = document.querySelector('.text-field input'); const c = document.querySelector('.text-field__count');
      const e = document.querySelector('.text-field__error');
      return JSON.stringify({ value: i.value, count: c && c.textContent, invalid: i.getAttribute('aria-invalid'), error: e && e.textContent, log: window.__ev.splice(0) }); })()
    """)
  }
  func client() -> AnyObject { web as AnyObject }
  func marked(_ s: String) async {
    client().setMarkedText!(s, selectedRange: NSRange(location: s.utf16.count, length: 0), replacementRange: NSRange(location: NSNotFound, length: 0))
    try? await Task.sleep(nanoseconds: 60_000_000)
  }
  func commit(_ s: String) async {
    client().insertText!(s, replacementRange: NSRange(location: NSNotFound, length: 0))
    try? await Task.sleep(nanoseconds: 120_000_000)
  }
  func typePinyin(_ steps: [String], _ hanzi: String) async {
    for s in steps {
      await marked(s)
      print("  组字 \(s) → \(await state())")
    }
    await commit(hanzi)
    print("  上屏 \(hanzi) → \(await state())")
  }
  func run() async {
    try? await Task.sleep(nanoseconds: 2_500_000_000)
    // 去「外观」页，找到幡上文字的输入框
    _ = await js("""
    window.__ev = [];
    [...document.querySelectorAll('button')].find(b => /外观|外觀|Appearance/.test(b.textContent))?.click(); 'ok'
    """)
    try? await Task.sleep(nanoseconds: 500_000_000)
    _ = await js("""
    const i = document.querySelector('.text-field input');
    for (const t of ['compositionstart','compositionupdate','compositionend','input']) i.addEventListener(t, e => window.__ev.push(t + (e.isComposing ? '*' : '') + (e.data != null ? ':' + e.data : '')));
    'ok'
    """)
    win.makeFirstResponder(web)
    NotificationCenter.default.post(name: NSWindow.didBecomeKeyNotification, object: win)
    try? await Task.sleep(nanoseconds: 300_000_000)
    print("初始 → \(await state())")
    _ = await js("document.querySelector('.text-field input').focus(); 'ok'")
    print("焦点 → \(await js("JSON.stringify({has: document.hasFocus(), active: document.activeElement && document.activeElement.tagName, vis: document.visibilityState})"))")
    print("isKey \(win.isKeyWindow) visible \(win.isVisible) fr \(String(describing: win.firstResponder))")
    for (label, words) in [("奥半仙", [(["a", "ao"], "奥"), (["b", "ba", "ban"], "半"), (["x", "xi", "xia", "xian"], "仙")]),
                           ("一口气打「aobanxian」", [(["a", "ao", "aob", "aoba", "aoban", "aobanx", "aobanxi", "aobanxia", "aobanxian"], "奥半仙")]),
                           ("宜红宜黄", [(["y", "yi"], "宜"), (["h", "ho", "hon", "hong"], "红"), (["y", "yi"], "宜"), (["h", "hu", "hua", "huan", "huang"], "黄")])] {
      print("\n=== \(label) ===")
      // 聚焦并清空（模拟全选后删除）
      _ = await js("document.querySelector('.text-field input').focus(); 'ok'")
      web.doCommand(by: #selector(NSResponder.selectAll(_:)))
      web.doCommand(by: #selector(NSResponder.deleteBackward(_:)))
      try? await Task.sleep(nanoseconds: 120_000_000)
      print("清空 → \(await state())")
      for (steps, hz) in words { await typePinyin(steps, hz) }
    }
    print("\n=== 超出：在「宜红宜黄」后再打「lv」→「绿」===")
    await typePinyin(["l", "lv"], "绿")
    print("\n=== 失去焦点 ===")
    _ = await js("document.querySelector('.text-field input').blur(); 'ok'")
    try? await Task.sleep(nanoseconds: 200_000_000)
    print("失焦 → \(await state())")
    print("保存的值 → \(await js("localStorage.getItem('aobanxian.settings') || JSON.stringify(Object.fromEntries(Object.entries(localStorage)))"))")
    exit(0)
  }
}

let probe = Probe(url: url)
Task { @MainActor in await probe.run() }
app.run()
