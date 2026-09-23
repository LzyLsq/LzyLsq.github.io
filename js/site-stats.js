/* A content inventory, not a visitor counter. Every number is read from
   published pages; a failed request never becomes a misleading zero. */
(function () {
  'use strict';
  var header = document.querySelector('.header-actions');
  if (!header || !window.fetch || !window.DOMParser) { return; }

  var trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'header-action stats-trigger';
  trigger.setAttribute('aria-label', '查看本站数据');
  trigger.setAttribute('aria-haspopup', 'dialog');
  trigger.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 20h18M6 16v-5m6 5V4m6 12V8"/><circle cx="6" cy="9" r="1"/><circle cx="18" cy="6" r="1"/></svg><span>本站数据</span>';
  header.insertBefore(trigger, header.firstChild);

  var modal = document.createElement('div');
  modal.className = 'inventory-modal';
  modal.hidden = true;
  modal.innerHTML = '<div class="inventory-backdrop" data-close></div>' +
    '<section class="inventory-dialog" role="dialog" aria-modal="true" aria-labelledby="inventory-title" tabindex="-1">' +
    '<header class="inventory-heading"><div><span class="inventory-kicker">RYAN / SITE INDEX</span><h2 id="inventory-title">本站数据</h2><p>这里展示本站公开内容的实时清单，不是访问量统计。</p></div>' +
    '<button class="inventory-close" type="button" data-close aria-label="关闭本站数据">×</button></header>' +
    '<div class="inventory-content"><p class="inventory-status" role="status" aria-live="polite">正在读取站点内容…</p></div>' +
    '<footer class="inventory-footnote">数据来自本站的项目页与文章页；没有接入访客追踪，也不会估算阅读量。</footer>' +
    '</section>';
  document.body.appendChild(modal);
  var dialog = modal.querySelector('.inventory-dialog');
  var content = modal.querySelector('.inventory-content');
  var lastFocus = null;
  var requestId = 0;

  function getDoc(path) {
    return fetch(path, { cache: 'no-cache' }).then(function (res) {
      if (!res.ok) { throw new Error('HTTP ' + res.status); }
      return res.text();
    }).then(function (html) { return new DOMParser().parseFromString(html, 'text/html'); });
  }
  function readInventory() {
    return Promise.all([getDoc('projects.html'), getDoc('posts.html')]).then(function (docs) {
      var projectCards = Array.from(docs[0].querySelectorAll('.project-overview-grid .project-card'));
      var postCards = Array.from(docs[1].querySelectorAll('[data-post-list] .post-card'));
      var routes = Array.from(docs[0].querySelectorAll('.project-overview-grid .project-route span'))
        .map(function (node) { return node.textContent.trim(); }).filter(Boolean);
      var projectRoutes = projectCards.map(function (card, index) {
        var title = card.querySelector('.project-title');
        return { label: '项目 ' + String(index + 1).padStart(2, '0'), title: title ? title.textContent.trim() : '项目',
          count: card.querySelectorAll('.project-route span').length };
      });
      return { projects: projectCards.length, posts: postCards.length,
        routes: Array.from(new Set(routes)), projectRoutes: projectRoutes };
    });
  }
  function element(tag, className, text) {
    var el = document.createElement(tag);
    el.className = className;
    el.textContent = text;
    return el;
  }
  function makeChart(title, entries, note) {
    var section = element('section', 'inventory-section inventory-chart-section', '');
    section.append(element('h3', '', title));
    var ns = 'http://www.w3.org/2000/svg';
    function svgNode(tag, attrs, text) {
      var node = document.createElementNS(ns, tag);
      Object.keys(attrs).forEach(function (key) { node.setAttribute(key, attrs[key]); });
      if (text !== undefined) { node.textContent = text; }
      return node;
    }
    var chart = svgNode('svg', { class: 'inventory-chart', viewBox: '0 0 440 188', role: 'img',
      'aria-label': title + '：' + entries.map(function (entry) { return entry.label + ' ' + entry.value; }).join('，') });
    var max = Math.max(1, ...entries.map(function (entry) { return entry.value; }));
    var scale = Math.max(2, max);
    var plotX = 114, plotWidth = 294;
    [0, .5, 1].forEach(function (t) {
      var x = plotX + plotWidth * t;
      chart.append(svgNode('line', { x1: x, x2: x, y1: 18, y2: 137, class: 'inventory-chart-grid' }));
      chart.append(svgNode('text', { x: x, y: 163, class: 'inventory-chart-tick', 'text-anchor': 'middle' }, String(Math.round(scale * t))));
    });
    entries.forEach(function (entry, index) {
      var y = 24 + index * 63;
      var group = svgNode('g', { class: 'inventory-chart-row' });
      group.append(svgNode('title', {}, (entry.title || entry.label) + '：' + entry.value));
      group.append(svgNode('text', { x: 4, y: y + 22, class: 'inventory-chart-label' }, entry.label));
      group.append(svgNode('rect', { x: plotX, y: y, width: plotWidth, height: 31, class: 'inventory-chart-track' }));
      if (entry.value > 0) {
        group.append(svgNode('rect', { x: plotX, y: y, width: plotWidth * entry.value / scale,
          height: 31, class: 'inventory-chart-fill inventory-chart-fill-' + (index % 2) }));
      } else {
        group.append(svgNode('line', { x1: plotX + 2, x2: plotX + 2, y1: y + 3, y2: y + 28,
          class: 'inventory-chart-zero' }));
      }
      group.append(svgNode('text', { x: 432, y: y + 22, 'text-anchor': 'end', class: 'inventory-chart-value' }, String(entry.value)));
      chart.append(group);
    });
    section.append(chart, element('p', 'inventory-chart-note', note));
    return section;
  }
  function render(data) {
    content.replaceChildren();
    var counts = element('div', 'inventory-counts', '');
    [['项目记录', data.projects, 'projects.html'], ['正式文章', data.posts, 'posts.html']].forEach(function (entry) {
      var card = document.createElement('a');
      card.className = 'inventory-count'; card.href = entry[2];
      card.append(element('span', 'inventory-count-number', String(entry[1])), element('span', 'inventory-count-label', entry[0] + ' ↗'));
      counts.append(card);
    });
    content.append(counts);
    /* Graphs use only counts derived from the currently published pages. */
    content.append(makeChart('公开内容数量', [
      { label: '项目记录', value: data.projects }, { label: '正式文章', value: data.posts }
    ], '项目页与文章页的实际卡片数量；0 表示当前没有正式文章。'));
    if (data.projectRoutes.length) {
      content.append(makeChart('项目流程节点', data.projectRoutes.map(function (route) {
        return { label: route.label, value: route.count, title: route.title };
      }), '节点数只计算项目总览卡中的流程标签，不是工作量或访问量。'));
    }
    var routeSection = element('section', 'inventory-section', '');
    routeSection.append(element('h3', '', '项目页提到的路径节点'));
    if (data.routes.length) {
      var list = element('div', 'inventory-route-list', '');
      data.routes.forEach(function (name) { list.append(element('span', 'inventory-route-chip', name)); });
      routeSection.append(list);
    } else { routeSection.append(element('p', 'inventory-muted', '还没有填写项目路径。')); }
    content.append(routeSection);
    if (!data.posts) { content.append(element('p', 'inventory-muted', '文章尚未正式发布；发布后这里会从文章列表自动更新。')); }
  }
  function close() {
    if (modal.hidden) { return; }
    modal.hidden = true;
    requestId++;
    document.body.classList.remove('inventory-open');
    if (lastFocus && lastFocus.isConnected) { lastFocus.focus(); }
  }
  function open() {
    lastFocus = document.activeElement;
    modal.hidden = false;
    document.body.classList.add('inventory-open');
    dialog.focus();
    var thisRequest = ++requestId;
    content.replaceChildren(element('p', 'inventory-status', '正在读取站点内容…'));
    readInventory().then(function (data) {
      if (!modal.hidden && thisRequest === requestId) { render(data); }
    }).catch(function () {
      if (!modal.hidden && thisRequest === requestId) {
        content.replaceChildren(element('p', 'inventory-error', '暂时无法读取项目或文章页面。请检查网络后重试。'));
      }
    });
  }
  trigger.addEventListener('click', open);
  modal.querySelectorAll('[data-close]').forEach(function (node) { node.addEventListener('click', close); });
  document.addEventListener('keydown', function (event) {
    if (modal.hidden) { return; }
    if (event.key === 'Escape') { close(); return; }
    if (event.key !== 'Tab') { return; }
    var focusables = Array.from(dialog.querySelectorAll('button, a[href]'));
    if (!focusables.length) { event.preventDefault(); return; }
    var first = focusables[0], last = focusables[focusables.length - 1];
    if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
      event.preventDefault(); last.focus();
    } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog)) {
      event.preventDefault(); first.focus();
    }
  });
})();
