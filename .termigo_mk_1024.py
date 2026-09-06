from PIL import Image

logo = Image.open("public/logo_square.png").convert("RGBA")
# Composite onto white (logo bg is white; removes any leftover transparency)
bg = Image.new("RGBA", logo.size, (255, 255, 255, 255))
bg.alpha_composite(logo)
logo = bg.convert("RGB")

S = 1024
canvas = Image.new("RGB", (S, S), (255, 255, 255))
# Fit preserving aspect ratio into a 1024 box, centered
scale = min(S / logo.width, S / logo.height)
new_w = max(1, round(logo.width * scale))
new_h = max(1, round(logo.height * scale))
resized = logo.resize((new_w, new_h), Image.LANCZOS)
x = (S - new_w) // 2
y = (S - new_h) // 2
canvas.paste(resized, (x, y))
canvas.save("src-tauri/app-icon-1024-src.png")
print("logo:", logo.size, "-> tiled at", canvas.size, "with logo", (new_w, new_h))
