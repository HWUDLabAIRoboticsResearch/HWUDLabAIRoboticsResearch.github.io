(function () {
  'use strict';

  var VALID_TABS = ['home', 'research', 'caas', 'projects', 'team', 'contact'];
  var root = document.documentElement;

  /* ---------------- Theme ---------------- */
  var THEME_KEY = 'lairr-theme';
  function applyTheme(theme) {
    if (theme === 'dark' || theme === 'light') {
      root.setAttribute('data-theme', theme);
    }
  }
  var savedTheme = null;
  try { savedTheme = localStorage.getItem(THEME_KEY); } catch (e) { /* storage blocked */ }
  if (savedTheme) applyTheme(savedTheme);

  document.addEventListener('DOMContentLoaded', function () {
    var toggle = document.getElementById('theme-toggle');
    if (toggle) {
      toggle.addEventListener('click', function () {
        var current = root.getAttribute('data-theme');
        if (!current) {
          current = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
        }
        var next = current === 'dark' ? 'light' : 'dark';
        applyTheme(next);
        try { localStorage.setItem(THEME_KEY, next); } catch (e) { /* storage blocked */ }
        document.dispatchEvent(new CustomEvent('lairr-theme-change'));
      });
    }

    /* ---------------- Tab routing ---------------- */
    var sections = Array.prototype.slice.call(document.querySelectorAll('.view'));
    var tabButtons = Array.prototype.slice.call(document.querySelectorAll('[data-tab]'));

    function showTab(name, opts) {
      opts = opts || {};
      if (VALID_TABS.indexOf(name) === -1) name = 'home';

      sections.forEach(function (sec) {
        sec.classList.toggle('active', sec.id === name);
      });
      tabButtons.forEach(function (btn) {
        var isMatch = btn.getAttribute('data-tab') === name;
        btn.setAttribute('aria-selected', isMatch ? 'true' : 'false');
      });

      if (!opts.skipHash) {
        var url = name === 'home' ? location.pathname + location.search : '#' + name;
        history.pushState({ tab: name }, '', url);
      }
      if (!opts.skipScroll) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      closeMobilePanel();
    }

    tabButtons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        showTab(btn.getAttribute('data-tab'));
      });
    });

    window.addEventListener('popstate', function () {
      var tab = (location.hash || '#home').replace('#', '');
      showTab(tab, { skipHash: true, skipScroll: false });
    });

    var initialTab = (location.hash || '#home').replace('#', '');
    showTab(initialTab, { skipHash: true, skipScroll: true });

    /* ---------------- Mobile nav ---------------- */
    var navToggle = document.getElementById('nav-toggle');
    var mobilePanel = document.getElementById('mobile-panel');

    function closeMobilePanel() {
      if (mobilePanel) mobilePanel.hidden = true;
      if (navToggle) navToggle.setAttribute('aria-expanded', 'false');
    }
    if (navToggle && mobilePanel) {
      navToggle.addEventListener('click', function () {
        var isHidden = mobilePanel.hidden;
        mobilePanel.hidden = !isHidden;
        navToggle.setAttribute('aria-expanded', isHidden ? 'true' : 'false');
      });
      document.addEventListener('click', function (e) {
        if (!mobilePanel.hidden && !mobilePanel.contains(e.target) && e.target !== navToggle && !navToggle.contains(e.target)) {
          closeMobilePanel();
        }
      });
    }

    /* ---------------- Scroll reveal ---------------- */
    var revealEls = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
    if ('IntersectionObserver' in window && revealEls.length) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
            io.unobserve(entry.target);
          }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
      revealEls.forEach(function (el) { io.observe(el); });
    } else {
      revealEls.forEach(function (el) { el.classList.add('in-view'); });
    }

    /* ---------------- Footer year ---------------- */
    var yearEl = document.getElementById('year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();
  });
})();
