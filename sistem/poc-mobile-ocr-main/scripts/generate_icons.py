"""Generate placeholder PWA icons untuk POC ANALISA TIMBANG.
Aesthetic: dark ink background + safety yellow geometric mark.
Untuk production, replace dengan branded icon dari designer.
"""
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path

OUT_DIR = Path(__file__).resolve().parents[1] / "public" / "icons"
OUT_DIR.mkdir(parents=True, exist_ok=True)

INK = (10, 11, 13, 255)         # #0a0b0d
SAFETY = (251, 191, 36, 255)    # #fbbf24
LCD = (255, 176, 0, 255)        # #ffb000
BONE = (232, 234, 237, 255)


def make_icon(size: int, maskable: bool = False):
    img = Image.new("RGBA", (size, size), INK)
    draw = ImageDraw.Draw(img)

    # Safe area for maskable: keep mark in inner 80%
    pad = int(size * 0.2) if maskable else int(size * 0.12)
    inner = size - 2 * pad

    # Hazard yellow notched square (matching app brand mark)
    shape_size = int(inner * 0.7)
    sx = (size - shape_size) // 2
    sy = (size - shape_size) // 2
    notch = int(shape_size * 0.25)

    # Polygon (notched corner bottom-right)
    points = [
        (sx, sy),
        (sx + shape_size, sy),
        (sx + shape_size, sy + shape_size - notch),
        (sx + shape_size - notch, sy + shape_size),
        (sx, sy + shape_size),
    ]
    draw.polygon(points, fill=SAFETY)

    # "AT" monogram dalam dark
    try:
        font_size = int(shape_size * 0.45)
        font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", font_size)
    except Exception:
        font = ImageFont.load_default()

    text = "AT"
    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    tx = sx + (shape_size - tw) // 2 - bbox[0]
    ty = sy + (shape_size - th) // 2 - bbox[1] - int(shape_size * 0.05)
    draw.text((tx, ty), text, fill=INK, font=font)

    # Hazard stripe accent at top (only non-maskable, since maskable cropped)
    if not maskable:
        stripe_h = max(2, size // 64)
        for i in range(0, size, stripe_h * 4):
            draw.rectangle([i, 0, i + stripe_h * 2, stripe_h * 2], fill=SAFETY)

    return img


# Generate icons
sizes = [
    ("192.png", 192, False),
    ("512.png", 512, False),
    ("maskable-512.png", 512, True),
]

for filename, size, maskable in sizes:
    icon = make_icon(size, maskable)
    out = OUT_DIR / filename
    icon.save(out, "PNG", optimize=True)
    print(f"  ✓ {filename} ({size}x{size}{' maskable' if maskable else ''})")

# Apple touch icon (180x180 standard)
apple = make_icon(180, False)
apple.save(OUT_DIR / "apple-touch-icon.png", "PNG", optimize=True)
print(f"  ✓ apple-touch-icon.png (180x180)")

# Favicon (32x32)
fav = make_icon(32, False)
fav.save(OUT_DIR.parent / "favicon.png", "PNG", optimize=True)
print(f"  ✓ favicon.png (32x32)")

print(f"\n[OK] Icons saved to: {OUT_DIR}")
print("Note: replace dengan asset dari designer untuk production.")
