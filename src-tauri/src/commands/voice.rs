use super::binary_manager::get_secure_media_dir;
use super::binary_manager::resolve_binary;
use super::video::probe_media;
use serde::{Deserialize, Serialize};
use std::process::Command;

#[derive(Debug, Serialize, Deserialize)]
pub struct SubtitleSegment {
    pub text: String,
    pub start: f64,
    pub duration: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GeneratedSpeechResult {
    #[serde(rename = "filePath")]
    pub file_path: String,
    pub duration: f64,
}

fn parse_srt(content: &str) -> Vec<SubtitleSegment> {
    let mut segments = Vec::new();
    let mut start = 0.0f64;
    let mut end = 0.0f64;
    let mut text_lines: Vec<String> = Vec::new();

    let parse_ts = |s: &str| -> f64 {
        // "00:00:02,500" -> seconds
        let s = s.trim().replace(',', ".");
        let mut parts = s.split(':');
        let h: f64 = parts.next().and_then(|v| v.parse().ok()).unwrap_or(0.0);
        let m: f64 = parts.next().and_then(|v| v.parse().ok()).unwrap_or(0.0);
        let sec: f64 = parts.next().and_then(|v| v.parse().ok()).unwrap_or(0.0);
        h * 3600.0 + m * 60.0 + sec
    };

    for line in content.lines() {
        let line = line.trim();
        if line.is_empty() {
            if !text_lines.is_empty() {
                segments.push(SubtitleSegment {
                    text: text_lines.join(" "),
                    start,
                    duration: (end - start).max(0.1),
                });
                text_lines.clear();
            }
            continue;
        }
        if line.contains("-->") {
            let mut it = line.split("-->");
            start = it.next().map(parse_ts).unwrap_or(0.0);
            end = it.next().map(parse_ts).unwrap_or(0.0);
        } else if line.chars().all(|c| c.is_ascii_digit() || c == ':')
            || line.parse::<i64>().is_ok()
        {
            // subtitle index line, skip
        } else {
            text_lines.push(line.to_string());
        }
    }
    if !text_lines.is_empty() {
        segments.push(SubtitleSegment {
            text: text_lines.join(" "),
            start,
            duration: (end - start).max(0.1),
        });
    }
    segments
}

#[tauri::command]
pub async fn transcribe_audio(
    file_path: String,
    language: String,
) -> Result<Vec<SubtitleSegment>, String> {
    let p = std::path::Path::new(&file_path);
    if !p.exists() {
        return Err(
            "Tidak ada file audio dipilih. Silakan pilih klip audio/video di timeline dulu."
                .to_string(),
        );
    }

    // Look for a Whisper engine binary. No engine is bundled, so we either use an
    // installed one or fail honestly instead of fabricating captions.
    let engine = ["whisper-cli", "whisper", "whisper.exe"]
        .iter()
        .find_map(|name| resolve_binary(name).map(|(path, _)| path));
    let engine = engine.ok_or_else(|| {
        "Whisper transcription engine tidak ditemukan. Install whisper-cli / openai-whisper \
         untuk mengaktifkan Auto Captions."
            .to_string()
    })?;

    let lang = if language.trim().is_empty() {
        "auto".to_string()
    } else {
        language.trim().to_string()
    };

    let out_dir = std::env::temp_dir().join(format!("filmov_transcribe_{}", std::process::id()));
    let _ = std::fs::create_dir_all(&out_dir);
    let base = std::path::Path::new(&file_path)
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("captions");

    // Whisper CLI (openai-whisper style) JSON output; whisper.cpp uses different args,
    // so we accept either and fall through to SRT parsing below.
    let status = Command::new(&engine)
        .args(&[
            &file_path,
            "--language",
            &lang,
            "--output_format",
            "json",
            "--output_dir",
            &out_dir.to_string_lossy().to_string(),
        ])
        .status();

    if let Ok(st) = status {
        if st.success() {
            let json_path = out_dir.join(format!("{}.json", base));
            if let Ok(json) = std::fs::read_to_string(&json_path) {
                let parsed: Result<serde_json::Value, _> = serde_json::from_str(&json);
                if let Ok(v) = parsed {
                    let segs = v["segments"].as_array();
                    if let Some(segs) = segs {
                        let items: Vec<SubtitleSegment> = segs
                            .iter()
                            .map(|s| SubtitleSegment {
                                text: s["text"].as_str().unwrap_or("").trim().to_string(),
                                start: s["start"].as_f64().unwrap_or(0.0),
                                duration: ((s["end"].as_f64().unwrap_or(0.0)
                                    - s["start"].as_f64().unwrap_or(0.0))
                                .max(0.1)),
                            })
                            .filter(|s| !s.text.is_empty())
                            .collect();
                        if !items.is_empty() {
                            let _ = std::fs::remove_dir_all(&out_dir);
                            return Ok(items);
                        }
                    }
                }
            }
            // Fall back to SRT if the engine wrote one.
            let srt_path = out_dir.join(format!("{}.srt", base));
            if let Ok(srt) = std::fs::read_to_string(&srt_path) {
                let items = parse_srt(&srt);
                if !items.is_empty() {
                    let _ = std::fs::remove_dir_all(&out_dir);
                    return Ok(items);
                }
            }
        }
    }

    let _ = std::fs::remove_dir_all(&out_dir);
    Err("Transkripsi gagal: pastikan whisper engine & model terpasang dengan benar.".to_string())
}

#[tauri::command]
pub async fn generate_speech(
    text: String,
    voice: String,
    speed: f32,
) -> Result<GeneratedSpeechResult, String> {
    let clean_text = text.trim();
    if clean_text.is_empty() {
        return Err("Text cannot be empty".to_string());
    }

    let downloads_dir = get_secure_media_dir("Downloads");
    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(0);
    let output_wav = downloads_dir.join(format!("voiceover_{}.wav", timestamp));
    let output_wav_str = output_wav.to_string_lossy().to_string();

    #[cfg(target_os = "windows")]
    {
        // Rate mapping: speed 1.0 -> Rate 0, speed 0.5 -> Rate -5, speed 1.5 -> Rate 4
        let rate: i32 = (((speed - 1.0) * 8.0).clamp(-10.0, 10.0)) as i32;

        // Sanitize text/path for PowerShell double-quoted string context.
        // Only the escape char (backtick) and interpolators ($ and ") can break
        // out of the string; backslash and newlines are literal there, so we must
        // NOT escape them (escaping backslash would corrupt Windows paths).
        // Order matters: escape backticks first so backticks we insert for $
        // and " are not themselves re-escaped.
        let escape_ps =
            |s: &str| -> String { s.replace('`', "``").replace('$', "`$").replace('"', "`\"") };
        let escaped_text = escape_ps(&clean_text);
        let escaped_path = escape_ps(&output_wav_str);

        let is_female = voice.to_lowercase().contains("female")
            || voice.to_lowercase().contains("siti")
            || voice.to_lowercase().contains("gadis")
            || voice.to_lowercase().contains("emily")
            || voice.to_lowercase().contains("zira");

        let is_indo = voice.to_lowercase().starts_with("id")
            || voice.to_lowercase().contains("indo")
            || voice.to_lowercase().contains("bimo")
            || voice.to_lowercase().contains("siti")
            || voice.to_lowercase().contains("gadis")
            || voice.to_lowercase().contains("ardi");

        let voice_script = if is_female {
            r#"
            $idV = if ($isIndoReq) { $synth.GetInstalledVoices() | Where-Object { $_.VoiceInfo.Culture.Name -like 'id*' -and $_.VoiceInfo.Gender -eq 'Female' } | Select-Object -First 1 } else { $null };
            if ($idV) {
                $synth.SelectVoice($idV.VoiceInfo.Name);
            } else {
                $v = $synth.GetInstalledVoices() | Where-Object { $_.VoiceInfo.Gender -eq 'Female' } | Select-Object -First 1;
                if ($v) { $synth.SelectVoice($v.VoiceInfo.Name); }
            }
            "#
        } else {
            r#"
            $idV = if ($isIndoReq) { $synth.GetInstalledVoices() | Where-Object { $_.VoiceInfo.Culture.Name -like 'id*' -and $_.VoiceInfo.Gender -eq 'Male' } | Select-Object -First 1 } else { $null };
            if ($idV) {
                $synth.SelectVoice($idV.VoiceInfo.Name);
            } else {
                $v = $synth.GetInstalledVoices() | Where-Object { $_.VoiceInfo.Gender -eq 'Male' } | Select-Object -First 1;
                if ($v) { $synth.SelectVoice($v.VoiceInfo.Name); }
            }
            "#
        };

        let is_indo_ps = if is_indo { "$true" } else { "$false" };

        let ps_script = format!(
            r#"
            Add-Type -AssemblyName System.Speech;
            $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer;
            $synth.Rate = {rate};
            $isIndoReq = {is_indo_ps};
            {voice_script}
            $synth.SetOutputToWaveFile("{escaped_path}");
            $synth.Speak("{escaped_text}");
            $synth.Dispose();
            "#
        );

        let status = Command::new("powershell")
            .args(&["-NoProfile", "-NonInteractive", "-Command", &ps_script])
            .status()
            .map_err(|e| format!("Failed to run speech synthesizer: {}", e))?;

        if !status.success() || !output_wav.exists() {
            return Err("Gagal menghasilkan file suara di sistem".to_string());
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        return Err("Sintesis suara saat ini didukung pada Windows".to_string());
    }

    // Measure duration using probe_media or estimation
    let duration = match probe_media(output_wav_str.clone()).await {
        Ok(probe) => probe.duration,
        Err(_) => (clean_text.split_whitespace().count() as f64 * 0.45).max(2.0),
    };

    Ok(GeneratedSpeechResult {
        file_path: output_wav_str,
        duration,
    })
}
