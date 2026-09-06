use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::OnceLock;

// Base directory of the installed app's resources. Set once at startup (from the
// AppHandle) so resolve_binary can find bundled engines shipped via bundle.resources
// (src-tauri/binaries/* -> $RESOURCE/binaries/) without needing an AppHandle.
static RESOURCE_DIR: OnceLock<PathBuf> = OnceLock::new();

pub fn init_resource_dir(dir: PathBuf) {
    let _ = RESOURCE_DIR.set(dir);
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct EngineStatus {
    #[serde(rename = "ffmpegAvailable")]
    pub ffmpeg_available: bool,
    #[serde(rename = "ffmpegVersion")]
    pub ffmpeg_version: String,
    #[serde(rename = "ffmpegPath")]
    pub ffmpeg_path: String,
    #[serde(rename = "ytdlpAvailable")]
    pub ytdlp_available: bool,
    #[serde(rename = "ytdlpVersion")]
    pub ytdlp_version: String,
    #[serde(rename = "ytdlpPath")]
    pub ytdlp_path: String,
    #[serde(rename = "runtimeDir")]
    pub runtime_dir: String,
    #[serde(rename = "downloadsDir")]
    pub downloads_dir: String,
    #[serde(rename = "exportsDir")]
    pub exports_dir: String,
}

pub fn get_app_runtime_dir() -> PathBuf {
    if let Ok(local_app_data) = std::env::var("LOCALAPPDATA") {
        PathBuf::from(local_app_data)
            .join("com.filmov.app")
            .join("binaries")
    } else if let Ok(home) = std::env::var("USERPROFILE").or_else(|_| std::env::var("HOME")) {
        PathBuf::from(home).join(".filmov").join("binaries")
    } else {
        std::env::temp_dir().join("filmov").join("binaries")
    }
}

pub fn get_secure_media_dir(subfolder: &str) -> PathBuf {
    let base = if let Ok(userprofile) = std::env::var("USERPROFILE") {
        PathBuf::from(userprofile).join("Videos").join("Filmov")
    } else if let Ok(home) = std::env::var("HOME") {
        PathBuf::from(home).join("Movies").join("Filmov")
    } else {
        std::env::temp_dir().join("Filmov")
    };

    let dir = base.join(subfolder);
    let _ = std::fs::create_dir_all(&dir);
    dir
}

pub fn resolve_binary(binary_name: &str) -> Option<(PathBuf, String)> {
    let ext = if cfg!(windows) { ".exe" } else { "" };
    let filename = format!("{}{}", binary_name, ext);

    // 1. Check App Runtime Directory
    let runtime_dir = get_app_runtime_dir();
    let runtime_bin = runtime_dir.join(&filename);
    if runtime_bin.exists() {
        if let Ok(ver) = get_binary_version(&runtime_bin, binary_name) {
            return Some((runtime_bin, ver));
        }
    }

    // 1b. Check bundled resource directory (packaged app: $RESOURCE/binaries)
    if let Some(res) = RESOURCE_DIR.get() {
        let bundled_bin = res.join("binaries").join(&filename);
        if bundled_bin.exists() {
            if let Ok(ver) = get_binary_version(&bundled_bin, binary_name) {
                return Some((bundled_bin, ver));
            }
        }
    }

    // 2. Check local project binaries directory
    let local_bin = PathBuf::from("binaries").join(&filename);
    if local_bin.exists() {
        if let Ok(ver) = get_binary_version(&local_bin, binary_name) {
            return Some((local_bin, ver));
        }
    }

    let src_tauri_bin = PathBuf::from("src-tauri").join("binaries").join(&filename);
    if src_tauri_bin.exists() {
        if let Ok(ver) = get_binary_version(&src_tauri_bin, binary_name) {
            return Some((src_tauri_bin, ver));
        }
    }

    // 3. Check WinGet Links and Packages Directories
    if let Some(winget_bin) = find_in_winget(binary_name) {
        if let Ok(ver) = get_binary_version(&winget_bin, binary_name) {
            return Some((winget_bin, ver));
        }
    }

    // 4. Check System PATH
    if let Ok(output) = Command::new(binary_name).arg("--version").output() {
        if output.status.success() {
            let ver = String::from_utf8_lossy(&output.stdout)
                .lines()
                .next()
                .unwrap_or("Installed")
                .to_string();
            return Some((PathBuf::from(binary_name), ver));
        }
    }

    None
}

fn find_in_winget(binary_name: &str) -> Option<PathBuf> {
    let ext = if cfg!(windows) { ".exe" } else { "" };
    let filename = format!("{}{}", binary_name, ext);

    if let Ok(local_appdata) = std::env::var("LOCALAPPDATA") {
        let winget_links = PathBuf::from(&local_appdata)
            .join("Microsoft")
            .join("WinGet")
            .join("Links")
            .join(&filename);
        if winget_links.exists() {
            return Some(winget_links);
        }

        let winget_packages = PathBuf::from(&local_appdata)
            .join("Microsoft")
            .join("WinGet")
            .join("Packages");
        if winget_packages.exists() {
            if let Ok(entries) = std::fs::read_dir(&winget_packages) {
                for entry in entries.flatten() {
                    let p = entry.path();
                    if p.is_dir() {
                        let direct = p.join(&filename);
                        if direct.exists() {
                            return Some(direct);
                        }
                        let in_bin = p.join("bin").join(&filename);
                        if in_bin.exists() {
                            return Some(in_bin);
                        }
                        // Deep search 1 level further (e.g. Gyan.FFmpeg_.../ffmpeg-x/bin/ffmpeg.exe)
                        if let Ok(sub_entries) = std::fs::read_dir(&p) {
                            for sub_entry in sub_entries.flatten() {
                                let sp = sub_entry.path();
                                if sp.is_dir() {
                                    let sub_direct = sp.join(&filename);
                                    if sub_direct.exists() {
                                        return Some(sub_direct);
                                    }
                                    let sub_bin = sp.join("bin").join(&filename);
                                    if sub_bin.exists() {
                                        return Some(sub_bin);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    None
}

fn get_binary_version(path: &Path, _name: &str) -> Result<String, ()> {
    let output = Command::new(path)
        .arg("--version")
        .output()
        .map_err(|_| ())?;
    if output.status.success() {
        let first_line = String::from_utf8_lossy(&output.stdout)
            .lines()
            .next()
            .unwrap_or("Available")
            .to_string();
        Ok(first_line)
    } else {
        Err(())
    }
}

fn ps_quote(s: &str) -> String {
    s.replace('\'', "''")
}

#[cfg(target_os = "windows")]
fn download_url(url: &str, dest: &std::path::Path) -> bool {
    let script = format!(
        "Invoke-WebRequest -Uri '{}' -OutFile '{}' -UseBasicParsing",
        ps_quote(url),
        ps_quote(&dest.to_string_lossy())
    );
    Command::new("powershell")
        .args(&["-NoProfile", "-NonInteractive", "-Command", &script])
        .status()
        .map(|s| s.success())
        .unwrap_or(false)
}

#[cfg(not(target_os = "windows"))]
fn download_url(url: &str, dest: &std::path::Path) -> bool {
    Command::new("curl")
        .args(&["-L", "-o", &dest.to_string_lossy().to_string(), url])
        .status()
        .map(|s| s.success())
        .unwrap_or(false)
}

#[cfg(target_os = "windows")]
fn extract_zip(zip: &std::path::Path, dest: &std::path::Path) -> bool {
    let script = format!(
        "Expand-Archive -Path '{}' -DestinationPath '{}' -Force",
        ps_quote(&zip.to_string_lossy()),
        ps_quote(&dest.to_string_lossy())
    );
    Command::new("powershell")
        .args(&["-NoProfile", "-NonInteractive", "-Command", &script])
        .status()
        .map(|s| s.success())
        .unwrap_or(false)
}

// Copy a binary found anywhere under `root` (e.g. inside an extracted zip) into
// the runtime directory.
#[cfg(target_os = "windows")]
fn find_and_promote_bin(root: &std::path::Path, name: &str, runtime: &std::path::Path) -> bool {
    let mut stack = vec![root.to_path_buf()];
    while let Some(dir) = stack.pop() {
        if let Ok(entries) = std::fs::read_dir(&dir) {
            for entry in entries.flatten() {
                let p = entry.path();
                if p.is_dir() {
                    stack.push(p);
                } else if p
                    .file_name()
                    .map(|f| f.eq_ignore_ascii_case(name))
                    .unwrap_or(false)
                {
                    let dest = runtime.join(p.file_name().unwrap());
                    return std::fs::copy(&p, &dest).is_ok();
                }
            }
        }
    }
    false
}

#[derive(serde::Serialize, Clone)]
pub struct InstallResult {
    #[serde(rename = "ffmpegInstalled")]
    pub ffmpeg_installed: bool,
    #[serde(rename = "ffmpegVersion")]
    pub ffmpeg_version: String,
    #[serde(rename = "ytdlpInstalled")]
    pub ytdlp_installed: bool,
    #[serde(rename = "ytdlpVersion")]
    pub ytdlp_version: String,
    #[serde(rename = "message")]
    pub message: String,
}

#[tauri::command]
pub fn install_engines() -> InstallResult {
    let runtime_dir = get_app_runtime_dir();
    let _ = std::fs::create_dir_all(&runtime_dir);
    let mut messages = Vec::new();

    // --- yt-dlp ----------------------------------------------------------
    if resolve_binary("yt-dlp").is_none() {
        let exe = if cfg!(windows) {
            "yt-dlp.exe"
        } else {
            "yt-dlp"
        };
        let dest = runtime_dir.join(exe);
        let ok = download_url(
            "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe",
            &dest,
        );
        if ok {
            messages.push("yt-dlp diunduh".to_string());
        } else {
            messages.push("gagal mengunduh yt-dlp".to_string());
        }
    } else {
        messages.push("yt-dlp sudah tersedia".to_string());
    }

    // --- ffmpeg (Windows static build) ------------------------------------
    #[cfg(target_os = "windows")]
    if resolve_binary("ffmpeg").is_none() {
        let zip_path = runtime_dir.join("ffmpeg-release-essentials.zip");
        let extract_dir = runtime_dir.join("ffmpeg-extract");
        let downloaded = download_url(
            "https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip",
            &zip_path,
        );
        if downloaded {
            let _ = std::fs::create_dir_all(&extract_dir);
            if extract_zip(&zip_path, &extract_dir) {
                let _ = find_and_promote_bin(&extract_dir, "ffmpeg.exe", &runtime_dir);
                let _ = find_and_promote_bin(&extract_dir, "ffprobe.exe", &runtime_dir);
                messages.push("ffmpeg diunduh & diekstrak".to_string());
            } else {
                messages.push("gagal mengekstrak ffmpeg".to_string());
            }
            let _ = std::fs::remove_file(&zip_path);
        } else {
            messages.push("gagal mengunduh ffmpeg".to_string());
        }
    } else {
        messages.push("ffmpeg sudah tersedia".to_string());
    }

    let ffmpeg = resolve_binary("ffmpeg");
    let ytdlp = resolve_binary("yt-dlp");
    InstallResult {
        ffmpeg_installed: ffmpeg.is_some(),
        ffmpeg_version: ffmpeg.as_ref().map(|(_, v)| v.clone()).unwrap_or_default(),
        ytdlp_installed: ytdlp.is_some(),
        ytdlp_version: ytdlp.as_ref().map(|(_, v)| v.clone()).unwrap_or_default(),
        message: messages.join("; "),
    }
}

#[tauri::command]
pub fn check_engine_status() -> EngineStatus {
    let runtime_dir = get_app_runtime_dir();
    let _ = std::fs::create_dir_all(&runtime_dir);

    let downloads_dir = get_secure_media_dir("Downloads");
    let exports_dir = get_secure_media_dir("Exports");

    let ffmpeg_info = resolve_binary("ffmpeg");
    let ytdlp_info = resolve_binary("yt-dlp");

    EngineStatus {
        ffmpeg_available: ffmpeg_info.is_some(),
        ffmpeg_version: ffmpeg_info
            .as_ref()
            .map(|(_, v)| v.clone())
            .unwrap_or_else(|| "Not Found in PATH/Binaries".to_string()),
        ffmpeg_path: ffmpeg_info
            .as_ref()
            .map(|(p, _)| p.to_string_lossy().to_string())
            .unwrap_or_default(),
        ytdlp_available: ytdlp_info.is_some(),
        ytdlp_version: ytdlp_info
            .as_ref()
            .map(|(_, v)| v.clone())
            .unwrap_or_else(|| "Not Found in PATH/Binaries".to_string()),
        ytdlp_path: ytdlp_info
            .as_ref()
            .map(|(p, _)| p.to_string_lossy().to_string())
            .unwrap_or_default(),
        runtime_dir: runtime_dir.to_string_lossy().to_string(),
        downloads_dir: downloads_dir.to_string_lossy().to_string(),
        exports_dir: exports_dir.to_string_lossy().to_string(),
    }
}
