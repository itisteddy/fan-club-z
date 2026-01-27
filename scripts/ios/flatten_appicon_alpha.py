#!/usr/bin/env python3
"""
Flatten alpha channel in AppIcon PNGs for App Store submission.
Composites images with alpha over a solid black background (#000000).
"""

import os
import sys
from pathlib import Path

def ensure_pillow():
    """Install pillow if missing."""
    try:
        import PIL
    except ImportError:
        print("Installing pillow...")
        import subprocess
        import sys
        import importlib
        try:
            subprocess.check_call([sys.executable, "-m", "pip", "install", "--user", "pillow"], stderr=subprocess.DEVNULL, stdout=subprocess.DEVNULL)
        except subprocess.CalledProcessError:
            # Fallback: try with --break-system-packages if --user fails
            subprocess.check_call([sys.executable, "-m", "pip", "install", "--user", "--break-system-packages", "pillow"], stderr=subprocess.DEVNULL, stdout=subprocess.DEVNULL)
        # Force reload of import system
        import site
        importlib.invalidate_caches()
        import PIL

def flatten_alpha(image_path, bg_color=(0, 0, 0)):
    """
    Flatten PNG with alpha channel onto solid background.
    bg_color: RGB tuple (default: black #000000)
    Returns True if alpha was removed, False if already RGB.
    """
    from PIL import Image
    
    img = Image.open(image_path)
    
    # Check if image has alpha
    if img.mode in ('RGBA', 'LA', 'P'):
        if img.mode == 'P':
            img = img.convert('RGBA')
        
        # Create solid background
        bg = Image.new('RGB', img.size, bg_color)
        
        # Composite image over background
        if img.mode == 'RGBA':
            bg.paste(img, mask=img.split()[3])  # Use alpha channel as mask
        else:
            bg.paste(img)
        
        # Save as RGB (no alpha)
        bg.save(image_path, 'PNG', optimize=True)
        return True
    elif img.mode == 'RGB':
        return False
    else:
        # Convert other modes to RGB
        rgb_img = img.convert('RGB')
        rgb_img.save(image_path, 'PNG', optimize=True)
        return True

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 flatten_appicon_alpha.py <AppIcon.appiconset directory>")
        sys.exit(1)
    
    appiconset_dir = Path(sys.argv[1])
    if not appiconset_dir.is_dir():
        print(f"Error: {appiconset_dir} is not a directory")
        sys.exit(1)
    
    ensure_pillow()
    
    modified = []
    png_files = list(appiconset_dir.glob("*.png"))
    
    if not png_files:
        print(f"No PNG files found in {appiconset_dir}")
        sys.exit(0)
    
    for png_file in png_files:
        print(f"Processing {png_file.name}...")
        if flatten_alpha(png_file):
            modified.append(png_file.name)
            print(f"  ✓ Removed alpha channel")
        else:
            print(f"  - Already RGB (no alpha)")
    
    if modified:
        print(f"\n✓ Modified {len(modified)} file(s): {', '.join(modified)}")
    else:
        print("\n✓ No files needed modification (all already RGB)")
    
    return 0

if __name__ == '__main__':
    sys.exit(main())
