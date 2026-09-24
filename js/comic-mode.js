/* One persistent switch: monochrome is dark, color is light.
   The color image expands from or retracts into the switch. */
(function () {
  'use strict';
  var root = document.documentElement;
  // Entrance motion belongs to navigation, not to the persistent page state.
  // Clear it after the longest panel animation so hover transforms keep working.
  if (root.classList.contains('page-arriving')) {
    // Cross-document View Transitions animate the snapshots; do not also
    // animate the real DOM beneath them (it doubles the fade into darkness).
    window.addEventListener('pagereveal', function (event) {
      if (event.viewTransition) { root.classList.add('page-view-transitioning'); }
    });
    window.setTimeout(function () { root.classList.remove('page-arriving', 'page-view-transitioning'); }, 1600);
  }
  window.addEventListener('pageshow', function (event) {
    if (event.persisted) { root.classList.remove('page-arriving', 'page-view-transitioning'); }
  });
  var toggle = document.querySelector('[data-ink-toggle]');
  if (!toggle) { return; }
  var running = false;
  function sync() {
    var mono = root.dataset.ink === 'mono';
    toggle.setAttribute('aria-pressed', mono ? 'false' : 'true');
    toggle.setAttribute('aria-label', mono ? '切换到彩色明亮版' : '切换到黑白暗色版');
    toggle.title = mono ? '切换到彩色明亮版' : '切换到黑白暗色版';
  }
  function setInk(value) {
    root.dataset.ink = value;
    root.dataset.theme = value === 'color' ? 'light' : 'dark';
    var bar = document.querySelector('meta[name="theme-color"]');
    if (bar) { bar.content = value === 'color' ? '#fff8e9' : '#292929'; }
    try { localStorage.setItem('ryan-comic-ink', value); } catch (e) {}
    sync();
  }
  sync();
  toggle.addEventListener('click', function () {
    if (running) { return; }
    var toColor = root.dataset.ink === 'mono';
    var next = toColor ? 'color' : 'mono';
    var rect = toggle.getBoundingClientRect();
    var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || !document.startViewTransition) { setInk(next); return; }
    running = true;
    // Exclude named navigation snapshots before capturing the theme's full page.
    root.classList.add('ink-morphing');
    var x = rect.left + rect.width / 2;
    var y = rect.top + rect.height / 2;
    var radius = Math.ceil(Math.max(
      Math.hypot(x, y), Math.hypot(innerWidth - x, y),
      Math.hypot(x, innerHeight - y), Math.hypot(innerWidth - x, innerHeight - y)
    )) + 2;
    root.style.setProperty('--ink-x', x + 'px');
    root.style.setProperty('--ink-y', y + 'px');
    root.style.setProperty('--ink-radius', radius + 'px');
    try {
      var transition = document.startViewTransition(function () {
        root.classList.toggle('ink-retracting', !toColor);
        root.classList.toggle('ink-expanding', toColor);
        toggle.classList.add('is-morphing');
        setInk(next);
      });
      transition.finished.catch(function () {}).finally(function () {
        root.classList.remove('ink-expanding', 'ink-retracting', 'ink-morphing');
        toggle.classList.remove('is-morphing');
        running = false;
      });
    } catch (error) {
      setInk(next);
      root.classList.remove('ink-expanding', 'ink-retracting', 'ink-morphing');
      toggle.classList.remove('is-morphing');
      running = false;
    }
  });
  window.addEventListener('storage', function (event) {
    if (event.key === 'ryan-comic-ink') {
      root.dataset.ink = event.newValue === 'color' ? 'color' : 'mono';
      root.dataset.theme = root.dataset.ink === 'color' ? 'light' : 'dark';
      var bar = document.querySelector('meta[name="theme-color"]');
      if (bar) { bar.content = root.dataset.ink === 'color' ? '#fff8e9' : '#292929'; }
      sync();
    }
  });
})();
