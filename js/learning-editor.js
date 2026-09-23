/* Authoring helper only. No pretend server-side publish: GitHub commit is required. */
(function () {
  'use strict';
  var form = document.querySelector('[data-learning-form]');
  if (!form) { return; }
  var status = document.querySelector('[data-editor-status]');
  var output = document.querySelector('[data-learning-output]');
  var field = document.querySelector('[data-learning-json]');
  var submit = form.querySelector('[type="submit"]');
  var existing;
  submit.disabled = true;
  fetch('data/learning.json', { cache: 'no-store' }).then(function (response) {
    if (!response.ok) { throw new Error('HTTP ' + response.status); }
    return response.json();
  }).then(function (data) {
    if (!data || !Array.isArray(data.entries)) { throw new Error('格式错误'); }
    existing = data.entries;
    submit.disabled = false;
    status.textContent = '已读取当前公开记录。输入会暂存于本机，提交 GitHub 前不会公开。';
  }).catch(function () {
    status.textContent = '无法读取当前公开记录。为避免覆盖旧内容，暂不能生成发布文件；请刷新重试。';
  });
  try {
    var saved = JSON.parse(localStorage.getItem('ryan-learning-draft') || 'null');
    if (saved && typeof saved === 'object') {
      ['date', 'topic', 'title', 'progress', 'reflection'].forEach(function (key) {
        if (typeof saved[key] === 'string') { form.elements[key].value = saved[key]; }
      });
    }
  } catch (e) { /* Storage unavailable: form remains usable. */ }
  form.addEventListener('input', function () {
    output.hidden = true;
    var draft = {};
    ['date', 'topic', 'title', 'progress', 'reflection'].forEach(function (key) {
      draft[key] = form.elements[key].value;
    });
    try { localStorage.setItem('ryan-learning-draft', JSON.stringify(draft)); } catch (e) {}
  });
  form.addEventListener('submit', function (event) {
    event.preventDefault();
    if (!form.reportValidity() || !existing) { return; }
    var entry = {};
    ['date', 'topic', 'title', 'progress', 'reflection'].forEach(function (key) {
      entry[key] = form.elements[key].value.trim();
    });
    if (Object.values(entry).some(function (value) { return !value; })) {
      status.textContent = '请把日期、方向、进展和感悟都填写完整。'; return;
    }
    var today = new Date();
    var localToday = [today.getFullYear(), String(today.getMonth() + 1).padStart(2, '0'), String(today.getDate()).padStart(2, '0')].join('-');
    if (entry.date > localToday) { status.textContent = '记录日期不能晚于今天。'; return; }
    field.value = JSON.stringify({ entries: [entry].concat(existing) }, null, 2) + '\n';
    output.hidden = false;
    status.textContent = '文件已在下方生成，但尚未公开。请复制完整 JSON 并在 GitHub 提交。';
    output.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
  });
  document.querySelector('[data-learning-copy]').addEventListener('click', function () {
    var done = function () { status.textContent = '完整 JSON 已复制；下一步在 GitHub 文件编辑页替换并提交。'; };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(field.value).then(done).catch(function () { field.focus(); field.select(); status.textContent = '无法自动复制。已选中文本，请手动复制。'; });
    } else { field.focus(); field.select(); status.textContent = '已选中文本，请手动复制。'; }
  });
  document.querySelector('[data-learning-download]').addEventListener('click', function () {
    var url = URL.createObjectURL(new Blob([field.value], { type: 'application/json' }));
    var link = document.createElement('a'); link.href = url; link.download = 'learning.json';
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    status.textContent = '已下载文件；仍需把它提交到 GitHub 才会公开。';
  });
})();
