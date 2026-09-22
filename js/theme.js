/* ============================================================
   个人主页 · 交互脚本（Memphis 皮肤复刻版）
   ------------------------------------------------------------
   无任何外部依赖（不需要 jQuery / ECharts / Motion），
   直接保存为 index.html 同级的 js/theme.js 即可运行。

   可自定义项：
     SITE_START_DATE —— 页脚「已稳定运行 N 天」的起算日期
     window.fluxgridStats —— 站点统计面板的数据（可选）
   ============================================================ */
(function () {
  'use strict';

  /* ============ 配置区（TODO: 改成你自己的） ============ */
  // 网站上线日期，用于页脚「已稳定运行 N 天」
  var SITE_START_DATE = '2026-01-01';
  // 主题记忆 key，默认即可
  var THEME_KEY = 'fluxgrid-theme';

  /* ============ 工具 ============ */
  var reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  var prefersReduced = function () { return reducedMotionQuery.matches; };

  var on = function (el, type, fn, opts) {
    if (el) { el.addEventListener(type, fn, opts); }
  };

  /* ============ 平台检测：Mac 显示 ⌘，其他显示 Ctrl ============ */
  var ua = navigator.userAgent || '';
  var isMac = /Mac|iPhone|iPad|iPod/i.test(navigator.platform || ua);
  if (isMac) { document.documentElement.classList.add('is-mac'); }

  /* ============ 主题（暗色 / 亮色） ============ */
  function initTheme() {
    var root = document.documentElement;
    var saved = null;
    try { saved = localStorage.getItem(THEME_KEY); } catch (e) {}
    // 已保存 > 系统偏好 > 默认暗色
    if (saved !== 'light' && saved !== 'dark') {
      saved = (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) ? 'light' : 'dark';
    }
    root.setAttribute('data-theme', saved);

    var toggle = document.getElementById('theme-toggle');
    on(toggle, 'click', function () {
      var next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
      // 通知图表等需要重绘的模块
      document.dispatchEvent(new CustomEvent('fluxgrid:themechange', { detail: { theme: next } }));
    });
  }

  /* ============ 移动端菜单 ============ */
  function initNav() {
    var toggle = document.querySelector('.nav-toggle');
    var nav = document.getElementById('site-nav');
    if (!toggle || !nav) { return; }

    var setNavState = function (isOpen) {
      toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      nav.classList.toggle('is-open', isOpen);
    };

    on(toggle, 'click', function () {
      setNavState(toggle.getAttribute('aria-expanded') !== 'true');
    });

    Array.prototype.forEach.call(nav.querySelectorAll('a'), function (link) {
      on(link, 'click', function () {
        setNavState(false);
        // 释放 focus-within，桌面端二级菜单才能正常收起
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

  /* ============ header 滚动阴影 ============ */
  function initHeaderScroll() {
    var header = document.getElementById('site-header');
    if (!header) { return; }
    var sync = function () {
      header.classList.toggle('is-scrolled', window.scrollY > 24);
    };
    sync();
    on(window, 'scroll', sync, { passive: true });
  }

  /* ============ 回到顶部 ============ */
  function initBackToTop() {
    var btn = document.getElementById('back-to-top');
    if (!btn) { return; }
    var sync = function () {
      btn.classList.toggle('is-visible', window.scrollY > 480);
    };
    sync();
    on(window, 'scroll', sync, { passive: true });
    on(btn, 'click', function () {
      window.scrollTo({ top: 0, behavior: prefersReduced() ? 'auto' : 'smooth' });
    });
  }

  /* ============ 快捷键 ⌘K / Ctrl+K 聚焦搜索 ============ */
  function initSearchShortcut() {
    on(document, 'keydown', function (e) {
      if (!(e.metaKey || e.ctrlKey)) { return; }
      if (e.key !== 'k' && e.key !== 'K') { return; }
      var input = document.getElementById('site-search-input');
      if (!input) { return; }
      e.preventDefault();
      input.focus();
      input.select();
    });
  }

  /* ============ Hero 轮播 ============ */
  function initHeroCarousel() {
    var carousels = document.querySelectorAll('[data-hero-carousel]');
    Array.prototype.forEach.call(carousels, function (carousel) {
      var slides = carousel.querySelectorAll('[data-hero-slide]');
      if (slides.length <= 1) { return; }

      var prevButton = carousel.querySelector('[data-hero-prev]');
      var nextButton = carousel.querySelector('[data-hero-next]');
      var dots = carousel.querySelectorAll('[data-hero-dot]');
      var activeIndex = 0;
      var timerId = null;
      var INTERVAL = 5000;

      var canAutoplay = function () { return !prefersReduced() && !document.hidden; };

      var setActiveSlide = function (index) {
        var nextIndex = (index + slides.length) % slides.length;
        activeIndex = nextIndex;
        Array.prototype.forEach.call(slides, function (slide, i) {
          slide.classList.toggle('is-active', i === activeIndex);
        });
        Array.prototype.forEach.call(dots, function (dot, i) {
          dot.classList.toggle('is-active', i === activeIndex);
        });
      };

      var startAutoplay = function () {
        window.clearInterval(timerId);
        if (!canAutoplay()) { return; }
        timerId = window.setInterval(function () {
          setActiveSlide(activeIndex + 1);
        }, INTERVAL);
      };
      var stopAutoplay = function () { window.clearInterval(timerId); };

      on(prevButton, 'click', function () { setActiveSlide(activeIndex - 1); startAutoplay(); });
      on(nextButton, 'click', function () { setActiveSlide(activeIndex + 1); startAutoplay(); });
      Array.prototype.forEach.call(dots, function (dot) {
        on(dot, 'click', function () {
          setActiveSlide(Number(dot.getAttribute('data-hero-dot')));
          startAutoplay();
        });
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

  /* ============ 滚动进场 reveal ============ */
  function initRevealOnScroll() {
    var selector = [
      '.home-grid .post-card',
      '.home-grid .side-card',
      '.project-grid .project-card',
      '.about-grid .about-card',
      '.section-heading'
    ].join(', ');
    var targets = document.querySelectorAll(selector);
    if (!targets.length) { return; }

    if (prefersReduced() || !('IntersectionObserver' in window)) {
      Array.prototype.forEach.call(targets, function (el) { el.classList.add('is-visible'); });
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      var batch = [];
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) { return; }
        batch.push(entry.target);
        observer.unobserve(entry.target);
      });
      // 同一批进入视口的元素按顺序错落进场（最多级联 6 个）
      batch.forEach(function (el, idx) {
        window.setTimeout(function () { el.classList.add('is-visible'); }, Math.min(idx, 6) * 60);
      });
    }, { rootMargin: '0px 0px -40px 0px', threshold: 0.05 });

    Array.prototype.forEach.call(targets, function (el) { observer.observe(el); });
  }

  /* ============ 页脚年份 + 运行天数 ============ */
  function initFooterMeta() {
    var yearEl = document.getElementById('year');
    if (yearEl) { yearEl.textContent = String(new Date().getFullYear()); }

    var daysEl = document.getElementById('site-days');
    if (!daysEl) { return; }
    var start = new Date(SITE_START_DATE + 'T00:00:00');
    if (isNaN(start.getTime())) { return; }
    var days = Math.floor((Date.now() - start.getTime()) / 86400000) + 1;
    daysEl.textContent = days > 0 ? String(days) : '1';
  }

  /* ============ 站点统计面板 ============
     原生实现，不依赖 ECharts。数据结构见 window.fluxgridStats，
     没有数据时渲染骨架占位，方便你之后自己填。            */
  function initStatsModal() {
    var toggle = document.getElementById('stats-toggle');
    var modal = document.getElementById('stats-modal');
    if (!toggle || !modal) { return; }

    var open = function () {
      modal.hidden = false;
      document.body.classList.add('has-modal-open');
      renderStats();
      var closeBtn = modal.querySelector('[data-stats-close]');
      if (closeBtn) { closeBtn.focus(); }
    };
    var close = function () {
      modal.hidden = true;
      document.body.classList.remove('has-modal-open');
      if (toggle) { toggle.focus(); }
    };

    on(toggle, 'click', function () {
      if (modal.hidden) { open(); } else { close(); }
    });
    Array.prototype.forEach.call(modal.querySelectorAll('[data-stats-close]'), function (el) {
      on(el, 'click', close);
    });
    on(document, 'keydown', function (e) {
      if (e.key === 'Escape' && !modal.hidden) { close(); }
    });

    /* ---------- 渲染 ---------- */
    function esc(s) {
      return String(s).replace(/[&<>"]/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
      });
    }

    function renderBars(el, data) {
      // data: [{ label:'1月', value:3 }, ...]
      if (!el) { return; }
      if (!data || !data.length) {
        el.innerHTML = '<div class="stats-empty">暂无数据 —— 在 js/theme.js 的 fluxgridStats 里填写</div>';
        return;
      }
      var max = Math.max.apply(null, data.map(function (d) { return d.value; })) || 1;
      var rows = data.map(function (d) {
        var h = Math.round((d.value / max) * 100);
        return '<div class="stats-bar-row">' +
          '<span class="stats-bar-label">' + esc(d.label) + '</span>' +
          '<span class="stats-bar-track"><span class="stats-bar-fill" style="height:' + h + '%"></span></span>' +
          '<span class="stats-bar-value">' + esc(d.value) + '</span>' +
          '</div>';
      }).join('');
      el.innerHTML = '<div class="stats-bars">' + rows + '</div>';
    }

    function renderChips(el, data, unit) {
      if (!el) { return; }
      if (!data || !data.length) {
        el.innerHTML = '<div class="stats-empty">暂无数据</div>';
        return;
      }
      el.innerHTML = '<div class="stats-chips">' + data.map(function (d) {
        return '<span class="stats-chip">' + esc(d.label) +
          '<b>' + esc(d.value) + ' ' + esc(unit || '') + '</b></span>';
      }).join('') + '</div>';
    }

    function renderHeatmap(el, data) {
      // data: [{ date:'2026-01-01', value:2 }, ...] 近若干天
      if (!el) { return; }
      if (!data || !data.length) {
        el.innerHTML = '<div class="stats-empty">暂无数据</div>';
        return;
      }
      var max = Math.max.apply(null, data.map(function (d) { return d.value; })) || 1;
      var cells = data.map(function (d) {
        var level = d.value ? Math.max(1, Math.ceil((d.value / max) * 4)) : 0;
        return '<i class="stats-heat" data-level="' + level + '" title="' +
          esc(d.date) + ' · ' + esc(d.value) + '"></i>';
      }).join('');
      el.innerHTML = '<div class="stats-heatmap">' + cells + '</div>';
    }

    function renderStats() {
      var data = window.fluxgridStats || {};
      renderBars(document.getElementById('stats-chart-monthly'), data.monthly);
      renderChips(document.getElementById('stats-chart-categories'), data.categories, '篇');
      renderChips(document.getElementById('stats-chart-tags'), data.tags, '篇');
      renderHeatmap(document.getElementById('stats-chart-heatmap'), data.activity);
      renderChips(document.getElementById('stats-chart-radar'), data.categories, '篇');
    }
  }

  /* ============ 启动 ============ */
  function boot() {
    initTheme();
    initNav();
    initHeaderScroll();
    initBackToTop();
    initSearchShortcut();
    initHeroCarousel();
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
