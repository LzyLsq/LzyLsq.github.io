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
    '</section><div class="inventory-tooltip" aria-hidden="true" hidden></div>';
  document.body.appendChild(modal);
  var dialog = modal.querySelector('.inventory-dialog');
  var content = modal.querySelector('.inventory-content');
  var feedback = modal.querySelector('.inventory-feedback');
  var tooltip = modal.querySelector('.inventory-tooltip');
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
      var detailEntries = projectCards.map(function (card, index) {
        var link = card.querySelector('.project-title a[href]');
        return { card: card, route: projectRoutes[index], path: link && link.getAttribute('href') };
      }).filter(function (entry) { return entry.path && /^[a-z0-9-]+\.html$/i.test(entry.path); });
      return Promise.all(detailEntries.map(function (entry) { return getDoc(entry.path); })).then(function (details) {
        var technologies = new Map();
        details.forEach(function (detail) {
          var names = new Set(Array.from(detail.querySelectorAll('.detail-stack .project-stack .project-tag'))
            .map(function (node) { return node.textContent.trim(); }).filter(Boolean));
          names.forEach(function (name) { technologies.set(name, (technologies.get(name) || 0) + 1); });
        });
        var materials = details.map(function (detail, index) {
          var entry = detailEntries[index];
          var source = entry.card.querySelector('.project-actions a[href^="https://github.com/"]');
          return { title: entry.route.title, path: entry.path,
            gallery: detail.querySelectorAll('.project-gallery-grid figure').length,
            excerpts: detail.querySelectorAll('.project-source .source-card').length,
            steps: detail.querySelectorAll('.detail-route .route-steps li').length,
            modules: detail.querySelectorAll('.detail-grid .detail-panel:not(.detail-caveat)').length,
            source: source ? source.href : '' };
        });
        return { projects: projectCards.length, posts: postCards.length, learning: docs[2].entries.length,
          routes: Array.from(new Set(routes)), projectRoutes: projectRoutes, materials: materials,
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
      group.setAttribute('data-chart-tip', (entry.title || entry.label) + '：' + entry.value + ' 个');
      group.setAttribute('tabindex', '0');
      group.setAttribute('aria-label', group.dataset.chartTip);
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
      slice.setAttribute('data-chart-tip', item.label + '：' + item.value + ' 次 · ' + (item.value * 100 / total).toFixed(1) + '%');
      slice.setAttribute('tabindex', '0');
      slice.setAttribute('role', 'img');
      slice.setAttribute('aria-label', slice.dataset.chartTip);
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
    list.id = 'inventory-pie-keys';
    var visibleEntries = 6;
    if (entries.length > visibleEntries) { list.classList.add('is-collapsed'); }
    entries.forEach(function (item, index) {
      var li = element('li', 'inventory-pie-key inventory-pie-key-' + (index % 15), '');
      li.dataset.chartTip = item.label + '：' + item.value + ' 次 · ' + (total ? (item.value * 100 / total).toFixed(1) : '0.0') + '%';
      li.append(element('span', 'inventory-pie-label', item.label),
        element('strong', '', item.value + ' 次 · ' + (total ? (item.value * 100 / total).toFixed(1) : '0.0') + '%'));
      list.append(li);
    });
    legend.append(list);
    if (entries.length > visibleEntries) {
      var toggle = element('button', 'inventory-pie-toggle', '展开全部 ' + entries.length + ' 项技术');
      toggle.type = 'button';
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-controls', list.id);
      toggle.addEventListener('click', function () {
        var expanded = toggle.getAttribute('aria-expanded') === 'true';
        toggle.setAttribute('aria-expanded', String(!expanded));
        list.classList.toggle('is-collapsed', expanded);
        toggle.textContent = expanded ? '展开全部 ' + entries.length + ' 项技术' : '收起技术明细';
      });
      legend.append(toggle);
    }
    var layout = element('div', 'inventory-pie-layout', ''); layout.append(figure, legend);
    section.append(layout, element('p', 'inventory-chart-note', note));
    return section;
  }
  function makeMaterialsRadar(data) {
    var section = element('section', 'inventory-section inventory-materials-section', '');
    section.append(element('h3', '', '项目公开资料雷达图'));
    if (!data.materials.length) {
      section.append(element('p', 'inventory-muted', '还没有可展示的项目资料。'));
      return section;
    }
    // Every axis is a count of published items, not a self-rated ability score.
    var axes = [
      { label: '界面截图', key: 'gallery', unit: '张' },
      { label: '代码节选', key: 'excerpts', unit: '段' },
      { label: '流程节点', key: 'steps', unit: '个' },
      { label: '模块说明', key: 'modules', unit: '块' },
      { label: '源码入口', key: 'source', unit: '个' }
    ];
    var ns = 'http://www.w3.org/2000/svg';
    function svgNode(tag, attrs, text) {
      var node = document.createElementNS(ns, tag);
      Object.keys(attrs).forEach(function (key) { node.setAttribute(key, attrs[key]); });
      if (text !== undefined) { node.textContent = text; }
      return node;
    }
    function value(project, axis) { return axis.key === 'source' ? Number(Boolean(project.source)) : project[axis.key]; }
    var max = Math.max(1, ...data.materials.flatMap(function (project) {
      return axes.map(function (axis) { return value(project, axis); });
    }));
    var chart = svgNode('svg', { class: 'inventory-material-radar', viewBox: '0 0 540 390', role: 'img',
      'aria-label': '项目公开资料雷达图。' + data.materials.map(function (project) {
        return project.title + '：' + axes.map(function (axis) { return axis.label + ' ' + value(project, axis) + axis.unit; }).join('，');
      }).join('；') });
    var centerX = 270, centerY = 189, radius = 112;
    function point(index, fraction) {
      var angle = -Math.PI / 2 + index * Math.PI * 2 / axes.length;
      return [centerX + radius * fraction * Math.cos(angle), centerY + radius * fraction * Math.sin(angle)];
    }
    function points(fraction) {
      return axes.map(function (_, index) { return point(index, fraction).map(function (number) { return number.toFixed(1); }).join(','); }).join(' ');
    }
    [.25, .5, .75, 1].forEach(function (fraction) {
      chart.append(svgNode('polygon', { points: points(fraction), class: 'inventory-material-ring' }));
    });
    axes.forEach(function (axis, index) {
      var edge = point(index, 1), label = point(index, 1.32);
      chart.append(svgNode('line', { x1: centerX, y1: centerY, x2: edge[0], y2: edge[1], class: 'inventory-material-axis' }));
      chart.append(svgNode('text', { x: label[0], y: label[1] + 4, class: 'inventory-material-axis-label',
        'text-anchor': label[0] < centerX - 20 ? 'end' : label[0] > centerX + 20 ? 'start' : 'middle' }, axis.label));
    });
    data.materials.forEach(function (project, index) {
      var series = svgNode('g', { class: 'inventory-material-series inventory-material-series-' + (index % 2) });
      var polygon = svgNode('polygon', { points: axes.map(function (axis, axisIndex) {
        return point(axisIndex, value(project, axis) / max).map(function (number) { return number.toFixed(1); }).join(',');
      }).join(' '), class: 'inventory-material-shape' });
      polygon.setAttribute('data-chart-tip', project.title + '：' + axes.map(function (axis) {
        return axis.label + ' ' + value(project, axis) + axis.unit;
      }).join('，'));
      series.append(polygon);
      axes.forEach(function (axis, axisIndex) {
        var coords = point(axisIndex, value(project, axis) / max);
        var dot = svgNode('circle', { cx: coords[0] + (index ? 4 : -4), cy: coords[1], r: 6,
          class: 'inventory-material-dot', tabindex: '0', role: 'img' });
        dot.dataset.chartTip = project.title + ' · ' + axis.label + '：' + value(project, axis) + ' ' + axis.unit;
        dot.setAttribute('aria-label', dot.dataset.chartTip);
        series.append(dot);
      });
      chart.append(series);
    });
    var legend = element('div', 'inventory-material-legend', '');
    data.materials.forEach(function (project, index) {
      var link = document.createElement('a');
      link.className = 'inventory-material-legend-item inventory-material-series-' + (index % 2);
      link.href = project.path;
      link.textContent = project.title + ' ↗';
      link.dataset.chartTip = '打开 ' + project.title + ' 的项目记录';
      legend.append(link);
    });
    section.append(chart, legend, element('p', 'inventory-chart-note',
      '各轴为详情页实际列出的截图、代码节选、流程节点、模块说明和源码入口数量；共用 0–' + max +
      ' 的统一径向刻度；各维单位见提示。悬停圆点可查看确切数字，不代表项目质量或个人能力。'));
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
    content.append(makeMaterialsRadar(data));
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
    tooltip.hidden = true;
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
  function positionTooltip(x, y) {
    var rect = tooltip.getBoundingClientRect();
    tooltip.style.left = Math.max(10, Math.min(x + 14, innerWidth - rect.width - 10)) + 'px';
    tooltip.style.top = Math.max(10, Math.min(y + 14, innerHeight - rect.height - 10)) + 'px';
  }
  function showTooltip(node, x, y) {
    tooltip.textContent = node.dataset.chartTip;
    tooltip.hidden = false;
    positionTooltip(x, y);
  }
  content.addEventListener('pointerover', function (event) {
    var node = event.target.closest('[data-chart-tip]');
    if (node && event.pointerType !== 'touch') { showTooltip(node, event.clientX, event.clientY); }
  });
  content.addEventListener('pointermove', function (event) {
    if (event.pointerType === 'touch') { return; }
    var node = event.target.closest('[data-chart-tip]');
    if (node) {
      if (tooltip.hidden || tooltip.textContent !== node.dataset.chartTip) {
        showTooltip(node, event.clientX, event.clientY);
      } else { positionTooltip(event.clientX, event.clientY); }
    } else { tooltip.hidden = true; }
  });
  content.addEventListener('pointerout', function (event) {
    if (!event.relatedTarget || !event.relatedTarget.closest('[data-chart-tip]')) { tooltip.hidden = true; }
  });
  content.addEventListener('focusin', function (event) {
    var node = event.target.closest('[data-chart-tip]');
    if (node) {
      var rect = node.getBoundingClientRect();
      showTooltip(node, rect.left + rect.width / 2, rect.top + rect.height / 2);
    }
  });
  content.addEventListener('focusout', function () { tooltip.hidden = true; });
  content.addEventListener('scroll', function () { tooltip.hidden = true; }, { passive: true });
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
