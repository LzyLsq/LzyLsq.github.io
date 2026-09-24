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
    '<footer class="inventory-footnote">数据来自本站的项目页、文章页及公开学习记录；没有接入访客追踪，也不会估算阅读量。</footer>' +
    '</section>';
  document.body.appendChild(modal);
  var dialog = modal.querySelector('.inventory-dialog');
  var content = modal.querySelector('.inventory-content');
  var lastFocus = null;
  var requestId = 0;
  var countFrame = 0;

  function getDoc(path) {
    return fetch(path, { cache: 'no-cache' }).then(function (res) {
      if (!res.ok) { throw new Error('HTTP ' + res.status); }
      return res.text();
    }).then(function (html) { return new DOMParser().parseFromString(html, 'text/html'); });
  }
  function readInventory() {
    return Promise.all([getDoc('projects.html'), getDoc('posts.html'), fetch('data/learning.json', { cache: 'no-cache' }).then(function (res) {
      if (!res.ok) { throw new Error('HTTP ' + res.status); }
      return res.json();
    })]).then(function (docs) {
      if (!docs[2] || !Array.isArray(docs[2].entries)) { throw new Error('学习记录格式错误'); }
      var projectCards = Array.from(docs[0].querySelectorAll('.project-overview-grid .project-card'));
      var postCards = Array.from(docs[1].querySelectorAll('[data-post-list] .post-card'));
      var routes = Array.from(docs[0].querySelectorAll('.project-overview-grid .project-route span'))
        .map(function (node) { return node.textContent.trim(); }).filter(Boolean);
      var projectRoutes = projectCards.map(function (card, index) {
        var title = card.querySelector('.project-title');
        return { label: '项目 ' + String(index + 1).padStart(2, '0'), title: title ? title.textContent.trim() : '项目',
          count: card.querySelectorAll('.project-route span').length };
      });
      return { projects: projectCards.length, posts: postCards.length, learning: docs[2].entries.length,
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
    var chart = svgNode('svg', { class: 'inventory-chart', viewBox: '0 0 440 ' + Math.max(188, entries.length * 63 + 55), role: 'img',
      'aria-label': title + '：' + entries.map(function (entry) { return entry.label + ' ' + entry.value; }).join('，') });
    var max = Math.max(1, ...entries.map(function (entry) { return entry.value; }));
    var scale = Math.max(2, max);
    var plotX = 114, plotWidth = 294;
    [0, .5, 1].forEach(function (t) {
      var x = plotX + plotWidth * t;
      chart.append(svgNode('line', { x1: x, x2: x, y1: 18, y2: entries.length * 63 + 20, class: 'inventory-chart-grid' }));
      chart.append(svgNode('text', { x: x, y: entries.length * 63 + 45, class: 'inventory-chart-tick', 'text-anchor': 'middle' }, String(Math.round(scale * t))));
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
  function makeDonut(entries) {
    var section = element('section', 'inventory-section inventory-donut-section', '');
    section.append(element('h3', '', '公开内容占比'));
    var total = entries.reduce(function (sum, item) { return sum + item.value; }, 0);
    var ns = 'http://www.w3.org/2000/svg';
    var ring = document.createElementNS(ns, 'svg');
    ring.setAttribute('class', 'inventory-donut');
    ring.setAttribute('viewBox', '0 0 240 240');
    ring.setAttribute('role', 'img');
    ring.setAttribute('aria-label', total ? entries.map(function (item) { return item.label + ' ' + item.value; }).join('，') : '暂无已发布内容');
    var track = document.createElementNS(ns, 'circle');
    track.setAttribute('class', 'inventory-donut-track');
    track.setAttribute('cx', '120'); track.setAttribute('cy', '120'); track.setAttribute('r', '88');
    ring.append(track);
    var perimeter = 2 * Math.PI * 88, offset = 0;
    entries.forEach(function (item, index) {
      if (!item.value || !total) { return; }
      var slice = document.createElementNS(ns, 'circle');
      slice.setAttribute('class', 'inventory-donut-slice inventory-donut-slice-' + index);
      slice.setAttribute('cx', '120'); slice.setAttribute('cy', '120'); slice.setAttribute('r', '88');
      slice.setAttribute('stroke-dasharray', '0 ' + perimeter);
      slice.setAttribute('stroke-dashoffset', String(-offset));
      slice.dataset.target = String(perimeter * item.value / total);
      slice.dataset.perimeter = String(perimeter);
      offset += perimeter * item.value / total;
      ring.append(slice);
    });
    var center = element('div', 'inventory-donut-center', '');
    var number = element('strong', 'inventory-animated-number', '0'); number.dataset.target = String(total);
    center.append(number, element('span', '', '条公开内容'));
    var figure = element('div', 'inventory-donut-figure', ''); figure.append(ring, center);
    var list = element('ul', 'inventory-donut-legend', '');
    entries.forEach(function (item, index) {
      var li = document.createElement('li'); li.className = 'inventory-donut-key inventory-donut-key-' + index;
      li.append(element('span', 'inventory-donut-label', item.label), element('strong', '', String(item.value)));
      list.append(li);
    });
    var layout = element('div', 'inventory-donut-layout', ''); layout.append(figure, list);
    section.append(layout, element('p', 'inventory-chart-note', '只按已公开的项目、正式文章及学习记录分组；没有内容的分类不绘制扇区。'));
    return section;
  }
  function animateCharts() {
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var numbers = Array.from(content.querySelectorAll('.inventory-animated-number'));
    var slices = Array.from(content.querySelectorAll('.inventory-donut-slice'));
    if (reduced) {
      numbers.forEach(function (node) { node.textContent = node.dataset.target; });
      slices.forEach(function (node) { node.setAttribute('stroke-dasharray', node.dataset.target + ' ' + node.dataset.perimeter); });
      content.classList.add('is-drawn');
      return;
    }
    requestAnimationFrame(function () {
      if (modal.hidden) { return; }
      content.classList.add('is-drawn');
      slices.forEach(function (node) { node.setAttribute('stroke-dasharray', node.dataset.target + ' ' + node.dataset.perimeter); });
      var started = performance.now();
      function tick(now) {
        if (modal.hidden) { return; }
        var progress = Math.min(1, (now - started) / 850);
        var eased = 1 - Math.pow(1 - progress, 3);
        numbers.forEach(function (node) { node.textContent = String(Math.round(Number(node.dataset.target) * eased)); });
        if (progress < 1) { countFrame = requestAnimationFrame(tick); }
      }
      countFrame = requestAnimationFrame(tick);
    });
  }
  function render(data) {
    content.replaceChildren();
    content.classList.remove('is-drawn');
    var counts = element('div', 'inventory-counts', '');
    [['项目记录', data.projects, 'projects.html'], ['正式文章', data.posts, 'posts.html'], ['学习记录', data.learning, 'learning.html']].forEach(function (entry) {
      var card = document.createElement('a');
      card.className = 'inventory-count'; card.href = entry[2];
      var number = element('span', 'inventory-count-number inventory-animated-number', '0');
      number.dataset.target = String(entry[1]);
      card.append(number, element('span', 'inventory-count-label', entry[0] + ' ↗'));
      counts.append(card);
    });
    content.append(counts);
    /* Graphs use only counts derived from the currently published pages. */
    content.append(makeDonut([
      { label: '项目记录', value: data.projects }, { label: '正式文章', value: data.posts }, { label: '学习记录', value: data.learning }
    ]));
    content.append(makeChart('公开内容数量', [
      { label: '项目记录', value: data.projects }, { label: '正式文章', value: data.posts }, { label: '学习记录', value: data.learning }
    ], '项目页与文章页的实际卡片数，以及已公开的学习记录数；没有发布则为 0。'));
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
    content.append(element('p', 'inventory-chart-note', '数字从 0 展示只是入场动画，不表示历史涨幅。'));
    animateCharts();
  }
  function close() {
    if (modal.hidden) { return; }
    modal.hidden = true;
    requestId++;
    cancelAnimationFrame(countFrame);
    document.body.classList.remove('inventory-open');
    if (lastFocus && lastFocus.isConnected) { lastFocus.focus(); }
  }
  function loadInventory() {
    var thisRequest = ++requestId;
    content.setAttribute('aria-busy', 'true');
    content.replaceChildren(element('p', 'inventory-status', '正在读取站点内容…'));
    dialog.focus(); // Retrying removes the clicked button; keep keyboard focus inside the dialog.
    readInventory().then(function (data) {
      if (modal.hidden || thisRequest !== requestId) { return; }
      content.removeAttribute('aria-busy');
      render(data);
    }).catch(function () {
      if (modal.hidden || thisRequest !== requestId) { return; }
      content.removeAttribute('aria-busy');
      var error = element('p', 'inventory-error', '暂时无法读取项目、文章或学习记录。请检查网络后重试。');
      error.setAttribute('role', 'alert');
      var retry = element('button', 'inventory-retry', '重新读取');
      retry.type = 'button';
      retry.addEventListener('click', loadInventory);
      content.replaceChildren(error, retry);
      retry.focus();
    });
  }
  function open() {
    lastFocus = document.activeElement;
    modal.hidden = false;
    document.body.classList.add('inventory-open');
    dialog.focus();
    loadInventory();
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
