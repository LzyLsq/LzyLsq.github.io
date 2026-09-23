/* Public learning log: only committed records in data/learning.json appear here. */
(function () {
  'use strict';
  var list = document.querySelector('[data-learning-list]');
  if (!list) { return; }
  var status = document.querySelector('[data-learning-status]');
  var empty = document.querySelector('[data-learning-empty]');
  fetch('data/learning.json').then(function (response) {
    if (!response.ok) { throw new Error('HTTP ' + response.status); }
    return response.json();
  }).then(function (data) {
    if (!data || !Array.isArray(data.entries)) { throw new Error('记录格式错误'); }
    var entries = data.entries.filter(function (item) {
      return item && /^\d{4}-\d{2}-\d{2}$/.test(item.date) &&
        typeof item.topic === 'string' && typeof item.title === 'string' &&
        typeof item.progress === 'string' && typeof item.reflection === 'string';
    }).sort(function (a, b) { return b.date.localeCompare(a.date); });
    status.textContent = entries.length ? '已发布 ' + entries.length + ' 条记录' : '';
    empty.hidden = !!entries.length;
    entries.forEach(function (entry, index) {
      var article = document.createElement('article');
      article.className = 'learning-entry';
      var side = document.createElement('div'); side.className = 'learning-entry-side';
      var date = document.createElement('time'); date.dateTime = entry.date; date.textContent = entry.date;
      var number = document.createElement('span'); number.textContent = 'NOTE ' + String(entries.length - index).padStart(2, '0');
      side.append(date, number);
      var body = document.createElement('div'); body.className = 'learning-entry-body';
      var topic = document.createElement('span'); topic.className = 'learning-topic'; topic.textContent = entry.topic;
      var heading = document.createElement('h3'); heading.textContent = entry.title;
      var progressTitle = document.createElement('h4'); progressTitle.textContent = '做了什么';
      var progress = document.createElement('p'); progress.textContent = entry.progress;
      var reflectionTitle = document.createElement('h4'); reflectionTitle.textContent = '当时的想法';
      var reflection = document.createElement('p'); reflection.textContent = entry.reflection;
      body.append(topic, heading, progressTitle, progress, reflectionTitle, reflection);
      article.append(side, body); list.appendChild(article);
    });
  }).catch(function () {
    status.textContent = '学习记录暂时无法载入，请检查网络后刷新。';
    empty.hidden = true;
  });
})();
