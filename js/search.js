(function () {
  'use strict';

  var TAB_LABELS = {
    home: 'Home',
    research: 'Research',
    caas: 'CaaS',
    projects: 'Projects',
    collaborations: 'Collaborations',
    publications: 'Publications',
    team: 'Team',
    contact: 'Contact'
  };

  var PAGE_ENTRIES = [
    { tabId: 'home', title: 'Home', body: 'lairr home overview dual mission discover innovate impact advance scientific knowledge bridge gap to industry', el: null },
    { tabId: 'research', title: 'Research', body: 'research expertise topics core technical expertise industrial application domains strategic foundation global research institute uk national robotarium', el: null },
    { tabId: 'caas', title: 'Cognition-as-a-Service (CaaS)', body: 'caas cognition as a service commercial arm offerings strategic advisory technical implementation infrastructure access de-risked innovation', el: null },
    { tabId: 'projects', title: 'Projects', body: 'projects cogwaters gbot r2po trash sorting manipulator strategic industry collaborations current funded grants', el: null },
    { tabId: 'collaborations', title: 'Collaborations', body: 'collaborations industry partners dubai future foundation future os ecosystem nda de-risked adoption', el: null },
    { tabId: 'publications', title: 'Publications', body: 'publications papers research output impedance control prosthetics r2po', el: null },
    { tabId: 'team', title: 'Team', body: 'team people faculty leadership claudio zito research students', el: null },
    { tabId: 'contact', title: 'Contact', body: 'contact links github linkedin cdt-airi director email location heriot-watt university dubai uk national robotarium', el: null }
  ];

  var BLOCK_SELECTOR = '.card, .project-feature, .offer-card, .mission-card, .quicklink, .lead-card, .contact-row, .location-card .loc-item, .pipeline .stage, .stat, .foundation-list .row, .pub-item';

  function textOf(el) {
    if (!el) return '';
    var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
    var parts = [];
    var node;
    while ((node = walker.nextNode())) {
      if (node.parentElement && node.parentElement.closest('.avatar')) continue;
      var v = node.nodeValue.trim();
      if (v) parts.push(v);
    }
    return parts.join(' ').replace(/\s+/g, ' ').trim();
  }

  function titleOf(el) {
    var heading = el.querySelector('h1, h2, h3, h4, h5');
    if (heading) return textOf(heading);
    var key = el.querySelector('.k, .num');
    if (key) return textOf(key);
    var t = textOf(el);
    return t.length > 60 ? t.slice(0, 57) + '…' : t;
  }

  function buildIndex() {
    var entries = PAGE_ENTRIES.slice();
    var seen = new Set();

    document.querySelectorAll('.view').forEach(function (view) {
      var tabId = view.id;

      view.querySelectorAll('.section-head').forEach(function (head) {
        if (seen.has(head)) return;
        seen.add(head);
        entries.push({
          tabId: tabId,
          title: titleOf(head) || TAB_LABELS[tabId],
          body: textOf(head).toLowerCase(),
          el: head
        });
      });

      view.querySelectorAll(BLOCK_SELECTOR).forEach(function (block) {
        if (seen.has(block)) return;
        seen.add(block);
        var title = titleOf(block);
        if (!title) return;
        entries.push({
          tabId: tabId,
          title: title,
          body: textOf(block).toLowerCase(),
          el: block
        });
      });
    });

    return entries;
  }

  function score(entry, terms) {
    var title = entry.title.toLowerCase();
    var total = 0;
    for (var i = 0; i < terms.length; i++) {
      var term = terms[i];
      if (title === term) total += 100;
      else if (title.indexOf(term) === 0) total += 60;
      else if (title.indexOf(term) !== -1) total += 40;
      else if (entry.body.indexOf(term) !== -1) total += 10;
      else return -1;
    }
    return total;
  }

  function snippetFor(entry, terms) {
    if (!entry.el) return '';
    var body = entry.body;
    var idx = -1;
    for (var i = 0; i < terms.length && idx === -1; i++) idx = body.indexOf(terms[i]);
    if (idx === -1) idx = 0;
    var start = Math.max(0, idx - 30);
    var snippet = body.slice(start, start + 90).trim();
    return (start > 0 ? '…' : '') + snippet + (start + 90 < body.length ? '…' : '');
  }

  document.addEventListener('DOMContentLoaded', function () {
    var toggle = document.getElementById('search-toggle');
    var overlay = document.getElementById('search-overlay');
    var backdrop = document.getElementById('search-backdrop');
    var input = document.getElementById('search-input');
    var resultsEl = document.getElementById('search-results');
    var emptyEl = document.getElementById('search-empty');
    var hintEl = document.querySelector('.search-hint');
    if (!toggle || !overlay || !input || !resultsEl) return;

    var index = null;
    var activeIndex = -1;
    var currentResults = [];

    function getIndex() {
      if (!index) index = buildIndex();
      return index;
    }

    function render(results, terms) {
      currentResults = results;
      activeIndex = results.length ? 0 : -1;
      resultsEl.innerHTML = '';
      results.forEach(function (entry, i) {
        var row = document.createElement('button');
        row.type = 'button';
        row.className = 'search-result' + (i === 0 ? ' active' : '');
        row.setAttribute('role', 'option');

        var chip = document.createElement('span');
        chip.className = 'chip';
        chip.textContent = TAB_LABELS[entry.tabId] || entry.tabId;

        var meta = document.createElement('span');
        meta.className = 'meta';
        var titleEl = document.createElement('span');
        titleEl.className = 'title';
        titleEl.textContent = entry.title;
        meta.appendChild(titleEl);

        var snippet = terms.length ? snippetFor(entry, terms) : '';
        if (snippet) {
          var snippetEl = document.createElement('span');
          snippetEl.className = 'snippet';
          snippetEl.textContent = snippet;
          meta.appendChild(document.createElement('br'));
          meta.appendChild(snippetEl);
        }

        row.appendChild(chip);
        row.appendChild(meta);
        row.addEventListener('mouseenter', function () { setActive(i); });
        row.addEventListener('click', function () { select(entry); });
        resultsEl.appendChild(row);
      });
    }

    function setActive(i) {
      activeIndex = i;
      var rows = resultsEl.querySelectorAll('.search-result');
      rows.forEach(function (r, idx) { r.classList.toggle('active', idx === i); });
      if (rows[i]) rows[i].scrollIntoView({ block: 'nearest' });
    }

    function runQuery() {
      var raw = input.value.trim().toLowerCase();
      if (!raw) {
        emptyEl.hidden = true;
        hintEl.hidden = false;
        render(PAGE_ENTRIES, []);
        return;
      }
      hintEl.hidden = true;
      var terms = raw.split(/\s+/).filter(Boolean);
      var scored = getIndex()
        .map(function (entry) { return { entry: entry, s: score(entry, terms) }; })
        .filter(function (r) { return r.s >= 0; })
        .sort(function (a, b) { return b.s - a.s; })
        .slice(0, 8)
        .map(function (r) { return r.entry; });

      emptyEl.hidden = scored.length !== 0;
      render(scored, terms);
    }

    function select(entry) {
      close();
      if (window.LAIRR && window.LAIRR.showTab) {
        window.LAIRR.showTab(entry.tabId, entry.el ? { skipScroll: true } : {});
      }
      if (entry.el) {
        requestAnimationFrame(function () {
          requestAnimationFrame(function () {
            entry.el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            entry.el.classList.add('search-target-flash');
            setTimeout(function () { entry.el.classList.remove('search-target-flash'); }, 1500);
          });
        });
      }
    }

    function open() {
      overlay.hidden = false;
      input.value = '';
      runQuery();
      requestAnimationFrame(function () {
        overlay.classList.add('open');
        input.focus();
      });
    }

    function close() {
      overlay.classList.remove('open');
      setTimeout(function () { overlay.hidden = true; }, 200);
    }

    toggle.addEventListener('click', function () {
      if (overlay.hidden) open(); else close();
    });
    backdrop.addEventListener('click', close);

    input.addEventListener('input', runQuery);

    overlay.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.preventDefault(); close(); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); if (currentResults.length) setActive((activeIndex + 1) % currentResults.length); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); if (currentResults.length) setActive((activeIndex - 1 + currentResults.length) % currentResults.length); return; }
      if (e.key === 'Enter') { e.preventDefault(); if (currentResults[activeIndex]) select(currentResults[activeIndex]); }
    });

    document.addEventListener('keydown', function (e) {
      var tag = (e.target && e.target.tagName || '').toLowerCase();
      var typing = tag === 'input' || tag === 'textarea' || e.target.isContentEditable;
      if ((e.key === '/' && !typing) || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k')) {
        e.preventDefault();
        if (overlay.hidden) open(); else close();
      }
    });
  });
})();
