/* Delegate so copy remains available even if page content is replaced in future. */
(function () {
  'use strict';
  document.addEventListener('click', async function (event) {
    var button = event.target.closest('.source-copy');
    if (!button) { return; }
    var code = button.closest('.source-window').querySelector('code');
    var original = '复制代码';
    var accessibleName = button.getAttribute('aria-label');
    try {
      if (!navigator.clipboard || !navigator.clipboard.writeText) { throw new Error('Clipboard unavailable'); }
      await navigator.clipboard.writeText(code.textContent);
      button.textContent = '已复制 ✓';
      button.setAttribute('aria-label', '已复制' + accessibleName.slice(2));
    } catch (_) {
      button.textContent = '复制失败，请手动选取';
      button.setAttribute('aria-label', '复制失败，请手动选取' + accessibleName.slice(2));
    }
    clearTimeout(button._resetLabel);
    button._resetLabel = setTimeout(function () { button.textContent = original; button.setAttribute('aria-label', accessibleName); }, 2600);
  });
})();
