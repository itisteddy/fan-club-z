#!/usr/bin/env python3
"""
Generate logo pack from source image
Creates all required sizes for web, PWA, and Android
"""

from PIL import Image
from PIL.ImageDraw import floodfill
from pathlib import Path
import sys

# Paths
SRC = Path("fcz_icon_pack/ChatGPT Image Nov 22, 2025, 06_18_14 PM.png")
OUT = Path("client/public/brand")
ICONS_OUT = Path("client/public/icons")
OUT.mkdir(parents=True, exist_ok=True)
ICONS_OUT.mkdir(parents=True, exist_ok=True)

if not SRC.exists():
    print(f"❌ Source image not found: {SRC}")
    sys.exit(1)

print(f"📸 Source: {SRC}")

# Flood-fill outer background from corners, then make that transparent (keeps white inside logo)
def to_transparent(path, tol=10):
    im = Image.open(path).convert("RGBA")
    w, h = im.size
    marker = (1, 2, 3, 255)
    for seed in [(0,0), (w-1,0), (0,h-1), (w-1,h-1)]:
        try:
            floodfill(im, seed, marker, thresh=tol)
        except Exception:
            pass
    im.putdata([(0,0,0,0) if px == marker else px for px in im.getdata()])
    # trim
    bbox = im.getbbox()
    return im.crop(bbox) if bbox else im

def square_canvas(im):
    w,h = im.size
    m = max(w,h)
    canvas = Image.new("RGBA", (m,m), (0,0,0,0))
    canvas.paste(im, ((m-w)//2, (m-h)//2), im)
    return canvas

print("🔄 Processing source image...")
transparent = to_transparent(SRC, tol=8)
base_square = square_canvas(transparent)

print(f"✅ Base square: {base_square.size[0]}x{base_square.size[1]}")

# Export sizes for web/PWA
sizes = [1024, 512, 384, 256, 192, 180, 152, 128, 96, 64, 48, 32, 16]
print(f"\n📦 Generating {len(sizes)} icon sizes...")
for s in sizes:
    out = base_square.resize((s,s), Image.LANCZOS)
    out.save(ICONS_OUT / f"icon-{s}.png", "PNG")
    print(f"  ✓ icon-{s}.png ({s}x{s})")

# Main logomark for headers (512x512)
logomark = base_square.resize((512, 512), Image.LANCZOS)
logomark.save(OUT / "fcz-logomark.png", "PNG")
print(f"\n✅ Main logomark: {OUT / 'fcz-logomark.png'} (512x512)")

# Padded site header variant (a bit of breathing room)
pad = int(max(base_square.size) * 0.10)
site = Image.new("RGBA", (base_square.size[0]+pad*2, base_square.size[1]+pad*2), (0,0,0,0))
site.paste(base_square, (pad,pad), base_square)
site_512 = site.resize((512, 512), Image.LANCZOS)
site_512.save(OUT / "fcz-logomark-padded.png", "PNG")
print(f"✅ Padded logomark: {OUT / 'fcz-logomark-padded.png'} (512x512)")

# Favicon sizes (16, 32)
favicon_16 = base_square.resize((16, 16), Image.LANCZOS)
favicon_32 = base_square.resize((32, 32), Image.LANCZOS)
favicon_16.save(OUT / "favicon-16.png", "PNG")
favicon_32.save(OUT / "favicon-32.png", "PNG")
print(f"\n✅ Favicons:")
print(f"  ✓ favicon-16.png (16x16)")
print(f"  ✓ favicon-32.png (32x32)")

# Apple touch icon (180x180)
apple_touch = base_square.resize((180, 180), Image.LANCZOS)
apple_touch.save(ICONS_OUT / "apple-touch-icon.png", "PNG")
print(f"✅ Apple touch icon: {ICONS_OUT / 'apple-touch-icon.png'} (180x180)")

# Keep original as backup
Image.open(SRC).convert("RGBA").save(OUT / "fcz-logo-original.png", "PNG")
print(f"\n✅ Original backup: {OUT / 'fcz-logo-original.png'}")

print(f"\n🎉 Done! Generated {len(sizes) + 5} files")
print(f"📁 Brand folder: {OUT}")
print(f"📁 Icons folder: {ICONS_OUT}")

