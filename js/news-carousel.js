(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    var carousels = Array.prototype.slice.call(document.querySelectorAll('[data-carousel]'));

    carousels.forEach(function (carousel) {
      var track = carousel.querySelector('.nc-track');
      var slides = Array.prototype.slice.call(carousel.querySelectorAll('.nc-slide'));
      var prevBtn = carousel.querySelector('.nc-prev');
      var nextBtn = carousel.querySelector('.nc-next');
      var dotsEl = carousel.querySelector('.nc-dots');

      if (!track || slides.length < 2) {
        if (prevBtn) prevBtn.style.display = 'none';
        if (nextBtn) nextBtn.style.display = 'none';
        if (dotsEl) dotsEl.style.display = 'none';
        return;
      }

      var index = 0;
      var dots = slides.map(function (_, i) {
        var dot = document.createElement('button');
        dot.type = 'button';
        dot.setAttribute('role', 'tab');
        dot.setAttribute('aria-label', 'Go to update ' + (i + 1));
        dot.addEventListener('click', function () {
          goTo(i);
          resetAutoplay();
        });
        dotsEl.appendChild(dot);
        return dot;
      });

      function render() {
        track.style.transform = 'translateX(-' + index * 100 + '%)';
        dots.forEach(function (dot, i) {
          dot.classList.toggle('active', i === index);
          dot.setAttribute('aria-selected', i === index ? 'true' : 'false');
        });
      }

      function goTo(i) {
        index = (i + slides.length) % slides.length;
        render();
      }

      prevBtn.addEventListener('click', function () {
        goTo(index - 1);
        resetAutoplay();
      });
      nextBtn.addEventListener('click', function () {
        goTo(index + 1);
        resetAutoplay();
      });

      var AUTOPLAY_MS = 7000;
      var timer = null;
      var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      function startAutoplay() {
        if (reduceMotion) return;
        stopAutoplay();
        timer = setInterval(function () { goTo(index + 1); }, AUTOPLAY_MS);
      }
      function stopAutoplay() {
        if (timer) { clearInterval(timer); timer = null; }
      }
      function resetAutoplay() { startAutoplay(); }

      carousel.addEventListener('mouseenter', stopAutoplay);
      carousel.addEventListener('mouseleave', startAutoplay);
      carousel.addEventListener('focusin', stopAutoplay);
      carousel.addEventListener('focusout', startAutoplay);

      var startX = null;
      track.addEventListener('pointerdown', function (e) {
        startX = e.clientX;
        stopAutoplay();
      });
      track.addEventListener('pointerup', function (e) {
        if (startX === null) return;
        var dx = e.clientX - startX;
        if (Math.abs(dx) > 40) { goTo(dx < 0 ? index + 1 : index - 1); }
        startX = null;
        startAutoplay();
      });

      render();
      startAutoplay();
    });
  });
})();
