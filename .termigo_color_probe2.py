from PIL import Image
from collections import Counter

files = [
    "public/app-icon-512.png",
    "public/logo.png",
    "public/logo_square.png",
    "public/app-icon-taskbar-512.png",
    "public/splash-logo.png",
    "src-tauri/icons/icon.png",
]

def hexof(rgb):
    return "#%02x%02x%02x" % rgb

for f in files:
    im = Image.open(f)
    im = im.convert("RGBA").resize((120, 120))
    px = im.load()
    opaque = []
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if a > 200:
                opaque.append((r, g, b))
    total = len(opaque)
    if total == 0:
        print(f"{f:40s} all-transparent")
        continue
    # quantize to reduce AA noise: bucket each channel to nearest 32
    q = Counter(((r // 32) * 32 + 16, (g // 32) * 32 + 16, (b // 32) * 32 + 16) for r, g, b in opaque)
    top = ", ".join(f"{hexof(c)}:{round(n/total*100)}%" for c, n in q.most_common(6))
    print(f"{f:40s} opaque={total}  {top}")
