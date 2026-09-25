(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    var modal = document.getElementById('news-modal');
    if (!modal) return;

    var content = modal.querySelector('.nm-content');
    var lastTrigger = null;

    function openModal(trigger) {
      var templateId = trigger.getAttribute('data-news-modal');
      var template = document.getElementById(templateId);
      if (!template) return;

      content.innerHTML = '';
      content.appendChild(template.content.cloneNode(true));

      lastTrigger = trigger;
      modal.hidden = false;
      document.body.style.overflow = 'hidden';
      modal.querySelector('.nm-close').focus();
    }

    function closeModal() {
      if (modal.hidden) return;
      modal.hidden = true;
      document.body.style.overflow = '';
      if (lastTrigger) { lastTrigger.focus(); }
    }

    document.addEventListener('click', function (e) {
      var closeTarget = e.target.closest('[data-nm-close]');
      if (closeTarget) {
        closeModal();
        return;
      }

      if (e.target.closest('a, button')) return;

      var trigger = e.target.closest('[data-news-modal]');
      if (trigger) { openModal(trigger); }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !modal.hidden) {
        closeModal();
        return;
      }
      if ((e.key === 'Enter' || e.key === ' ') && document.activeElement && document.activeElement.hasAttribute('data-news-modal')) {
        e.preventDefault();
        openModal(document.activeElement);
      }
    });
  });
})();
