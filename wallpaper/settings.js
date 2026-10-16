/* Registered before scene initialization so Wallpaper Engine startup values are retained. */
window.badgeSettings = { background:'#b5c997', ink:'#353530', size:1, tracking:1, float:true, fps:30, paused:false };
window.wallpaperPropertyListener = {
  applyUserProperties(properties) {
    const state = window.badgeSettings;
    for (const key of ['background','ink']) {
      if (properties[key]) {
        const rgb = String(properties[key].value).trim().split(/\s+/).map(Number);
        if (rgb.length === 3 && rgb.every(Number.isFinite)) state[key] = '#' + rgb.map(v => Math.round(Math.max(0,Math.min(1,v))*255).toString(16).padStart(2,'0')).join('');
      }
    }
    for (const [key,min,max] of [['size',0.55,1.4],['tracking',0,1.5]]) {
      if (properties[key] && Number.isFinite(Number(properties[key].value))) state[key] = Math.max(min,Math.min(max,Number(properties[key].value)));
    }
    if (properties.float) state.float = !!properties.float.value;
    window.dispatchEvent(new Event('badge-settings'));
  },
  applyGeneralProperties(properties) {
    if (Number.isFinite(properties.fps) && properties.fps > 0) window.badgeSettings.fps = Math.min(60,properties.fps);
  },
  setPaused(paused) { window.badgeSettings.paused = !!paused; }
};
