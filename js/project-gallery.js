/* Real project screenshots only. A native dialog retains keyboard focus/escape. */
(function () {
  'use strict';
  var buttons = Array.from(document.querySelectorAll('.project-gallery .gallery-open'));
  if (!buttons.length || typeof HTMLDialogElement === "undefined" || !HTMLDialogElement.prototype.showModal) { return; }
  var dialog = document.createElement('dialog');
  dialog.className = 'gallery-dialog';
  dialog.setAttribute('aria-label', '项目界面大图');
  dialog.innerHTML = '<div class="gallery-dialog-frame"><div class="gallery-dialog-bar"><span class="gallery-dialog-count"></span><button class="gallery-dialog-close" type="button" aria-label="关闭大图">×</button></div><img class="gallery-dialog-image" alt=""><div class="gallery-dialog-bottom"><button class="gallery-dialog-prev" type="button" aria-label="上一张">← 上一张</button><p class="gallery-dialog-caption"></p><button class="gallery-dialog-next" type="button" aria-label="下一张">下一张 →</button></div></div>';
  document.body.appendChild(dialog);
  var image = dialog.querySelector('.gallery-dialog-image');
  var caption = dialog.querySelector('.gallery-dialog-caption');
  var count = dialog.querySelector('.gallery-dialog-count');
  var index = 0;
  function show(which) {
    index = (which + buttons.length) % buttons.length;
    var source = buttons[index].querySelector('img');
    image.src = source.currentSrc || source.src;
    image.alt = source.alt;
    caption.textContent = buttons[index].closest('figure').querySelector('figcaption').textContent;
    count.textContent = (index + 1) + ' / ' + buttons.length;
  }
  buttons.forEach(function (button, i) {
    button.addEventListener('click', function () { show(i); dialog.showModal(); });
  });
  dialog.querySelector('.gallery-dialog-close').addEventListener('click', function () { dialog.close(); });
  dialog.querySelector('.gallery-dialog-prev').addEventListener('click', function () { show(index - 1); });
  dialog.querySelector('.gallery-dialog-next').addEventListener('click', function () { show(index + 1); });
  dialog.addEventListener('keydown', function (event) {
    if (event.key === 'ArrowLeft') { event.preventDefault(); show(index - 1); }
    if (event.key === 'ArrowRight') { event.preventDefault(); show(index + 1); }
  });
  dialog.addEventListener('click', function (event) { if (event.target === dialog) { dialog.close(); } });
})();
