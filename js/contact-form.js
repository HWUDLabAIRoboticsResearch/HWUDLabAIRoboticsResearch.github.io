(function () {
  'use strict';
  var CONTACT_CONFIG = {
    endpoint: 'https://script.google.com/macros/s/AKfycbwt1GJ-unvsTM1Lv-Q-2y4PkbzEC5vCkHFVrC1K1MErL6OumvFEHK5QogjkuMvROfrnLA/exec'
  };

  function isPlaceholder(v) {
    return !v || v.indexOf('PASTE_YOUR') === 0;
  }

  document.addEventListener('DOMContentLoaded', function () {
    var form = document.getElementById('contact-form');
    if (!form) return;

    var statusEl = document.getElementById('cf-status');
    var submitBtn = document.getElementById('cf-submit');
    var submitBtnDefaultHTML = submitBtn.innerHTML;

    function showStatus(kind, message) {
      statusEl.textContent = message;
      statusEl.className = 'form-status visible ' + kind;
    }

    function resetButton() {
      submitBtn.disabled = false;
      submitBtn.innerHTML = submitBtnDefaultHTML;
    }

    function sendPayload() {
      var honeypot = form.querySelector('[name="website"]');
      var payload = {
        name: form.querySelector('[name="name"]').value.trim(),
        email: form.querySelector('[name="email"]').value.trim(),
        organization: form.querySelector('[name="organization"]').value.trim(),
        message: form.querySelector('[name="message"]').value.trim(),
        website: honeypot ? honeypot.value : ''
      };

      fetch(CONTACT_CONFIG.endpoint, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      })
        .then(function () {
          showStatus('success', "Thanks — your message has been sent. We'll get back to you soon.");
          form.reset();
        })
        .catch(function () {
          showStatus('error', 'Something went wrong sending your message. Please try again or email us directly.');
        })
        .finally(resetButton);
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      statusEl.className = 'form-status';

      if (isPlaceholder(CONTACT_CONFIG.endpoint)) {
        showStatus('error', "The contact form isn't connected yet — please email us directly for now.");
        return;
      }

      var honeypot = form.querySelector('[name="website"]');
      if (honeypot && honeypot.value) {
        showStatus('success', "Thanks — your message has been sent. We'll get back to you soon.");
        form.reset();
        return;
      }

      var name = form.querySelector('[name="name"]').value.trim();
      
      var email = form.querySelector('[name="email"]').value.trim();
      var message = form.querySelector('[name="message"]').value.trim();
      if (!name || !email || !message) {
        showStatus('error', 'Please fill in your name, email, and message.');
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending…';
      sendPayload();
    });
  });
})();
