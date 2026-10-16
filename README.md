# 小结 · Little Knot

**A tiny interactive 3D companion for Wallpaper Engine.**  
一个离线运行、会追随鼠标和回应触摸的低模小伙伴。

Little Knot is a fan-made interactive Web wallpaper built with Three.js. It runs locally without an API, account, or network connection. 小结是一款独立运行的 Wallpaper Engine 网页壁纸，不需要后端或联网服务。

## Features / 互动

- **Look at you · 视线跟随** — 移动鼠标，徽章与眼睛会平滑转向。
- **Blink & bounce · 眨眼与回弹** — 点击角色，会眨眼并轻轻下压。
- **Petting · 摸摸头** — 不按鼠标，在头顶中央区域两秒内左右交替划过三次，就会开心地笑三秒；随后冷却五秒。
- **Ten taps · 十连点** — 五秒内点击角色十次，会出现四秒的「- -」表情。
- **Customize · 自定义** — 背景色、徽章纹样色、大小、跟随幅度、漂浮开关。
- **Offline & lightweight · 离线轻量** — 本地 Three.js、SVGLoader 和 SVG 素材；默认 30 FPS，最多 60 FPS。

## Try it / 预览

打开 `preview.html`（或 `wallpaper/index.html?studio`）查看可交互预览。按 **H** 可隐藏或显示调整面板。浏览器需要启用 WebGL 硬件加速。

## Wallpaper Engine installation / 安装

1. Download the repository ZIP or clone the project.
2. Open **Wallpaper Engine → Wallpaper Editor → Create Wallpaper**.
3. Choose the `wallpaper/index.html` file to create a **Web** wallpaper.
4. Edit the wallpaper's properties to set colors, size, tracking and floating.

**Important:** The `wallpaper/` folder is the standalone runtime. Keep its `vendor/` files beside the HTML and scripts. `project.json` stores Wallpaper Engine wallpaper properties; avoid overwriting an installed project's existing `project.json` when updating.

## Build / 打包

With Python 3 installed, from the repository root run:

```bash
python scripts/build.py
```

It creates two ZIP files in the ignored `dist/` folder: a complete wallpaper package and an update package that deliberately leaves out `project.json`, plus a SHA-256 file manifest.

The version number is maintained in `version.json` (current baseline: **v18**). To start a new numbered release, run `python scripts/build.py --version 19` with the intended number.

## Project files / 目录

```text
wallpaper/          Offline Web wallpaper source and bundled dependencies
preview.html        Browser preview shortcut
scripts/build.py    Release packager
version.json        Version source of truth
CHANGELOG.md        Changes and release notes
THIRD_PARTY_NOTICES.md  Credits and license notices
```

This public-facing source package intentionally excludes local archives, generated build artifacts, and development-only automated-check scripts that depend on a separate local testing workspace.

## Credits, license & trademarks / 来源与授权

- Original Little Knot interaction and application code: **MIT License**, © 2026 frycarrot. See [LICENSE](LICENSE).
- Three.js r128 / SVGLoader: The three.js authors, MIT; see [wallpaper/vendor/THREE-LICENSE.txt](wallpaper/vendor/THREE-LICENSE.txt).
- SVG paths originally sourced from [Lobe Icons](https://github.com/lobehub/lobe-icons): LobeHub, MIT; see [wallpaper/vendor/LOBE-LICENSE.txt](wallpaper/vendor/LOBE-LICENSE.txt).
- Mouse-interaction inspiration: [Cat vs Ball of Wool](https://codepen.io/Yakudoo/pen/oXJYxy) by Karim Maaloul; no source copied from that work.
- [Wallpaper Engine Web Wallpaper documentation](https://docs.wallpaperengine.io/en/web/first/gettingstarted.html).

**Unofficial fan-made project.** Not affiliated with or endorsed by OpenAI or Wallpaper Engine. The OpenAI name and logo are trademarks of their respective owner(s), and they are **not** licensed for general reuse by this repository's MIT license. The LobeHub code license is not a separate trademark permission. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) before redistributing artwork or publishing modified branding.

---
*小结 / Little Knot — 一个会把目光交给你的小伙伴。*
