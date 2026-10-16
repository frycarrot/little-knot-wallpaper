"""Encode captured browser frames with one shared palette and verify the output."""
import json
import sys
from pathlib import Path
from PIL import Image

frames_dir, target = map(Path, sys.argv[1:3])
metadata = json.loads((frames_dir / 'capture.json').read_text(encoding='utf-8'))
frames = []
for index in range(metadata['count']):
    with Image.open(frames_dir / f'{index:03}.png') as image:
        frames.append(image.convert('RGB'))
# One palette across the animation prevents color flicker. Dithering is unnecessary
# for the wallpaper's intentionally flat colors and would inflate the file size.
samples = Image.new('RGB', (160 * 10, 100))
for index in range(10):
    samples.paste(frames[index * (len(frames) - 1) // 9].resize((160, 100)), (index * 160, 0))
palette = samples.quantize(colors=128, method=Image.Quantize.MEDIANCUT)
indexed = [frame.quantize(palette=palette, dither=Image.Dither.NONE) for frame in frames]
target.parent.mkdir(exist_ok=True, parents=True)
indexed[0].save(target, save_all=True, append_images=indexed[1:], duration=metadata['frameMs'], loop=0, optimize=True, disposal=1)
with Image.open(target) as gif:
    assert gif.size == (640, 400) and gif.info['loop'] == 0
    duration = 0
    for index in range(gif.n_frames):
        gif.seek(index)
        duration += gif.info['duration']
    assert 4000 <= duration <= 8000, duration
    size = target.stat().st_size
    assert size < 2 * 1024 * 1024, f'GIF exceeds 2 MiB: {size}'
    report = {'size': gif.size, 'frames': gif.n_frames, 'duration_ms': duration, 'bytes': size, 'loop': 0}
(frames_dir / 'gif-report.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
print(f'{target}\n{duration / 1000:.2f}s, {size / 1024:.0f} KiB, looping')
