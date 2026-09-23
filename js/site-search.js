/* Static, same-origin search index. Only live pages and published post cards are indexed. */
(function () {
  'use strict';
  var form = document.querySelector('.site-search-main');
  if (!form) { return; }
  var input = document.getElementById('main-search-input');
  var status = document.querySelector('[data-site-search-status]');
  var results = document.querySelector('[data-site-search-results]');
  var suggestions = document.querySelector('[data-site-search-suggestions]');
  var sources = [
    { path: 'projects.html', type: '项目总览' },
    { path: 'data-pipeline.html', type: '项目记录' },
    { path: 'law-design.html', type: '项目记录' },
    { path: 'about.html', type: '个人介绍' },
    { path: 'habits.html', type: '工具页面' }
  ];
  var normalize = function (text) { return (text || '').replace(/\s+/g, ' ').trim(); };
  var extract = function (doc) {
    return Array.prototype.map.call(doc.querySelectorAll('main h1, main h2, main h3, main p, main li, main .project-tag, main .project-route span, main .about-chip'), function (el) {
      return normalize(el.textContent);
    }).filter(Boolean);
  };
  var safeHref = function (href) {
    try {
      var url = new URL(href, location.href);
      return url.origin === location.origin && /\.html$/.test(url.pathname) ? url.pathname + url.search + url.hash : null;
    } catch (e) { return null; }
  };
  var fetchDocument = function (path) {
    return fetch(path).then(function (response) {
      if (!response.ok) { throw new Error(path + ': ' + response.status); }
      return response.text();
    }).then(function (html) { return new DOMParser().parseFromString(html, 'text/html'); });
  };
  var indexPromise = Promise.allSettled(sources.map(function (source) {
    return fetchDocument(source.path).then(function (doc) {
      var segments = extract(doc);
      var title = doc.querySelector('h1');
      var desc = doc.querySelector('meta[name="description"]');
      return { href: source.path, type: source.type,
        title: normalize(title ? title.textContent : doc.title),
        description: normalize(desc ? desc.content : ''),
        segments: segments, content: segments.join(' · ') };
    });
  }).concat(fetchDocument('posts.html').then(function (doc) {
    return Array.prototype.map.call(doc.querySelectorAll('[data-post-list] .post-card'), function (card) {
      var link = card.querySelector('h3 a[href]');
      if (!link) { return null; }
      var href = safeHref(link.getAttribute('href'));
      return href ? { href: href, type: '文章', title: normalize(link.textContent),
        description: normalize((card.querySelector('p') || {}).textContent), segments: [normalize(card.textContent)], content: normalize(card.textContent) } : null;
    }).filter(Boolean);
  }))).then(function (settled) {
    var items = [], failed = 0;
    settled.forEach(function (entry) {
      if (entry.status === 'fulfilled') { items = items.concat(entry.value); }
      else { failed++; }
    });
    return { items: items, failed: failed };
  });
  function excerpt(item, query) {
    if (item.description.toLowerCase().includes(query)) { return item.description; }
    var match = item.segments.find(function (segment) {
      return segment.length > 20 && segment.toLowerCase().includes(query);
    });
    if (!match) { return item.description; }
    var pos = match.toLowerCase().indexOf(query);
    if (match.length <= 155) { return match; }
    var start = Math.max(0, pos - 40);
    var end = Math.min(match.length, start + 155);
    return (start ? '…' : '') + match.slice(start, end) + (end < match.length ? '…' : '');
  }
  function show(query, index) {
    results.replaceChildren();
    if (!query) {
      status.textContent = '输入关键词后，查找站内实际内容。';
      suggestions.hidden = false;
      return;
    }
    suggestions.hidden = true;
    if (!index.items.length && index.failed) {
      status.textContent = '搜索内容暂时无法载入，请检查网络后刷新页面重试。也可以从下方直接前往相关页面。';
      suggestions.hidden = false;
      return;
    }
    var needle = query.toLowerCase();
    var found = index.items.filter(function (item) {
      return (item.title + ' ' + item.description + ' ' + item.content).toLowerCase().includes(needle);
    }).sort(function (a, b) {
      var score = function (item) {
        return (item.title.toLowerCase().includes(needle) ? 4 : 0) +
          (item.description.toLowerCase().includes(needle) ? 2 : 0);
      };
      return score(b) - score(a);
    });
    suggestions.hidden = !!found.length;
    status.textContent = found.length
      ? '「' + query + '」找到 ' + found.length + ' 个页面' + (index.failed ? '；部分页面暂时无法载入' : '')
      : '没有找到「' + query + '」' + (index.failed ? '；部分页面暂时无法载入，请稍后重试。' : '，可以换个关键词试试。');
    found.forEach(function (item) {
      var card = document.createElement('article');
      card.className = 'site-search-result';
      var type = document.createElement('span'); type.className = 'search-result-type'; type.textContent = item.type;
      var title = document.createElement('h3');
      var link = document.createElement('a'); link.href = item.href; link.textContent = item.title;
      title.appendChild(link);
      var desc = document.createElement('p'); desc.textContent = excerpt(item, needle);
      card.append(type, title, desc);
      results.appendChild(card);
    });
  }
  var current = '';
  try { current = new URL(location.href).searchParams.get('s') || ''; } catch (e) {}
  input.value = current;
  status.textContent = '正在查找站内内容…';
  indexPromise.then(function (index) {
    function run(updateUrl) {
      current = input.value.trim();
      if (updateUrl && history.replaceState) {
        var url = new URL(location.href);
        if (current) { url.searchParams.set('s', current); } else { url.searchParams.delete('s'); }
        history.replaceState(null, '', url.pathname + url.search);
      }
      show(current, index);
    }
    var timer;
    input.addEventListener('input', function () {
      clearTimeout(timer);
      timer = setTimeout(function () { run(true); }, 140);
    });
    form.addEventListener('submit', function (e) { e.preventDefault(); clearTimeout(timer); run(true); });
    window.addEventListener('popstate', function () {
      input.value = new URL(location.href).searchParams.get('s') || '';
      run(false);
    });
    run(false);
  });
})();
