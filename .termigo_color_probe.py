from PIL import Image
from collections import Counter

files = [
    "public/app-icon-512.png",
    "public/logo.png",
    "public/logo_square.png",
    "public/logo-transparent.png",
    "public/icon.png",
    "public/app-icon-taskbar-512.png",
    "public/splash-logo.png",
    "src-tauri/icons/icon.png",
    "src-tauri/icons-default-backup/32x32.png",
]

# Bucket colors into coarse hue classes to identify Tauri (cyan/orange) vs Filmov (purple)
def classify(rgb):
    r, g, b = rgb
    mx = max(r, g, b)
    mn = min(r, g, b)
    if mx < 40:
        return "black"
    if mn > 220:
        return "white"
    # purple: r and b high, g lower
    if r > 100 and b > 120 and g < r - 30 and g < b - 30:
        return "purple"
    # cyan: g,b high, r low
    if g > 130 and b > 150 and r < g - 40 and r < b - 40:
        return "cyan"
    # orange/amber: r high, g mid, b low
    if r > 180 and g > 90 and b < 120:
        return "orange"
    # green
    if g > 120 and r < g - 30 and b < g - 30:
        return "green"
    return "other"

for f in files:
    try:
        im = Image.open(f).convert("RGB")
    except Exception as e:
        print(f"{f}: ERR {e}")
        continue
    im = im.resize((80, 80))
    px = list(im.getdata())
    c = Counter(classify(p) for p in px)
    total = len(px)
    top = ", ".join(f"{k}:{round(v/total*100)}%" for k, v in c.most_common(4))
    print(f"{f:42s} {top}")
