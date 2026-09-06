use std::process::Command;

fn get_allowed_project_bases() -> Vec<std::path::PathBuf> {
    // Standard per-user content directories. Notably excludes AppData (Startup
    // folder), system dirs, and drive roots to stop arbitrary-file writes from a
    // crafted project file.
    let user = std::env::var("USERPROFILE").ok();
    let home = std::env::var("HOME").ok();
    let mut bases: Vec<std::path::PathBuf> = Vec::new();
    for dir in [
        "Videos",
        "Downloads",
        "Documents",
        "Desktop",
        "Music",
        "Pictures",
    ] {
        if let Some(u) = &user {
            bases.push(std::path::PathBuf::from(u).join(dir));
        }
    }
    for dir in [
        "Movies",
        "Downloads",
        "Documents",
        "Desktop",
        "Music",
        "Pictures",
    ] {
        if let Some(h) = &home {
            bases.push(std::path::PathBuf::from(h).join(dir));
        }
    }
    bases.push(std::env::temp_dir());
    bases
}

fn validate_project_path(path: &str) -> Result<std::path::PathBuf, String> {
    let p = std::path::PathBuf::from(path);
    if p.file_name().map(|n| n.is_empty()).unwrap_or(true) {
        return Err("Invalid path: missing filename".to_string());
    }
    // Canonicalize the nearest existing ancestor so the check also works for a
    // not-yet-written destination file.
    let mut probe = p.clone();
    while !probe.exists() {
        if !probe.pop() {
            return Err("Invalid path".to_string());
        }
    }
    let canonical = std::fs::canonicalize(&probe).map_err(|e| format!("Invalid path: {}", e))?;
    let allowed_bases = get_allowed_project_bases();
    if !allowed_bases.iter().any(|base| canonical.starts_with(base)) {
        return Err(
            "Path traversal detected: project files must be saved inside Filmov directories"
                .to_string(),
        );
    }
    Ok(p)
}

#[tauri::command]
pub async fn save_project_file(path: String, content: String) -> Result<String, String> {
    let safe_path = validate_project_path(&path)?;
    if let Some(parent) = safe_path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    std::fs::write(&safe_path, &content)
        .map_err(|e| format!("Failed to save project file: {}", e))?;
    Ok(safe_path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn load_project_file(path: String) -> Result<String, String> {
    let safe_path = validate_project_path(&path)?;
    std::fs::read_to_string(&safe_path).map_err(|e| format!("Failed to read project file: {}", e))
}

#[tauri::command]
pub async fn reveal_in_folder(path: String) -> Result<(), String> {
    let _ = validate_project_path(&path)?;
    let p = std::path::Path::new(&path);
    if !p.exists() {
        // If file doesn't exist, try opening parent directory
        if let Some(parent) = p.parent() {
            if parent.exists() {
                #[cfg(target_os = "windows")]
                {
                    let _ = Command::new("explorer")
                        .arg(parent.to_string_lossy().to_string())
                        .spawn();
                    return Ok(());
                }
            }
        }
        return Err(format!("File or folder does not exist: {}", path));
    }

    #[cfg(target_os = "windows")]
    {
        // /select,path highlights the specific file in Windows Explorer
        let _ = Command::new("explorer")
            .arg(format!("/select,\"{}\"", path))
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    #[cfg(target_os = "macos")]
    {
        let _ = Command::new("open")
            .args(&["-R", &path])
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    #[cfg(target_os = "linux")]
    {
        let dir = if p.is_dir() {
            p
        } else {
            p.parent().unwrap_or(p)
        };
        let _ = Command::new("xdg-open")
            .arg(dir)
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    Ok(())
}
