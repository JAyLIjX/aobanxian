use std::{
    sync::{Arc, Mutex},
    thread,
    time::Duration,
};

use serde::Deserialize;
use tauri::{AppHandle, LogicalPosition, LogicalSize, Manager, Runtime, State, WebviewWindow};
use tauri_plugin_autostart::MacosLauncher;

const MAIN_WINDOW: &str = "main";
/// 点穿检测的轮询间隔
const HIT_POLL: Duration = Duration::from_millis(30);

/// 精灵图的不透明格（窗口内逻辑像素坐标）。rows 每行一个字符串，'1' 表示该格不透明
#[derive(Deserialize, Clone)]
struct HitMask {
    x: f64,
    y: f64,
    cell: f64,
    rows: Vec<String>,
}

/// 窗口里能接收鼠标的区域：精灵图的不透明像素 + 卷轴、弹窗、气泡等矩形
#[derive(Deserialize, Clone, Default)]
struct HitRegions {
    /// 为 true 时整个窗口都接收鼠标（比如正在拖动）
    #[serde(default)]
    all: bool,
    #[serde(default)]
    rects: Vec<[f64; 4]>,
    #[serde(default)]
    masks: Vec<HitMask>,
}

impl HitRegions {
    fn hit(&self, x: f64, y: f64) -> bool {
        if self.all {
            return true;
        }
        if self
            .rects
            .iter()
            .any(|[rx, ry, rw, rh]| x >= *rx && y >= *ry && x < rx + rw && y < ry + rh)
        {
            return true;
        }
        self.masks.iter().any(|m| {
            if x < m.x || y < m.y {
                return false;
            }
            let cx = ((x - m.x) / m.cell) as usize;
            let cy = ((y - m.y) / m.cell) as usize;
            m.rows
                .get(cy)
                .and_then(|row| row.as_bytes().get(cx))
                .is_some_and(|b| *b == b'1')
        })
    }
}

#[derive(Default)]
struct HitState(Mutex<Option<Arc<HitRegions>>>);

#[tauri::command]
fn set_hit_regions(state: State<HitState>, regions: HitRegions) {
    *state.0.lock().unwrap() = Some(Arc::new(regions));
}

/// 一次设好窗口的位置和大小（逻辑像素），减少分两次调用时的跳动
#[tauri::command]
fn set_window_rect<R: Runtime>(window: WebviewWindow<R>, x: f64, y: f64, w: f64, h: f64) -> Result<(), String> {
    window
        .set_size(LogicalSize::new(w, h))
        .and_then(|_| window.set_position(LogicalPosition::new(x, y)))
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn quit_app<R: Runtime>(app: AppHandle<R>) {
    app.exit(0);
}

/// 透明点穿：光标不在可点击区域时让窗口忽略鼠标，点击直接落到桌面或下面的窗口。
/// 只用跨平台接口（cursor_position + set_ignore_cursor_events），macOS 和 Windows 一致。
fn spawn_click_through<R: Runtime>(app: AppHandle<R>) {
    thread::spawn(move || {
        let mut ignoring: Option<bool> = None;
        loop {
            thread::sleep(HIT_POLL);
            let Some(window) = app.get_webview_window(MAIN_WINDOW) else {
                continue;
            };
            let regions = app.state::<HitState>().0.lock().unwrap().clone();
            // 前端还没报告可点击区域时，整窗都接收鼠标
            let Some(regions) = regions else { continue };
            let hit = match (app.cursor_position(), window.outer_position(), window.scale_factor()) {
                (Ok(cursor), Ok(pos), Ok(scale)) => {
                    let x = (cursor.x - pos.x as f64) / scale;
                    let y = (cursor.y - pos.y as f64) / scale;
                    regions.hit(x, y)
                }
                _ => true,
            };
            let ignore = !hit;
            if ignoring != Some(ignore) && window.set_ignore_cursor_events(ignore).is_ok() {
                ignoring = Some(ignore);
            }
        }
    });
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_autostart::init(MacosLauncher::LaunchAgent, None))
        .plugin(tauri_plugin_opener::init())
        .manage(HitState::default())
        .invoke_handler(tauri::generate_handler![set_hit_regions, set_window_rect, quit_app])
        .setup(|app| {
            // macOS 不在 Dock 显示（Windows 由窗口配置里的 skipTaskbar 处理）
            #[cfg(target_os = "macos")]
            app.set_activation_policy(tauri::ActivationPolicy::Accessory);

            // 配置里的 alwaysOnBottom 在 macOS 上创建窗口时不一定生效，启动后再显式设一次；
            // 之后的置顶 / 置底由前端按设置切换
            if let Some(window) = app.get_webview_window(MAIN_WINDOW) {
                let _ = window.set_always_on_top(false);
                let _ = window.set_always_on_bottom(true);
            }

            spawn_click_through(app.handle().clone());
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("启动奥半仙失败");
}
