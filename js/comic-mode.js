/* Independent ink edition switch: no page navigation or theme reset. */
(function () {
  'use strict';
  var root = document.documentElement;
  var toggle = document.querySelector('[data-ink-toggle]');
  if (!toggle) return;
  var label = toggle.querySelector('[data-ink-label]');
  function sync() {
    var mono = root.dataset.ink === 'mono';
    toggle.setAttribute('aria-pressed', mono ? 'true' : 'false');
    toggle.setAttribute('aria-label', mono ? '切换到彩色刊载' : '切换到黑白原稿');
    toggle.title = mono ? '切换到彩色刊载' : '切换到黑白原稿';
    if (label) label.textContent = mono ? '黑白' : '彩色';
  }
  sync();
  toggle.addEventListener('click', function () {
    root.dataset.ink = root.dataset.ink === 'mono' ? 'color' : 'mono';
    try { localStorage.setItem('ryan-comic-ink', root.dataset.ink); } catch (e) {}
    sync();
  });
  window.addEventListener('storage', function (event) {
    if (event.key === 'ryan-comic-ink') {
      root.dataset.ink = event.newValue === 'mono' ? 'mono' : 'color';
      sync();
    }
  });
})();
