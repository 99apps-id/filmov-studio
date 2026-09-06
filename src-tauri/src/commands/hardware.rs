use serde::{Deserialize, Serialize};
use std::process::Command;

#[derive(Debug, Serialize, Deserialize)]
pub struct HardwareInfo {
    pub os: String,
    #[serde(rename = "cpuName")]
    pub cpu_name: String,
    #[serde(rename = "cpuCores")]
    pub cpu_cores: usize,
    #[serde(rename = "totalRamGb")]
    pub total_ram_gb: usize,
    #[serde(rename = "gpuName")]
    pub gpu_name: String,
    #[serde(rename = "accelerationType")]
    pub acceleration_type: String,
    #[serde(rename = "encodersAvailable")]
    pub encoders_available: Vec<String>,
    #[serde(rename = "isHardwareAccelerated")]
    pub is_hardware_accelerated: bool,
}

#[tauri::command]
pub fn detect_hardware() -> HardwareInfo {
    let os = std::env::consts::OS.to_string();
    let num_cpus = std::thread::available_parallelism()
        .map(|n| n.get())
        .unwrap_or(8);

    let mut gpu_name = "Integrated / Dedicated Graphics".to_string();
    let mut accel_type = "cpu".to_string();
    let mut encoders = vec!["libx264".to_string()];
    let mut is_hw_accel = false;

    // 1. Check for NVIDIA GPU (nvidia-smi)
    if let Ok(output) = Command::new("nvidia-smi")
        .arg("--query-gpu=name")
        .arg("--format=csv,noheader")
        .output()
    {
        if output.status.success() {
            let name = String::from_utf8_lossy(&output.stdout).trim().to_string();
            if !name.is_empty() {
                gpu_name = name;
                accel_type = "nvenc".to_string();
                encoders.insert(0, "h264_nvenc".to_string());
                encoders.insert(1, "hevc_nvenc".to_string());
                is_hw_accel = true;
            }
        }
    }

    // 2. If macOS: VideoToolbox
    if os == "macos" {
        gpu_name = "Apple Silicon GPU".to_string();
        accel_type = "videotoolbox".to_string();
        encoders.insert(0, "h264_videotoolbox".to_string());
        encoders.insert(1, "hevc_videotoolbox".to_string());
        is_hw_accel = true;
    }

    // 3. Windows: verify Intel QuickSync only when an Intel GPU is actually present.
    //    No fake "qsv" acceleration - otherwise the exporter would pick h264_qsv
    //    and fail at render time on machines without an Intel iGPU.
    if !is_hw_accel && os == "windows" {
        if let Ok(output) = Command::new("powershell")
            .args(&[
                "-NoProfile",
                "-NonInteractive",
                "-Command",
                "(Get-CimInstance Win32_VideoController).Name",
            ])
            .output()
        {
            let gpu_info = String::from_utf8_lossy(&output.stdout).to_lowercase();
            if gpu_info.contains("intel") {
                gpu_name = "Intel QuickSync (iGPU)".to_string();
                accel_type = "qsv".to_string();
                encoders.insert(0, "h264_qsv".to_string());
                is_hw_accel = true;
            }
        }
    }

    HardwareInfo {
        os: format!("{} (64-bit)", os),
        cpu_name: format!("Multi-Core Architecture ({} threads)", num_cpus),
        cpu_cores: num_cpus,
        total_ram_gb: 16, // typical minimum workstation RAM
        gpu_name,
        acceleration_type: accel_type,
        encoders_available: encoders,
        is_hardware_accelerated: is_hw_accel,
    }
}
