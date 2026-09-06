# Third-Party Binary Licenses — Filmov

The following command-line engines are bundled in this directory (`src-tauri/binaries/`)
and shipped with the Filmov desktop application. Redistribution is subject to each
project's license.

| Engine | File(s) | License | Source / Upstream |
|--------|---------|---------|-------------------|
| FFmpeg | `ffmpeg.exe`, `ffprobe.exe` | **GPLv3** (this static "essentials" build is non-LGPL) | https://www.gyan.dev/ffmpeg/builds/ |
| yt-dlp | `yt-dlp.exe` | **Unlicense** (public domain) | https://github.com/yt-dlp/yt-dlp |

## FFmpeg (GPLv3)

This build of FFmpeg is licensed under the **GNU General Public License v3** (GPL-3.0),
because it is compiled with the `--enable-gpl` option and is not the LGPL variant.
Under GPL-3.0, redistribution of FFmpeg alongside this application requires providing
the corresponding source code of the bundled FFmpeg build. The FFmpeg source used for
this build is available from the upstream project, and the exact build recipe can be
reproduced from https://www.gyan.dev/ffmpeg/builds/.

- Project: https://ffmpeg.org/
- License text: https://www.gnu.org/licenses/gpl-3.0.html

The public API and documentation of FFmpeg: https://ffmpeg.org/documentation.html

## yt-dlp (Unlicense)

yt-dlp is released into the public domain under the **Unlicense**. You can use, modify,
and redistribute it freely.

- Project: https://github.com/yt-dlp/yt-dlp
- License text: https://github.com/yt-dlp/yt-dlp/blob/master/LICENSE

---

*This notice was generated as part of the Filmov security & packaging audit. If you
redistribute the application, keep this file alongside the bundled binaries.*
