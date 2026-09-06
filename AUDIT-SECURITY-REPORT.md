# Audit & Perbaikan Keamanan — Filmov (Tauri v2 + React)

**Tanggal:** sesi audit keamanan 2026
**Cakupan:** analisa mendalam struktur kode (frontend React + backend Rust/Tauri),
penemuan bug/celah, dan perbaikan.
**Status perbaikan:** semua temuan Critical/High/Medium utama sudah diperbaiki;
`cargo check` lolos setelah setiap perubahan.

---

## Temuan & Perbaikan

### CRITICAL

| # | Temuan | File | Perbaikan |
|---|--------|------|-----------|
| 1 | **Command injection PowerShell (TTS)** — escaping hanya `"` dan `$`; backtick (karakter escape PS) tidak diescape sehingga input pengguna bisa keluar dari string dan menjalankan perintah arbitrer di Windows | `commands/voice.rs` | Escape ulang dengan urutan benar: backtick → `$` → `"`. Backslash/CR/LF **tidak** diescape (literal di string PS) agar path Windows & teks tidak rusak. |
| 2 | **Akses filesystem tak terbatas** — scope `assetProtocol` berisi `C:/**`…`G:/**`, `**`, `**/*`, `$HOME/**` → webview bisa membaca hampir semua file | `src-tauri/tauri.conf.json` | Scope dipersempit ke `$VIDEO`, `$DOWNLOAD`, `$AUDIO`, `$DOCUMENT`, `$DESKTOP`, `$TEMP`, `$RESOURCE` saja. |
| 3 | **Grant runtime blanket drive/home** — `lib.rs` melakukan `allow_directory` untuk drive C–H dan seluruh home dir | `lib.rs` | Diganti grant hanya direktori `Videos|Downloads|Documents|Desktop\Filmov`. |
| 4 | **Read/write file arbitrer** — `save_project_file`, `load_project_file`, `save_media_to_path`, `save_media_as`, `reveal_in_folder` menerima path apa pun tanpa validasi (proyek jahat bisa menimpa file sistem/Startup) | `commands/project.rs`, `commands/downloader.rs` | Ditambah `validate_*_path()` (canonicalize ancestor terdekat; hanya diizinkan di bawah direktori konten user standar: Videos/Downloads/Documents/Desktop/Music/Pictures + Temp). `suggested_name` disanitasi dari `..` `/` `\`. |

### HIGH

| # | Temuan | File | Perbaikan |
|---|--------|------|-----------|
| 5 | **CSP dinetralkan wildcard** — `media-src`/`connect-src` mengizinkan `http://* https://*` | `src-tauri/tauri.conf.json` | Wildcard dihapus; hanya `https:` + asset lokal yang diizinkan. |
| 6 | **`allow_asset_path` memberi akses direktori induk rekursif** — membuka satu file = seluruh folder induk tersaji | `commands/video.rs` | Grant hanya file yang dimaksud; untuk direktori hanya non-rekursif. |

### MEDIUM

| # | Temuan | File | Perbaikan |
|---|--------|------|-----------|
| 7 | **`export_project` output path tak divalidasi** — path berisi `..` bisa menulis ke lokasi arbitrer | `commands/video.rs` | Tolak `outputPath` yang mengandung `..` atau NUL. |
| 8 | **Deteksi hardware bohong** — Windows non-NVIDIA selalu diklaim QuickSync (`h264_qsv`, isHardwareAccelerated=true) → ekspor gagal / pilih encoder salah | `commands/hardware.rs` | QSV hanya diaktifkan bila ada GPU Intel terdeteksi via WMI. |
| 9 | **Escaping ganda/quoted salah di dialog Save (media)** — memakai nama mentah di fallback path | `commands/downloader.rs` | Gunakan nama tersanitasi di seluruh titik; kuote tunggal tetap di-double-escape. |

### LOW / INFO (tercatat, tidak diubah)

- **`resolve_binary` menjalankan `--version` pada binary dari PATH** — risiko rendah (aplikasi desktop lokal; user sendiri yang mengatur PATH). Disarankan: verifikasi hash/signature untuk binary yang diunduh via updater di masa depan.
- **Fallback `extract_waveform` sintetis** — bukan isu keamanan.
- **`open_media_folder`** — hanya membuka folder, path tetap bisa dari mana pun (tidak mengeksekusi).

---

## Verifikasi

- `cargo check` (target Linux lokal): **lolos tanpa warning** setelah seluruh perubahan.
- Blok Windows (`cfg(target_os = "windows")`) di `voice.rs` & `downloader.rs` tidak ikut ter-compile di target Linux, diverifikasi manual via pembacaan kode (escaping, format arg, urutan).
- `tauri.conf.json` tervalidasi sebagai JSON; scope & CSP final terverifikasi.

## File yang Diubah

1. `src-tauri/tauri.conf.json`
2. `src-tauri/src/lib.rs`
3. `src-tauri/src/commands/voice.rs`
4. `src-tauri/src/commands/video.rs`
5. `src-tauri/src/commands/project.rs`
6. `src-tauri/src/commands/downloader.rs`
7. `src-tauri/src/commands/hardware.rs`

## Catatan untuk pekerjaan berikutnya

- Tes manual TTS Windows (karakter `$`, backtick, tanda kutip, teks multi-baris) untuk konfirmasi fungsi sintesis.
- Tes manual Save/Open proyek ke Desktop/Documents dan Save-As media dari downloader.
- Audit sisi frontend (React) tidak menemukan `dangerouslySetInnerHTML`/XSS refleksi; React melakukan escape teks default.
