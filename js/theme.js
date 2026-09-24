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
  // 侧栏「最近发布」最多显示几篇
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

  /* ============ 导航(移动端菜单 / 当前页高亮 / 平滑→即时跳转) ============ */
  function initNav() {
    if ((location.pathname.split('/').pop() || 'index.html') === 'index.html' && location.hash === '#projects') {
      location.replace('projects.html');
      return;
    }
    var toggle = document.querySelector('.nav-toggle');
    var nav = document.getElementById('site-nav');
    if (toggle && nav) {
      var setNavState = function (isOpen) {
        toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        toggle.setAttribute('aria-label', isOpen ? '关闭菜单' : '打开菜单');
        nav.classList.toggle('is-open', isOpen);
        if (!isOpen && moreButton) { setMoreState(false); }
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
        if (event.key === 'Escape' && nav.classList.contains('is-open')) { setNavState(false); toggle.focus(); }
      });
      on(window, 'resize', function () {
        if (window.innerWidth > 820) { setNavState(false); }
      });
    }

    var more = $('.nav-more');
    var moreButton = more && $('.nav-link', more);
    if (moreButton) {
      var setMoreState = function (open) {
        more.classList.toggle('is-expanded', open);
        moreButton.setAttribute('aria-expanded', open ? 'true' : 'false');
      };
      on(moreButton, 'click', function () { setMoreState(moreButton.getAttribute('aria-expanded') !== 'true'); });
      on(document, 'click', function (event) { if (!more.contains(event.target)) { setMoreState(false); } });
      on(document, 'keydown', function (event) {
        if (event.key === 'Escape' && more.classList.contains('is-expanded')) {
          setMoreState(false);
          if (!nav || !nav.classList.contains('is-open')) { moreButton.focus(); }
        }
      });
      on(more, 'focusout', function (event) { if (!more.contains(event.relatedTarget)) { setMoreState(false); } });
    }

    /* 当前页高亮：按文件名匹配，比写死 class 更可靠 */
    var updateCurrentNav = function () {
      var here = (location.pathname.split('/').pop() || 'index.html');
      $$('#site-nav a[href]').forEach(function (a) {
        var href = a.getAttribute('href') || '';
        if (/^(https?:|mailto:|#)/.test(href)) { return; }
        var file = href.split('#')[0].split('?')[0] || 'index.html';
        var match = file === here || (file === 'projects.html' && (here === 'data-pipeline.html' || here === 'law-design.html'));
        a.classList.toggle('is-active', match);
        if (match) { a.setAttribute('aria-current', 'page'); }
        else { a.removeAttribute('aria-current'); }
      });
    };
    updateCurrentNav();
    on(window, 'hashchange', updateCurrentNav);

    /* 站内锚点：即时跳转(不做平滑滚动)，并手工补一次高度补偿 */
    $$('a[href^="#"]').forEach(function (a) {
      on(a, 'click', function (e) {
        var id = a.getAttribute('href');
        if (!id || id === '#' || id.length < 2) { return; }
        var target = document.getElementById(id.slice(1));
        if (!target) { return; }
        e.preventDefault();
        jumpTo(target);
        if (history.replaceState) { history.replaceState(null, '', id); updateCurrentNav(); }
      });
    });
  }

  /* 连续点击不能中断正在进行的跨页过渡：出站只执行第一次导航，
     入站动画期间记下最后一次选择，动画结束后再用真实链接继续翻页。
     修饰键、新标签、下载和站内锚点仍交由浏览器原生处理。 */
  function initChapterNavigation() {
    var leaving = false;
    on(document, 'click', function (event) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey ||
          event.shiftKey || event.altKey) { return; }
      var target = event.target;
      var link = target && target.closest && target.closest('a[href]');
      if (!link || link.hasAttribute('download') || (link.target && link.target !== '_self')) { return; }
      var url;
      try { url = new URL(link.href, location.href); } catch (e) { return; }
      if (url.origin !== location.origin || !/\.html$/i.test(url.pathname)) { return; }
      if (url.pathname === location.pathname && url.search === location.search) { return; }

      if (document.documentElement.classList.contains('chapter-arriving')) {
        event.preventDefault();
        window.__chapterQueuedUrl = url.href;
        return;
      }
      if (leaving) { event.preventDefault(); return; }
      leaving = true;
      // A blocked navigation (offline / canceled by another script) must not
      // leave the current document unresponsive indefinitely.
      setTimeout(function () { leaving = false; }, 4000);
    }, true);
    on(window, 'pageshow', function () { leaving = false; });
  }

  /* 常用章节在浏览器空闲时预取；悬停/聚焦时预取其他站内章节。
     保留真实链接和浏览器历史，不在点击时隐藏页面，也不拦截导航。 */
  function initChapterPrefetch() {
    var connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (connection && (connection.saveData || /^(slow-)?2g$/.test(connection.effectiveType || ''))) { return; }
    var seen = new Set();
    var current = new URL(location.href);
    current.hash = '';

    function warm(href) {
      var url;
      try { url = new URL(href, location.href); } catch (e) { return; }
      if (url.origin !== location.origin || !/\.html$/i.test(url.pathname)) { return; }
      url.hash = '';
      if (url.href === current.href || seen.has(url.href)) { return; }
      seen.add(url.href);
      var hint = document.createElement('link');
      hint.rel = 'prefetch';
      hint.as = 'document';
      hint.href = url.href;
      document.head.appendChild(hint);
    }

    function warmTarget(event) {
      var target = event.target;
      var link = target && target.closest && target.closest('a[href]');
      if (link && !link.hasAttribute('download') && (!link.target || link.target === '_self')) {
        warm(link.href);
      }
    }
    on(document, 'pointerover', warmTarget, { passive: true });
    on(document, 'focusin', warmTarget);
    on(document, 'touchstart', warmTarget, { passive: true });

    function warmMainChapters() {
      if (document.visibilityState !== 'visible') { return; }
      ['index.html', 'projects.html', 'posts.html', 'learning.html', 'about.html'].forEach(warm);
      // Deep pages need the same warm hand-off as the main navigation.
      var here = current.pathname.split('/').pop();
      if (here === 'projects.html') ['data-pipeline.html', 'law-design.html'].forEach(warm);
      if (here === 'posts.html') warm('post.html');
      if (here === 'learning.html') warm('learning-editor.html');
      if (here === 'data-pipeline.html') warm('law-design.html');
      if (here === 'law-design.html') warm('data-pipeline.html');
    }
    if ('requestIdleCallback' in window) {
      requestIdleCallback(warmMainChapters, { timeout: 2500 });
    } else {
      setTimeout(warmMainChapters, 600);
    }
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
    if (!input || !form) { return; }

    var listRoot = document.querySelector('[data-post-list]');
    var isPostsPage = !!listRoot;
    var cards = function () { return listRoot ? $$('.post-card', listRoot) : []; };
    var status = document.querySelector('[data-search-status]') || $('#search-status');

    var ensureStatus = function () {
      if (status && document.contains(status)) { return status; }
      status = document.createElement('p');
      status.id = 'search-status';
      status.className = 'search-status';
      status.setAttribute('role', 'status');
      status.setAttribute('aria-live', 'polite');
      if (listRoot && listRoot.parentNode) { listRoot.parentNode.insertBefore(status, listRoot); }
      return status;
    };

    var syncQueryUrl = function (raw) {
      if (!isPostsPage || !history.replaceState) { return; }
      var url = new URL(window.location.href);
      var q = (raw || '').trim();
      if (q) { url.searchParams.set('s', q); }
      else { url.searchParams.delete('s'); }
      history.replaceState(null, '', url.pathname + url.search + url.hash);
    };

    var run = function (raw, updateUrl) {
      var original = (raw || '').trim();
      var q = original.toLowerCase();
      var list = cards();
      var shown = 0;
      list.forEach(function (card) {
        var hay = (card.textContent || '').toLowerCase();
        var hit = !q || hay.indexOf(q) !== -1;
        card.hidden = !hit;
        if (hit) { shown++; }
        card.classList.add('is-visible');
      });
      $$('[data-side-latest] a').forEach(function (a) {
        var key = (a.getAttribute('data-title') || '').toLowerCase();
        a.classList.toggle('is-dimmed', !!q && key.indexOf(q) === -1);
      });
      var empty = $('[data-empty-publications]');
      if (empty) { empty.hidden = !!q; }
      if (!q) {
        if (status) { status.textContent = ''; status.hidden = true; }
      } else {
        var el = ensureStatus();
        el.hidden = false;
        el.textContent = shown
          ? '「' + original + '」找到 ' + shown + ' 篇文章'
          : (list.length ? '「' + original + '」没有匹配的文章，请换一个关键词' : '暂时还没有正式发布的文章。写好后就可以在这里搜索。');
        var clear = document.createElement('button');
        clear.type = 'button';
        clear.className = 'search-clear';
        clear.textContent = '清除搜索';
        on(clear, 'click', function () { input.value = ''; run('', true); input.focus(); });
        el.appendChild(clear);
      }
      if (updateUrl) { syncQueryUrl(original); }
    };

    var goToSearch = function (raw) {
      var q = (raw || '').trim();
      window.location.href = 'search.html' + (q ? '?s=' + encodeURIComponent(q) : '');
    };

    /* 手机端搜索按需展开；无 JS 时原有表单仍然可见。 */
    var header = document.getElementById('site-header');
    var actions = header && $('.header-actions', header);
    var toggle = null;
    if (actions) {
      toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'header-action search-toggle';
      toggle.setAttribute('aria-label', '打开站内搜索');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-controls', 'site-search-form');
      toggle.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>';
      actions.insertBefore(toggle, actions.firstChild);
      document.documentElement.classList.add('has-enhanced-search');
    }
    var setOpen = function (open, focusInput) {
      if (!toggle || !header) { return; }
      if (open) {
        var navToggle = $('.nav-toggle', header);
        if (navToggle && navToggle.getAttribute('aria-expanded') === 'true') { navToggle.click(); }
      }
      header.classList.toggle('is-search-open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.setAttribute('aria-label', open ? '关闭站内搜索' : '打开站内搜索');
      if (focusInput) { input.focus(); }
    };
    on(toggle, 'click', function () {
      var next = !header.classList.contains('is-search-open');
      setOpen(next, next);
    });
    on($('.nav-toggle', header), 'click', function () { if (header.classList.contains('is-search-open')) { setOpen(false); } });
    on(document, 'click', function (e) {
      if (header && header.classList.contains('is-search-open') && !form.contains(e.target) && !toggle.contains(e.target)) { setOpen(false); }
    });
    on(window, 'resize', function () { if (window.innerWidth > 820) { setOpen(false); } });

    on(form, 'submit', function (e) {
      e.preventDefault();
      goToSearch(input.value);
    });

    on(document, 'keydown', function (e) {
      if (e.key === 'Escape' && document.activeElement === input) {
        if (header && header.classList.contains('is-search-open')) { setOpen(false); toggle.focus(); }
        else { input.value = ''; input.blur(); }
      }
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        var mainInput = document.getElementById('main-search-input');
        if (mainInput) { mainInput.focus(); mainInput.select(); }
        else { if (window.innerWidth <= 820) { setOpen(true); } input.focus(); input.select(); }
      }
    });

    on(document, 'click', function (e) {
      var a = (e.target && e.target.closest) ? e.target.closest('a[data-tag]') : null;
      if (!a) { return; }
      var tag = (a.getAttribute('data-tag') || '').trim();
      if (!tag) { return; }
      e.preventDefault();
      if (!isPostsPage) { goToSearch(tag); return; }
      input.value = tag;
      run(tag, true);
      jumpTo(listRoot);
    });

    if (isPostsPage) {
      var initial = '';
      try { initial = new URL(window.location.href).searchParams.get('s') || ''; } catch (e) {}
      if (initial) {
        input.value = initial;
        run(initial, false);
      }
    }
  }

  /* 真正可用的分享／复制：失败时给出反馈，不伪称已复制。 */
  function initShareTools() {
    var status = $('[data-utility-status]');
    var report = function (message) { if (status) { status.textContent = message; } };
    var copy = function (value, success) {
      if (!navigator.clipboard || !navigator.clipboard.writeText) {
        report('当前浏览器不支持一键复制，请长按邮箱地址或从地址栏复制链接。');
        return;
      }
      navigator.clipboard.writeText(value).then(function () { report(success); }, function () {
        report('复制没有成功，请手动选择邮箱地址或从地址栏复制链接。');
      });
    };
    $$('[data-copy-email]').forEach(function (button) {
      on(button, 'click', function () { copy(button.getAttribute('data-copy-email'), '邮箱地址已复制。'); });
    });
    $$('[data-share-page]').forEach(function (button) {
      on(button, 'click', function () {
        var url = window.location.href.split('#')[0];
        if (navigator.share) {
          report('正在打开系统分享…');
          navigator.share({ title: document.title, url: url }).then(function () {
            report('已打开分享。');
          }).catch(function (error) {
            if (error.name === 'AbortError') { report('分享已取消。'); }
            else { copy(url, '页面链接已复制。'); }
          });
        } else { copy(url, '页面链接已复制。'); }
      });
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
      var activeIndex = 0;
      var turnTimer;
      // Keep the opening manga cover still until the visitor chooses a page.
      var setActiveSlide = function (index, userTurn) {
        if (userTurn && (index + slides.length) % slides.length !== activeIndex) {
          carousel.classList.remove('is-turning');
          // Restart entrance animation for each deliberate turn, never on load.
          void carousel.offsetWidth;
          carousel.classList.add('is-turning');
          window.clearTimeout(turnTimer);
          turnTimer = window.setTimeout(function () { carousel.classList.remove('is-turning'); }, 750);
        }
        activeIndex = (index + slides.length) % slides.length;
        slides.forEach(function (s, i) {
          var active = i === activeIndex;
          s.classList.toggle('is-active', active);
          s.setAttribute('aria-hidden', active ? 'false' : 'true');
          $$('a, button, input', s).forEach(function (control) { control.tabIndex = active ? 0 : -1; });
        });
        dots.forEach(function (d, i) {
          d.classList.toggle('is-active', i === activeIndex);
          d.setAttribute('aria-current', i === activeIndex ? 'true' : 'false');
        });
      };
      on(prevButton, 'click', function () { setActiveSlide(activeIndex - 1, true); });
      on(nextButton, 'click', function () { setActiveSlide(activeIndex + 1, true); });
      dots.forEach(function (dot) {
        on(dot, 'click', function () { setActiveSlide(Number(dot.getAttribute('data-hero-dot')), true); });
      });
      var touchStart = null;
      on(carousel, 'touchstart', function (e) {
        if (e.touches.length === 1) { touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }
      }, { passive: true });
      on(carousel, 'touchend', function (e) {
        if (!touchStart || !e.changedTouches.length) { return; }
        var distance = e.changedTouches[0].clientX - touchStart.x;
        var vertical = e.changedTouches[0].clientY - touchStart.y;
        touchStart = null;
        if (Math.abs(distance) < 65 || Math.abs(distance) < Math.abs(vertical) * 1.2) { return; }
        setActiveSlide(activeIndex + (distance < 0 ? 1 : -1), true);
      }, { passive: true });

      setActiveSlide(0);
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
      var items = cards.slice(0, LATEST_LIMIT).map(function (card) {
        var a = $('.post-card-body h3 a', card) || $('a', card);
        var meta = $('.card-meta span', card);
        var title = a ? (a.textContent || '').trim() : '未命名';
        var href = a ? a.getAttribute('href') : '#';
        var date = meta ? (meta.textContent || '').split('·')[0].trim() : '';
        return { title: title, href: href, date: date };
      });
      latestBox.innerHTML = items.length
        ? '<ul class="side-list">' + items.map(function (it) {
            return '<li><a href="' + it.href + '" data-title="' + esc(it.title) + '">' +
              '<strong>' + esc(it.title) + '</strong><span>' + esc(it.date) + '</span></a></li>';
          }).join('') + '</ul>'
        : '<p class="side-empty">尚未发布文章</p>';
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
        : '<p class="side-empty">发布文章后，标签会自动出现在这里。</p>';
    }
  }

  /* ============ 文章阅读增强：进度 / 目录高亮 / 代码复制 ============ */
  function initArticleTools() {
    var content = document.querySelector('.article-content');
    if (!content) { return; }

    var header = document.getElementById('site-header');
    var progress = document.createElement('div');
    progress.className = 'reading-progress';
    progress.setAttribute('role', 'progressbar');
    progress.setAttribute('aria-label', '文章阅读进度');
    progress.setAttribute('aria-valuemin', '0');
    progress.setAttribute('aria-valuemax', '100');
    progress.innerHTML = '<span></span>';
    document.body.appendChild(progress);
    var progressBar = $('span', progress);

    var updateProgress = function () {
      var headerHeight = header ? header.getBoundingClientRect().height : 0;
      progress.style.setProperty('--reading-progress-top', Math.round(headerHeight) + 'px');
      var rect = content.getBoundingClientRect();
      var start = window.pageYOffset + rect.top - headerHeight;
      var end = start + content.offsetHeight - window.innerHeight + headerHeight;
      var ratio = end > start ? (window.pageYOffset - start) / (end - start) : 1;
      ratio = Math.max(0, Math.min(1, ratio));
      progressBar.style.transform = 'scaleX(' + ratio + ')';
      progress.setAttribute('aria-valuenow', String(Math.round(ratio * 100)));
    };
    updateProgress();
    on(window, 'scroll', updateProgress, { passive: true });
    on(window, 'resize', updateProgress);

    var tocLinks = $$('.article-toc a[href^="#"]');
    var tocItems = tocLinks.map(function (link) {
      return { link: link, target: document.getElementById((link.getAttribute('href') || '').slice(1)) };
    }).filter(function (item) { return !!item.target; });
    var updateToc = function () {
      if (!tocItems.length) { return; }
      var headerHeight = header ? header.getBoundingClientRect().height : 0;
      var active = tocItems[0];
      tocItems.forEach(function (item) {
        if (item.target.getBoundingClientRect().top <= headerHeight + 120) { active = item; }
      });
      tocItems.forEach(function (item) {
        var selected = item === active;
        item.link.classList.toggle('is-active', selected);
        if (selected) { item.link.setAttribute('aria-current', 'location'); }
        else { item.link.removeAttribute('aria-current'); }
      });
    };
    updateToc();
    on(window, 'scroll', updateToc, { passive: true });

    $$('pre', content).forEach(function (pre) {
      if ($('.code-bar', pre)) { return; }
      var code = $('code', pre);
      if (!code) { return; }
      var language = code.getAttribute('data-lang') || ((code.className || '').match(/language-([\w-]+)/) || [])[1] || '代码';
      var bar = document.createElement('div');
      bar.className = 'code-bar';
      bar.innerHTML = '<span class="code-bar-left"><span class="code-bar-dots" aria-hidden="true"><i class="code-dot"></i><i class="code-dot"></i><i class="code-dot"></i></span><span class="code-lang">' + esc(language) + '</span></span><button type="button" class="code-copy">复制</button>';
      pre.insertBefore(bar, pre.firstChild);
      var button = $('.code-copy', bar);
      on(button, 'click', function () {
        var text = code.textContent || '';
        var done = function () {
          button.textContent = '已复制';
          button.classList.add('is-copied');
          window.setTimeout(function () { button.textContent = '复制'; button.classList.remove('is-copied'); }, 1600);
        };
        if (navigator.clipboard && window.isSecureContext) {
          navigator.clipboard.writeText(text).then(done).catch(function () { fallbackCopy(text, done); });
        } else { fallbackCopy(text, done); }
      });
    });

    function fallbackCopy(text, done) {
      var area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      try { document.execCommand('copy'); done(); } catch (e) {}
      document.body.removeChild(area);
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

  /* ============ 页脚年份 ============ */
  function initFooterMeta() {
    var yearEl = document.getElementById('year');
    if (yearEl) { yearEl.textContent = String(new Date().getFullYear()); }
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ============ 启动 ============ */
  function boot() {
    initNav();
    initChapterNavigation();
    initChapterPrefetch();
    initShareTools();
    initHeaderScroll();
    initBackToTop();
    initDerivedPanels();
    initSearch();
    initHeroCarousel();
    initArticleTools();
    initRevealOnScroll();
    initFooterMeta();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
