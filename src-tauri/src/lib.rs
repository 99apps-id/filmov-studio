mod commands;

use commands::binary_manager::{check_engine_status, init_resource_dir, install_engines};
use commands::downloader::{
    download_media, fetch_media_info, open_media_folder, save_media_as, save_media_to_path,
};
use commands::hardware::detect_hardware;
use commands::project::{load_project_file, reveal_in_folder, save_project_file};
use commands::video::{
    allow_asset_path, cancel_export, convert_media_to_mp3, export_project, extract_waveform,
    probe_media,
};
use commands::voice::{generate_speech, transcribe_audio};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            use tauri::Manager;

            // Remember where bundled engines live so resolve_binary can find them
            // even when the app is installed (cwd is not the source tree).
            if let Ok(res) = app.path().resource_dir() {
                init_resource_dir(res);
            }

            let icon_bytes = include_bytes!("../icons/128x128.png");
            if let Ok(icon) = tauri::image::Image::from_bytes(icon_bytes) {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.set_icon(icon);
                }
            } else if let Some(icon) = app.default_window_icon() {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.set_icon(icon.clone());
                }
            }

            // Least-privilege scope: only the app's own media tree is granted at
            // startup. Any other file a user imports is granted individually by the
            // `allow_asset_path` command right before it is rendered (see video.rs),
            // so no blanket drive/home allowance is needed here.
            let scopes = app.state::<tauri::Scopes>();
            if let Ok(home) = app.path().home_dir() {
                // Create the managed media folders on the very first launch and grant
                // the asset-protocol scope even when they were just created, so
                // downloaded/exported media is playable immediately.
                let media_root = home.join("Videos").join("Filmov");
                for sub in ["Downloads", "Exports"] {
                    let _ = std::fs::create_dir_all(media_root.join(sub));
                }
                for dir_name in ["Videos", "Downloads", "Documents", "Desktop"] {
                    let dir = home.join(dir_name).join("Filmov");
                    let _ = scopes.allow_directory(&dir, true);
                }
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            detect_hardware,
            fetch_media_info,
            download_media,
            open_media_folder,
            save_media_to_path,
            save_media_as,
            probe_media,
            extract_waveform,
            convert_media_to_mp3,
            export_project,
            cancel_export,
            save_project_file,
            load_project_file,
            reveal_in_folder,
            transcribe_audio,
            generate_speech,
            check_engine_status,
            install_engines,
            allow_asset_path
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
