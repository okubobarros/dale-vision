from pathlib import Path
from PIL import Image
import numpy as np
import base64
import io

src = Path('frontend/src/assets/favicon-source.png')
out = Path('frontend/public')
out.mkdir(parents=True, exist_ok=True)

im = Image.open(src).convert('RGBA')

# Trim near-black background to keep the mark centered
rgb = np.array(im)[..., :3]
mask = (rgb > 20).any(axis=2)
if mask.any():
    ys, xs = np.where(mask)
    im = im.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))

# Ensure square canvas before scaling
w, h = im.size
if w != h:
    size = max(w, h)
    square = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    square.paste(im, ((size - w) // 2, (size - h) // 2), im)
    im = square

PADDING = 0.16  # 16% safe area
BG = (0, 0, 0, 255)


def make_icon(size: int) -> Image.Image:
    canvas = Image.new('RGBA', (size, size), BG)
    target = int(size * (1 - 2 * PADDING))
    icon = im.resize((target, target), Image.LANCZOS)
    x = (size - target) // 2
    y = (size - target) // 2
    canvas.paste(icon, (x, y), icon)
    return canvas


# PNGs
sizes = {
    'favicon-16x16.png': 16,
    'favicon-32x32.png': 32,
    'favicon-48x48.png': 48,
    'apple-touch-icon.png': 180,
    'android-chrome-192x192.png': 192,
    'android-chrome-512x512.png': 512,
    'favicon.png': 32,
}

base512 = make_icon(512)
for name, size in sizes.items():
    make_icon(size).save(out / name, 'PNG')

# favicon.ico (16/32/48)
base512.save(out / 'favicon.ico', format='ICO', sizes=[(16, 16), (32, 32), (48, 48)])

# favicon.svg (embed PNG)
buf = io.BytesIO()
base512.save(buf, format='PNG')
b64 = base64.b64encode(buf.getvalue()).decode('ascii')
(out / 'favicon.svg').write_text(
    f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">\n'
    f'  <image href="data:image/png;base64,{b64}" width="512" height="512" />\n'
    f'</svg>\n',
    encoding='utf-8'
)

# safari-pinned-tab.svg (monochrome)
# Build a black mask from luminance
mono = im.convert('L')
mono = mono.point(lambda p: 255 if p > 20 else 0)
mask_canvas = Image.new('RGBA', (512, 512), (0, 0, 0, 0))
mono_resized = mono.resize((int(512 * (1 - 2 * PADDING)),) * 2, Image.LANCZOS)
mx = (512 - mono_resized.size[0]) // 2
my = (512 - mono_resized.size[1]) // 2
mask_canvas.paste((0, 0, 0, 255), (mx, my), mono_resized)

buf2 = io.BytesIO()
mask_canvas.save(buf2, format='PNG')
b64m = base64.b64encode(buf2.getvalue()).decode('ascii')
(out / 'safari-pinned-tab.svg').write_text(
    f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">\n'
    f'  <image href="data:image/png;base64,{b64m}" width="512" height="512" />\n'
    f'</svg>\n',
    encoding='utf-8'
)

print('done')
