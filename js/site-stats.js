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
    '<div class="inventory-feedback" role="status" aria-live="polite"></div>' +
    '<div class="inventory-content"><p class="inventory-status">正在读取站点内容…</p></div>' +
    '<footer class="inventory-footnote">数据来自本站的项目页、文章页及公开学习记录；没有接入访客追踪，也不会估算阅读量。</footer>' +
    '</section>';
  document.body.appendChild(modal);
  var dialog = modal.querySelector('.inventory-dialog');
  var content = modal.querySelector('.inventory-content');
  var feedback = modal.querySelector('.inventory-feedback');
  var lastFocus = null;
  var requestId = 0;
  var countFrame = 0;
  var chartFrame = 0;
  var closeTimer = 0;
  var savedData = null;

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
      // Only count a technology once per published project detail, even if a
      // page mentions it repeatedly in prose or code snippets.
      var detailPaths = projectCards.map(function (card) {
        var link = card.querySelector('.project-title a[href]');
        return link && link.getAttribute('href');
      }).filter(function (path) { return path && /^[a-z0-9-]+\.html$/i.test(path); });
      return Promise.all(detailPaths.map(getDoc)).then(function (details) {
        var technologies = new Map();
        details.forEach(function (detail) {
          var names = new Set(Array.from(detail.querySelectorAll('.detail-stack .project-stack .project-tag'))
            .map(function (node) { return node.textContent.trim(); }).filter(Boolean));
          names.forEach(function (name) { technologies.set(name, (technologies.get(name) || 0) + 1); });
        });
        return { projects: projectCards.length, posts: postCards.length, learning: docs[2].entries.length,
          routes: Array.from(new Set(routes)), projectRoutes: projectRoutes,
          technologies: Array.from(technologies, function (entry) { return { label: entry[0], value: entry[1] }; }) };
      });
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
  function makePie(entries, title, note) {
    var section = element('section', 'inventory-section inventory-pie-section', '');
    section.append(element('h3', '', title));
    var total = entries.reduce(function (sum, item) { return sum + item.value; }, 0);
    var ns = 'http://www.w3.org/2000/svg';
    var pie = document.createElementNS(ns, 'svg');
    pie.setAttribute('class', 'inventory-pie');
    pie.setAttribute('viewBox', '0 0 240 240');
    pie.setAttribute('role', 'img');
    pie.setAttribute('aria-label', total ? title + '：' + entries.map(function (item) {
      return item.label + ' ' + item.value + ' 次，占 ' + (item.value * 100 / total).toFixed(1) + '%';
    }).join('，') : '暂无项目技术标签');
    if (!total) {
      var empty = document.createElementNS(ns, 'circle');
      empty.setAttribute('cx', '120'); empty.setAttribute('cy', '120'); empty.setAttribute('r', '106');
      empty.setAttribute('class', 'inventory-pie-empty'); pie.append(empty);
    }
    var offset = 0;
    entries.forEach(function (item, index) {
      if (!item.value || !total) { return; }
      var start = -Math.PI / 2 + offset * Math.PI * 2 / total;
      offset += item.value;
      var end = -Math.PI / 2 + offset * Math.PI * 2 / total;
      var slice = document.createElementNS(ns, 'path');
      slice.setAttribute('class', 'inventory-pie-slice inventory-pie-slice-' + (index % 15));
      var tooltip = document.createElementNS(ns, 'title');
      tooltip.textContent = item.label + '：' + item.value + ' 次（' + (item.value * 100 / total).toFixed(1) + '%）';
      slice.append(tooltip);
      if (item.value === total) {
        slice.setAttribute('d', 'M 120 14 A 106 106 0 1 1 120 226 A 106 106 0 1 1 120 14 Z');
      } else {
        slice.setAttribute('d', 'M 120 120 L ' + (120 + 106 * Math.cos(start)).toFixed(3) + ' ' +
          (120 + 106 * Math.sin(start)).toFixed(3) + ' A 106 106 0 ' +
          (item.value / total > .5 ? 1 : 0) + ' 1 ' + (120 + 106 * Math.cos(end)).toFixed(3) + ' ' +
          (120 + 106 * Math.sin(end)).toFixed(3) + ' Z');
      }
      pie.append(slice);
    });
    var figure = element('div', 'inventory-pie-figure', ''); figure.append(pie);
    var legend = element('div', 'inventory-pie-legend', '');
    legend.append(element('p', 'inventory-pie-total', entries.length + ' 项技术 · ' + total + ' 次列出'));
    var list = element('ul', 'inventory-pie-keys', '');
    entries.forEach(function (item, index) {
      var li = element('li', 'inventory-pie-key inventory-pie-key-' + (index % 15), '');
      li.append(element('span', 'inventory-pie-label', item.label),
        element('strong', '', item.value + ' 次 · ' + (total ? (item.value * 100 / total).toFixed(1) : '0.0') + '%'));
      list.append(li);
    });
    legend.append(list);
    var layout = element('div', 'inventory-pie-layout', ''); layout.append(figure, legend);
    section.append(layout, element('p', 'inventory-chart-note', note));
    return section;
  }
  function makeRadar(data) {
    var section = element('section', 'inventory-section inventory-radar-section', '');
    section.append(element('h3', '', '项目技术类型雷达图'));
    var figure = element('div', 'inventory-radar-figure', '');
    section.append(figure);
    var ns = 'http://www.w3.org/2000/svg';
    function svgNode(tag, attrs, text) {
      var node = document.createElementNS(ns, tag);
      Object.keys(attrs).forEach(function (key) { node.setAttribute(key, attrs[key]); });
      if (text !== undefined) { node.textContent = text; }
      return node;
    }
    function draw() {
      // Explicit, inspectable grouping of tags that actually appear in the
      // published project details. New tags are shown under “其他” until mapped.
      var groups = [
        { label: '编程语言', names: ['Python', 'Scala', 'TypeScript'] },
        { label: '采集接入', names: ['Flume', 'Sqoop'] },
        { label: '流处理', names: ['Kafka', 'Spark Streaming'] },
        { label: '数据存储', names: ['Hive', 'HDFS', 'MySQL'] },
        { label: '服务与检索', names: ['Flask', 'FastAPI', 'GraphRAG'] },
        { label: '界面呈现', names: ['React', 'ECharts'] }
      ];
      var known = new Set(groups.flatMap(function (group) { return group.names; }));
      var entries = groups.map(function (group) {
        return { label: group.label, value: data.technologies.filter(function (item) {
          return group.names.indexOf(item.label) !== -1;
        }).reduce(function (sum, item) { return sum + item.value; }, 0) };
      });
      var other = data.technologies.filter(function (item) { return !known.has(item.label); });
      if (other.length) {
        entries.push({ label: '其他', value: other.reduce(function (sum, item) { return sum + item.value; }, 0) });
      }
      figure.classList.remove('is-drawn');
      figure.replaceChildren();
      if (!data.technologies.length) {
        figure.append(element('p', 'inventory-muted', '项目详情页尚未列出技术标签。'));
        return;
      }
      var max = Math.max(1, ...entries.map(function (entry) { return entry.value; }));
      var centerX = 270, centerY = 178, radius = 110;
      var chart = svgNode('svg', { class: 'inventory-radar', viewBox: '0 0 540 360', role: 'img',
        'aria-label': '各技术类型在项目详情页列出的次数：' +
          entries.map(function (entry) { return entry.label + ' ' + entry.value; }).join('，') });
      function point(index, fraction) {
        var angle = -Math.PI / 2 + index * Math.PI * 2 / entries.length;
        return [centerX + radius * fraction * Math.cos(angle), centerY + radius * fraction * Math.sin(angle)];
      }
      function points(fraction) {
        return entries.map(function (_, index) { return point(index, fraction).map(function (v) { return v.toFixed(1); }).join(','); }).join(' ');
      }
      [.25, .5, .75, 1].forEach(function (fraction) {
        chart.append(svgNode('polygon', { points: points(fraction), class: 'inventory-radar-ring' }));
      });
      entries.forEach(function (entry, index) {
        var edge = point(index, 1), label = point(index, 1.34);
        chart.append(svgNode('line', { x1: centerX, y1: centerY, x2: edge[0], y2: edge[1], class: 'inventory-radar-axis' }));
        var text = svgNode('text', { x: label[0], y: label[1] - 6, class: 'inventory-radar-label',
          'text-anchor': label[0] < centerX - 20 ? 'end' : label[0] > centerX + 20 ? 'start' : 'middle' });
        text.append(svgNode('tspan', { x: label[0] }, entry.label));
        text.append(svgNode('tspan', { x: label[0], dy: 18, class: 'inventory-radar-value' }, String(entry.value)));
        chart.append(text);
      });
      var plot = svgNode('g', { class: 'inventory-radar-data' });
      plot.append(svgNode('polygon', { points: entries.map(function (entry, index) {
        return point(index, entry.value / max).map(function (v) { return v.toFixed(1); }).join(',');
      }).join(' '), class: 'inventory-radar-shape' }));
      entries.forEach(function (entry, index) {
        var pos = point(index, entry.value / max);
        plot.append(svgNode('circle', { cx: pos[0], cy: pos[1], r: 4, class: 'inventory-radar-dot' }));
      });
      chart.append(plot);
      var note = '按项目详情页“涉及的技术”标签归类；同一项目同一技术只计一次，刻度 0–' + max +
        '。这是项目用到的技术类型分布，不是能力评分。' +
        (other.length ? '其他：' + other.map(function (item) { return item.label; }).join('、') + '。' : '');
      var values = element('ul', 'inventory-radar-values', '');
      entries.forEach(function (entry) {
        var item = document.createElement('li');
        item.append(element('span', '', entry.label), element('strong', '', String(entry.value)));
        values.append(item);
      });
      figure.append(chart, values, element('p', 'inventory-chart-note', note));
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        figure.classList.add('is-drawn');
      } else {
        requestAnimationFrame(function () {
          if (figure.isConnected) { figure.classList.add('is-drawn'); }
        });
      }
    }
    draw();
    return section;
  }
  function animateCharts() {
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var numbers = Array.from(content.querySelectorAll('.inventory-animated-number'));
    if (reduced) {
      numbers.forEach(function (node) { node.textContent = node.dataset.target; });
      content.classList.add('is-drawn');
      return;
    }
    chartFrame = requestAnimationFrame(function () {
      if (modal.hidden || !modal.classList.contains('is-open')) { return; }
      content.classList.add('is-drawn');
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
    content.append(makeRadar(data));
    var technologyCounts = data.technologies.slice().sort(function (a, b) { return b.value - a.value; });
    content.append(makePie(technologyCounts, '项目技术标签占比',
      '列出每一种已公开的技术标签；每个项目对同一技术只计一次。扇区表示技术标签在项目详情页的出现次数占比，不代表代码量或技能熟练度。'));
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
  function stopAnimation() {
    cancelAnimationFrame(chartFrame);
    cancelAnimationFrame(countFrame);
  }
  function finishCharts() {
    stopAnimation();
    content.querySelectorAll('.inventory-animated-number').forEach(function (node) { node.textContent = node.dataset.target; });
    content.classList.add('is-drawn');
  }
  function close() {
    if (modal.hidden || !modal.classList.contains('is-open')) { return; }
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    dialog.inert = true;
    requestId++;
    finishCharts();
    document.body.classList.remove('inventory-open');
    if (lastFocus && lastFocus.isConnected) { lastFocus.focus(); }
    clearTimeout(closeTimer);
    closeTimer = setTimeout(function () {
      if (!modal.classList.contains('is-open')) { modal.hidden = true; }
    }, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 480);
  }
  function loadInventory() {
    var thisRequest = ++requestId;
    if (savedData) {
      feedback.textContent = '正在更新公开内容；当前显示上次读取的清单。';
    } else {
      content.setAttribute('aria-busy', 'true');
      content.replaceChildren(element('p', 'inventory-status', '正在读取站点内容…'));
    }
    readInventory().then(function (data) {
      if (modal.hidden || !modal.classList.contains('is-open') || thisRequest !== requestId) { return; }
      var changed = !savedData || JSON.stringify(savedData) !== JSON.stringify(data);
      content.removeAttribute('aria-busy');
      if (changed) { stopAnimation(); render(data); }
      savedData = data;
      feedback.textContent = '';
    }).catch(function () {
      if (modal.hidden || !modal.classList.contains('is-open') || thisRequest !== requestId) { return; }
      content.removeAttribute('aria-busy');
      feedback.textContent = savedData ? '更新失败，当前显示上次读取的清单。' : '';
      var error = element('p', 'inventory-error', savedData ? '暂时无法更新公开内容。' : '暂时无法读取或展示公开内容。请检查网络后重试。');
      error.setAttribute('role', 'alert');
      var retry = element('button', 'inventory-retry', '重新读取');
      retry.type = 'button';
      retry.addEventListener('click', loadInventory);
      if (savedData) {
        feedback.replaceChildren(document.createTextNode('更新失败，当前显示上次读取的清单。 '), retry);
      } else {
        content.replaceChildren(error, retry);
      }
      retry.focus();
    });
  }
  function open() {
    if (modal.classList.contains('is-open')) { return; }
    clearTimeout(closeTimer);
    lastFocus = document.activeElement;
    modal.hidden = false;
    // The dialog opens from the header button and folds back into it.
    var buttonRect = trigger.getBoundingClientRect();
    modal.style.setProperty('--inventory-from-x', (buttonRect.left + buttonRect.width / 2 - innerWidth / 2) + 'px');
    modal.style.setProperty('--inventory-from-y', (buttonRect.top + buttonRect.height / 2 - innerHeight / 2) + 'px');
    modal.removeAttribute('aria-hidden');
    dialog.inert = false;
    document.body.classList.add('inventory-open');
    // Force a layout before changing the state so rapid close/reopen keeps transitioning.
    void modal.offsetWidth;
    modal.classList.add('is-open');
    dialog.focus({ preventScroll: true });
    loadInventory();
  }
  trigger.addEventListener('click', open);
  modal.querySelectorAll('[data-close]').forEach(function (node) { node.addEventListener('click', close); });
  document.addEventListener('keydown', function (event) {
    if (modal.hidden || !modal.classList.contains('is-open')) { return; }
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
