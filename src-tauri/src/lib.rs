use tauri::{
    menu::{CheckMenuItem, Menu, MenuItem, PredefinedMenuItem},
    tray::TrayIconBuilder,
    App, AppHandle, Manager, Runtime, WebviewWindow,
};
use tauri_plugin_autostart::{MacosLauncher, ManagerExt};
use tauri_plugin_window_state::{AppHandleExt, StateFlags};

const MAIN_WINDOW: &str = "main";

fn main_window<R: Runtime>(app: &AppHandle<R>) -> Option<WebviewWindow<R>> {
    app.get_webview_window(MAIN_WINDOW)
}

/// 窗口层级：置顶，或像桌面小组件一样置底。两者互斥，先取消一个再设另一个。
fn set_on_top<R: Runtime>(window: &WebviewWindow<R>, on_top: bool) {
    if on_top {
        let _ = window.set_always_on_bottom(false);
        let _ = window.set_always_on_top(true);
    } else {
        let _ = window.set_always_on_top(false);
        let _ = window.set_always_on_bottom(true);
    }
}

fn build_tray(app: &App) -> tauri::Result<()> {
    let handle = app.handle();

    let toggle = MenuItem::with_id(handle, "toggle", "隐藏", true, None::<&str>)?;
    let on_top = CheckMenuItem::with_id(handle, "on_top", "置顶", true, false, None::<&str>)?;
    let autostart_enabled = handle.autolaunch().is_enabled().unwrap_or(false);
    let autostart = CheckMenuItem::with_id(
        handle,
        "autostart",
        "开机启动",
        true,
        autostart_enabled,
        None::<&str>,
    )?;
    let quit = MenuItem::with_id(handle, "quit", "退出", true, None::<&str>)?;
    let menu = Menu::with_items(
        handle,
        &[
            &toggle,
            &on_top,
            &autostart,
            &PredefinedMenuItem::separator(handle)?,
            &quit,
        ],
    )?;

    let mut tray = TrayIconBuilder::with_id("main-tray")
        .tooltip("五行小历")
        .menu(&menu)
        .show_menu_on_left_click(true)
        .on_menu_event(move |app, event| match event.id().as_ref() {
            "toggle" => {
                let Some(window) = main_window(app) else { return };
                if window.is_visible().unwrap_or(true) {
                    let _ = window.hide();
                    let _ = toggle.set_text("显示");
                } else {
                    let _ = window.show();
                    // 重新显示后恢复原来的层级
                    set_on_top(&window, on_top.is_checked().unwrap_or(false));
                    let _ = toggle.set_text("隐藏");
                }
            }
            "on_top" => {
                // 勾选框点击后已自动切换，读出来的就是新状态
                if let Some(window) = main_window(app) {
                    set_on_top(&window, on_top.is_checked().unwrap_or(false));
                }
            }
            "autostart" => {
                let launcher = app.autolaunch();
                let want = autostart.is_checked().unwrap_or(false);
                let result = if want { launcher.enable() } else { launcher.disable() };
                if let Err(err) = result {
                    eprintln!("切换开机启动失败：{err}");
                }
                // 以系统里的实际状态为准
                let _ = autostart.set_checked(launcher.is_enabled().unwrap_or(false));
            }
            "quit" => {
                let _ = app.save_window_state(StateFlags::POSITION);
                app.exit(0);
            }
            _ => {}
        });
    if let Some(icon) = app.default_window_icon() {
        tray = tray.icon(icon.clone());
    }
    tray.build(app)?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // 只记住位置；窗口大小由前端按展开状态决定
        .plugin(
            tauri_plugin_window_state::Builder::default()
                .with_state_flags(StateFlags::POSITION)
                .build(),
        )
        .plugin(tauri_plugin_autostart::init(MacosLauncher::LaunchAgent, None))
        .setup(|app| {
            // macOS 不在 Dock 显示（Windows 由窗口配置里的 skipTaskbar 处理）
            #[cfg(target_os = "macos")]
            app.set_activation_policy(tauri::ActivationPolicy::Accessory);

            build_tray(app)?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("启动五行小历失败");
}
