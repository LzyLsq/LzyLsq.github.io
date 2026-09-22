/* ============================================================
   Ryan · 个人主页 交互脚本
   ------------------------------------------------------------
   无任何外部依赖(不需要 jQuery / ECharts / Motion)。
   所有数据都从页面 DOM 推导，不写死任何统计数字。

   可配置项见下方「配置区」。
   ============================================================ */
(function () {
  'use strict';

  /* ============ 配置区 ============ */
  // 站点上线日期，用于页脚「已稳定运行 N 天」
  var SITE_START_DATE = '2026-09-22';
  // 主题记忆 key
  var THEME_KEY = 'fluxgrid-theme';
  // 首页「最新文章」最多显示几篇
  var LATEST_LIMIT = 5;

  /* ============ 工具 ============ */
  var reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  var prefersReduced = function () { return reducedMotionQuery.matches; };
  var on = function (el, type, fn, opts) { if (el) { el.addEventListener(type, fn, opts); } };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var $ = function (sel, root) { return (root || document).querySelector(sel); };

  /* ============ 平台检测：Mac 显示 ⌘，其他显示 Ctrl ============ */
  var ua = navigator.userAgent || '';
  if (/Mac|iPhone|iPad|iPod/i.test(navigator.platform || ua)) {
    document.documentElement.classList.add('is-mac');
  }

  /* ============ 主题(暗色 / 亮色) ============ */
  function initTheme() {
    var root = document.documentElement;
    var toggle = document.getElementById('theme-toggle');
    on(toggle, 'click', function () {
      var next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      applyTheme(next);
    });
  }
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem(THEME_KEY, theme); } catch (e) {}
    document.dispatchEvent(new CustomEvent('fluxgrid:themechange', { detail: { theme: theme } }));
  }

  /* ============ 导航(移动端菜单 / 当前页高亮 / 平滑→即时跳转) ============ */
  function initNav() {
    var toggle = document.querySelector('.nav-toggle');
    var nav = document.getElementById('site-nav');
    if (toggle && nav) {
      var setNavState = function (isOpen) {
        toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        nav.classList.toggle('is-open', isOpen);
      };
      on(toggle, 'click', function () {
        setNavState(toggle.getAttribute('aria-expanded') !== 'true');
      });
      $$('a', nav).forEach(function (link) {
        on(link, 'click', function () {
          setNavState(false);
          if (typeof link.blur === 'function') { link.blur(); }
        });
      });
      on(document, 'click', function (event) {
        if (!nav.classList.contains('is-open')) { return; }
        if (nav.contains(event.target) || toggle.contains(event.target)) { return; }
        setNavState(false);
      });
      on(document, 'keydown', function (event) {
        if (event.key === 'Escape') { setNavState(false); }
      });
      on(window, 'resize', function () {
        if (window.innerWidth > 1120) { setNavState(false); }
      });
    }

    /* 当前页高亮：按文件名匹配，比写死 class 更可靠 */
    var here = (location.pathname.split('/').pop() || 'index.html');
    $$('#site-nav a[href]').forEach(function (a) {
      var href = a.getAttribute('href') || '';
      if (href.charAt(0) === '#') { return; }
      var file = href.split('#')[0];
      var match = (file === here) || (file === '' && here === 'index.html') || (file === 'index.html' && here === '');
      a.classList.toggle('is-active', !!match);
    });

    /* 站内锚点：即时跳转(不做平滑滚动)，并手工补一次高度补偿 */
    $$('a[href^="#"]').forEach(function (a) {
      on(a, 'click', function (e) {
        var id = a.getAttribute('href');
        if (!id || id === '#' || id.length < 2) { return; }
        var target = document.getElementById(id.slice(1));
        if (!target) { return; }
        e.preventDefault();
        jumpTo(target);
        if (history.replaceState) { history.replaceState(null, '', id); }
      });
    });
  }

  /* 即时跳转到元素(补偿吸顶 header 高度) */
  function jumpTo(el) {
    var header = document.getElementById('site-header');
    var offset = header ? header.getBoundingClientRect().height : 0;
    var top = el.getBoundingClientRect().top + window.pageYOffset - offset - 8;
    window.scrollTo(0, Math.max(0, top));
  }

  /* ============ header 滚动阴影 ============ */
  function initHeaderScroll() {
    var header = document.getElementById('site-header');
    if (!header) { return; }
    var sync = function () { header.classList.toggle('is-scrolled', window.scrollY > 24); };
    sync();
    on(window, 'scroll', sync, { passive: true });
  }

  /* ============ 回到顶部(即时) ============ */
  function initBackToTop() {
    var btn = document.getElementById('back-to-top');
    if (!btn) { return; }
    var sync = function () { btn.classList.toggle('is-visible', window.scrollY > 480); };
    sync();
    on(window, 'scroll', sync, { passive: true });
    on(btn, 'click', function () { window.scrollTo({ top: 0, behavior: 'auto' }); });
  }

  /* ============ 搜索：真实过滤页面上的文章 ============ */
  function initSearch() {
    var form = document.querySelector('.search-box');
    var input = document.getElementById('site-search-input');
    if (!input) { return; }

    var cards = function () {
      // 首页用 .home-main 的卡片，文章页用整页卡片
      var scope = document.querySelector('[data-post-list]') || document.querySelector('.home-main') || document.body;
      return $$('.post-card', scope);
    };

    var status = document.querySelector('[data-search-status]') || $('#search-status');
    var ensureStatus = function () {
      if (status && document.contains(status)) { return status; }
      status = document.createElement('p');
      status.id = 'search-status';
      status.className = 'search-status';
      status.setAttribute('role', 'status');
      status.setAttribute('aria-live', 'polite');
      var main = document.querySelector('.site-main');
      if (main) {
        var anchor = main.querySelector('section') || main.firstChild;
        main.insertBefore(status, anchor);
      } else if (form && form.parentNode) {
        form.parentNode.insertBefore(status, form.nextSibling);
      }
      return status;
    };

    var run = function (raw) {
      var q = (raw || '').trim().toLowerCase();
      var list = cards();
      var shown = 0;
      list.forEach(function (card) {
        var hay = (card.textContent || '').toLowerCase();
        var hit = !q || hay.indexOf(q) !== -1;
        card.hidden = !hit;
        if (hit) { shown++; }
        card.classList.add('is-visible');
      });
      // 同步侧栏「最新文章」高亮
      $$('[data-side-latest] a').forEach(function (a) {
        var key = (a.getAttribute('data-title') || '').toLowerCase();
        a.classList.toggle('is-dimmed', !!q && key.indexOf(q) === -1);
      });
      if (!q) {
        if (status) { status.textContent = ''; status.hidden = true; }
        return;
      }
      var el = ensureStatus();
      el.hidden = false;
      el.textContent = shown
        ? '「' + raw.trim() + '」找到 ' + shown + ' 篇文章'
        : '「' + raw.trim() + '」没有匹配的文章';
    };

    var debounce;
    on(input, 'input', function () {
      window.clearTimeout(debounce);
      debounce = window.setTimeout(function () { run(input.value); }, 120);
    });

    on(form, 'submit', function (e) {
      e.preventDefault();          // 不做页面跳转，直接过滤
      run(input.value);
      var first = cards().filter(function (c) { return !c.hidden; })[0];
      if (first) { jumpTo(first); } else if (input.value.trim()) { jumpTo(ensureStatus()); }
    });

    on(document, 'keydown', function (e) {
      if (e.key === 'Escape' && document.activeElement === input) {
        input.value = '';
        run('');
        input.blur();
      }
    });

    // ⌘K / Ctrl+K 聚焦搜索框
    on(document, 'keydown', function (e) {
      if (!(e.metaKey || e.ctrlKey)) { return; }
      if (e.key !== 'k' && e.key !== 'K') { return; }
      e.preventDefault();
      input.focus();
      input.select();
    });

    // 点击标签(分类 / 标签云)：按该标签过滤文章列表
    on(document, 'click', function (e) {
      var a = (e.target && e.target.closest) ? e.target.closest('a[data-tag]') : null;
      if (!a) { return; }
      var tag = (a.getAttribute('data-tag') || '').trim();
      if (!tag) { return; }
      e.preventDefault();
      input.value = tag;
      run(tag);
      var list = document.querySelector('[data-post-list]');
      if (list) { jumpTo(list); }
    });
  }

  /* ============ Hero 轮播 ============ */
  function initHeroCarousel() {
    $$('[data-hero-carousel]').forEach(function (carousel) {
      var slides = $$('[data-hero-slide]', carousel);
      if (slides.length <= 1) { return; }
      var prevButton = $('[data-hero-prev]', carousel);
      var nextButton = $('[data-hero-next]', carousel);
      var dots = $$('[data-hero-dot]', carousel);
      var activeIndex = 0, timerId = null, INTERVAL = 5000;

      var canAutoplay = function () { return !prefersReduced() && !document.hidden; };
      var setActiveSlide = function (index) {
        activeIndex = (index + slides.length) % slides.length;
        slides.forEach(function (s, i) { s.classList.toggle('is-active', i === activeIndex); });
        dots.forEach(function (d, i) { d.classList.toggle('is-active', i === activeIndex); });
      };
      var startAutoplay = function () {
        window.clearInterval(timerId);
        if (!canAutoplay()) { return; }
        timerId = window.setInterval(function () { setActiveSlide(activeIndex + 1); }, INTERVAL);
      };
      var stopAutoplay = function () { window.clearInterval(timerId); };

      on(prevButton, 'click', function () { setActiveSlide(activeIndex - 1); startAutoplay(); });
      on(nextButton, 'click', function () { setActiveSlide(activeIndex + 1); startAutoplay(); });
      dots.forEach(function (dot) {
        on(dot, 'click', function () { setActiveSlide(Number(dot.getAttribute('data-hero-dot'))); startAutoplay(); });
      });
      on(carousel, 'mouseenter', stopAutoplay);
      on(carousel, 'mouseleave', startAutoplay);
      on(carousel, 'focusin', stopAutoplay);
      on(carousel, 'focusout', startAutoplay);
      on(document, 'visibilitychange', function () {
        if (document.hidden) { stopAutoplay(); } else { startAutoplay(); }
      });

      setActiveSlide(0);
      startAutoplay();
    });
  }

  /* ============ 侧栏「最新文章」+ 标签云：由真实文章推导 ============ */
  function initDerivedPanels() {
    /* 给分类/标签链接补上 data-tag，便于点击即筛选 */
    $$('.tags-list a').forEach(function (a) {
      if (a.hasAttribute('data-tag')) { return; }
      var tx = (a.textContent || '').trim();
      if (tx) { a.setAttribute('data-tag', tx); }
    });

    /* --- 最新文章：从文章列表 DOM 生成，不写死 --- */
    var latestBox = $('[data-side-latest]');
    if (latestBox) {
      var cards = $$('.post-card', document.querySelector('[data-post-list]') || document.body);
      var seen = {};
      var items = cards.slice(0, LATEST_LIMIT).map(function (card) {
        var a = $('.post-card-body h3 a', card) || $('a', card);
        var meta = $('.card-meta span', card);
        var title = a ? (a.textContent || '').trim() : '未命名';
        var href = a ? a.getAttribute('href') : '#';
        var date = meta ? (meta.textContent || '').split('·')[0].trim() : '';
        seen[title] = 1;
        return { title: title, href: href, date: date };
      });
      latestBox.innerHTML = items.length
        ? '<ul class="side-list">' + items.map(function (it) {
            return '<li><a href="' + it.href + '" data-title="' + esc(it.title) + '">' +
              '<strong>' + esc(it.title) + '</strong><span>' + esc(it.date) + '</span></a></li>';
          }).join('') + '</ul>'
        : '<p class="side-empty">还没有文章</p>';
    }

    /* --- 标签云：统计每篇文章分类/标签的真实出现次数 --- */
    var cloud = $('[data-tag-cloud]');
    if (cloud) {
      var scope = document.querySelector('[data-post-list]') || document.body;
      var counts = {};
      $$('.tags-list a', scope).forEach(function (a) {
        var name = (a.textContent || '').trim();
        if (name) { counts[name] = (counts[name] || 0) + 1; }
      });
      var names = Object.keys(counts);
      cloud.innerHTML = names.length
        ? names.map(function (n) {
            return '<a class="tag tag--cloud" data-tag="' + esc(n) + '" data-heat="' + counts[n] + '" href="#post-list" title="' +
              esc(n) + ' · ' + counts[n] + ' 篇">' + esc(n) + '<span class="tag-count">' + counts[n] + '</span></a>';
          }).join('')
        : '<p class="side-empty">暂无标签</p>';
    }
  }

  /* ============ 滚动进场 reveal ============ */
  function initRevealOnScroll() {
    var targets = $$('.project-grid .project-card, .about-grid .about-card, .home-grid .post-card, .home-grid .side-card, .section-heading');
    if (!targets.length) { return; }
    if (prefersReduced() || !('IntersectionObserver' in window)) {
      targets.forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }
    var observer = new IntersectionObserver(function (entries) {
      var batch = [];
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) { return; }
        batch.push(entry.target);
        observer.unobserve(entry.target);
      });
      batch.forEach(function (el, idx) {
        window.setTimeout(function () { el.classList.add('is-visible'); }, Math.min(idx, 6) * 60);
      });
    }, { rootMargin: '0px 0px -40px 0px', threshold: 0.05 });
    targets.forEach(function (el) { observer.observe(el); });
  }

  /* ============ 页脚年份 + 运行天数 ============ */
  function initFooterMeta() {
    var yearEl = document.getElementById('year');
    if (yearEl) { yearEl.textContent = String(new Date().getFullYear()); }
    var daysEl = document.getElementById('site-days');
    if (!daysEl) { return; }
    var start = new Date(SITE_START_DATE + 'T00:00:00');
    if (isNaN(start.getTime())) { daysEl.textContent = '—'; return; }
    var days = Math.floor((Date.now() - start.getTime()) / 86400000) + 1;
    daysEl.textContent = days > 0 ? String(days) : '1';
  }

  /* ============ 站点统计弹窗(原生渲染，无数据时如实显示) ============ */
  function initStatsModal() {
    var toggle = document.getElementById('stats-toggle');
    var modal = document.getElementById('stats-modal');
    if (!toggle || !modal) { return; }

    var open = function () {
      modal.hidden = false;
      document.body.classList.add('has-modal-open');
      renderStats();
      var closeBtn = $('[data-stats-close]', modal);
      if (closeBtn) { closeBtn.focus(); }
    };
    var close = function () {
      modal.hidden = true;
      document.body.classList.remove('has-modal-open');
      toggle.focus();
    };
    on(toggle, 'click', function () { modal.hidden ? open() : close(); });
    $$('[data-stats-close]', modal).forEach(function (el) { on(el, 'click', close); });
    on(document, 'keydown', function (e) { if (e.key === 'Escape' && !modal.hidden) { close(); } });

    function esc(s) {
      return String(s).replace(/[&<>"]/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
      });
    }
    function renderBars(el, data) {
      if (!el) { return; }
      if (!data || !data.length) { el.innerHTML = empty(); return; }
      var max = Math.max.apply(null, data.map(function (d) { return d.value; })) || 1;
      el.innerHTML = '<div class="stats-bars">' + data.map(function (d) {
        return '<div class="stats-bar-row"><span class="stats-bar-value">' + esc(d.value) + '</span>' +
          '<span class="stats-bar-track"><span class="stats-bar-fill" style="height:' +
          Math.round((d.value / max) * 100) + '%"></span></span>' +
          '<span class="stats-bar-label">' + esc(d.label) + '</span></div>';
      }).join('') + '</div>';
    }
    function renderChips(el, data, unit) {
      if (!el) { return; }
      if (!data || !data.length) { el.innerHTML = empty(); return; }
      el.innerHTML = '<div class="stats-chips">' + data.map(function (d) {
        return '<span class="stats-chip">' + esc(d.label) + '<b>' + esc(d.value) + ' ' + esc(unit || '') + '</b></span>';
      }).join('') + '</div>';
    }
    function renderHeatmap(el, data) {
      if (!el) { return; }
      if (!data || !data.length) { el.innerHTML = empty(); return; }
      var max = Math.max.apply(null, data.map(function (d) { return d.value; })) || 1;
      el.innerHTML = '<div class="stats-heatmap">' + data.map(function (d) {
        var level = d.value ? Math.max(1, Math.ceil((d.value / max) * 4)) : 0;
        return '<i class="stats-heat" data-level="' + level + '" title="' + esc(d.date) + ' · ' + esc(d.value) + '"></i>';
      }).join('') + '</div>';
    }
    function empty() {
      return '<div class="stats-empty">暂无数据<br><small>文章发布后会在这里汇总</small></div>';
    }
    function renderStats() {
      var data = window.fluxgridStats || {};
      renderHeatmap($('#stats-chart-heatmap'), data.activity);
      renderChips($('#stats-chart-radar'), data.categories, '篇');
      renderBars($('#stats-chart-monthly'), data.monthly);
      renderChips($('#stats-chart-categories'), data.categories, '篇');
      renderChips($('#stats-chart-tags'), data.tags, '篇');
    }
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ============ 启动 ============ */
  function boot() {
    initNav();
    initTheme();
    initHeaderScroll();
    initBackToTop();
    initSearch();
    initHeroCarousel();
    initDerivedPanels();
    initRevealOnScroll();
    initFooterMeta();
    initStatsModal();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
