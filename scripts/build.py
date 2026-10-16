"""Build offline release archives; never change the installed Wallpaper Engine copy."""
from pathlib import Path
import argparse
import hashlib
import json
import re
import zipfile

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--version', type=int, help='Set the source release number before building')
args = parser.parse_args()
version_file = ROOT / 'version.json'
version = args.version if args.version is not None else json.loads(version_file.read_text())['version']
if not isinstance(version, int) or version < 1:
    raise SystemExit('Version must be a positive integer')
source = ROOT / 'wallpaper'
app = source / 'app.js'
index = source / 'index.html'
app_text, app_count = re.subn(r'version:\d+,', f'version:{version},', app.read_text(encoding='utf-8'))
index_text, index_count = re.subn(r'app\.js\?v=\d+', f'app.js?v={version}', index.read_text(encoding='utf-8'))
if app_count != 1 or index_count != 1:
    raise SystemExit('Version markers missing or ambiguous; nothing changed')
app.write_text(app_text, encoding='utf-8')
index.write_text(index_text, encoding='utf-8')
version_file.write_text(json.dumps({'version': version}) + '\n', encoding='utf-8')
dist = ROOT / 'dist'
dist.mkdir(exist_ok=True)
files = sorted(p for p in source.rglob('*') if p.is_file())
manifest = {'version': version, 'files': {p.relative_to(source).as_posix(): hashlib.sha256(p.read_bytes()).hexdigest() for p in files}}
for suffix, selected in [('wallpaper', files), ('update', [p for p in files if p.name != 'project.json'])]:
    # Updates include all runtime assets, but preserve installed user settings/Workshop metadata.
    target = dist / f'little-knot-{suffix}-v{version}.zip'
    with zipfile.ZipFile(target, 'w', zipfile.ZIP_DEFLATED) as archive:
        for file in selected:
            archive.write(file, file.relative_to(source))
    with zipfile.ZipFile(target) as archive:
        assert archive.testzip() is None
    print(target)
(dist / f'manifest-v{version}.json').write_text(json.dumps(manifest, indent=2), encoding='utf-8')
