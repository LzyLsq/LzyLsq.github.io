/* ==========================================================
   Personal Homepage · 动漫主题交互脚本
   默认浅色 + 飘落花瓣,其余交互同主脚本
   ========================================================== */
(function () {
  'use strict';

  /* ---------- 主题切换 ---------- */
  var root = document.documentElement;
  var THEME_KEY = 'theme';

  function applyTheme(theme) {
    root.setAttribute('data-theme', theme);
    try { localStorage.setItem(THEME_KEY, theme); } catch (e) {}
  }

  // 初始:localStorage > 系统偏好 > 默认浅色(樱花粉)
  (function initTheme() {
    var saved = null;
    try { saved = localStorage.getItem(THEME_KEY); } catch (e) {}
    if (saved === 'light' || saved === 'dark') {
      applyTheme(saved);
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      applyTheme('dark');
    } else {
      applyTheme('light');
    }
  })();

  var themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      applyTheme(next);
    });
  }

  /* ---------- 移动端菜单 ---------- */
  var navToggle = document.getElementById('nav-toggle');
  var siteNav = document.getElementById('site-nav');

  if (navToggle && siteNav) {
    navToggle.addEventListener('click', function () {
      var open = siteNav.classList.toggle('is-open');
      navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      navToggle.setAttribute('aria-label', open ? '关闭菜单' : '打开菜单');
    });
    siteNav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        siteNav.classList.remove('is-open');
        navToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* ---------- 滚动 header 阴影 ---------- */
  var header = document.querySelector('.site-header');
  function onScroll() {
    if (header) header.classList.toggle('is-scrolled', window.scrollY > 8);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- 进场动画 ---------- */
  var revealTargets = document.querySelectorAll(
    '.stream-section, .post-card, .side-card, .about-panel, .skills-grid'
  );
  revealTargets.forEach(function (el) { el.classList.add('reveal'); });

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry, i) {
        if (entry.isIntersecting) {
          var el = entry.target;
          setTimeout(function () { el.classList.add('is-visible'); }, Math.min(i * 70, 280));
          io.unobserve(el);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
    revealTargets.forEach(function (el) { io.observe(el); });
  } else {
    revealTargets.forEach(function (el) { el.classList.add('is-visible'); });
  }

  /* ---------- 导航高亮(Scrollspy) ---------- */
  var navLinks = Array.prototype.slice.call(
    document.querySelectorAll('.site-nav > a[href^="#"]')
  );
  var sections = navLinks
    .map(function (a) { return document.querySelector(a.getAttribute('href')); })
    .filter(Boolean);

  if ('IntersectionObserver' in window && sections.length) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var id = entry.target.id;
        navLinks.forEach(function (a) {
          a.classList.toggle('is-active', a.getAttribute('href') === '#' + id);
        });
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    sections.forEach(function (s) { spy.observe(s); });
  }

  /* ---------- 页脚年份 & 运行天数 ---------- */
  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  var daysEl = document.getElementById('site-days');
  if (daysEl) {
    var START = new Date('2026-01-01T00:00:00');
    var days = Math.max(1, Math.floor((Date.now() - START.getTime()) / 86400000));
    daysEl.textContent = String(days);
  }

  /* ---------- 飘落花瓣 ---------- */
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches === false) {
    var COLORS = [
      'linear-gradient(135deg, rgba(244,114,182,.75), rgba(168,85,247,.4))',
      'linear-gradient(135deg, rgba(251,207,232,.9), rgba(244,114,182,.5))',
      'linear-gradient(135deg, rgba(192,132,252,.6), rgba(147,197,253,.4))'
    ];
    var COUNT = 14;
    for (var i = 0; i < COUNT; i++) {
      var p = document.createElement('span');
      p.className = 'petal';
      var size = 6 + Math.random() * 8;
      p.style.width = size + 'px';
      p.style.height = size * 0.8 + 'px';
      p.style.left = Math.random() * 100 + 'vw';
      p.style.background = COLORS[i % COLORS.length];
      p.style.animationDuration = (9 + Math.random() * 12) + 's';
      p.style.animationDelay = (-Math.random() * 16) + 's';
      document.body.appendChild(p);
    }
  }
})();
