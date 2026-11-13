(function () {
  'use strict';

  /* 1. Seamless marquees: repeat the group enough times to always fill the screen */
  var marquees = [];
  document.querySelectorAll('.marquee .track').forEach(function (track) {
    var group = track.querySelector('.group');
    if (!group) return;
    marquees.push({ track: track, html: group.outerHTML, speed: track.closest('.topbar') ? 60 : 70 });
  });

  function buildMarquees() {
    marquees.forEach(function (m) {
      m.track.innerHTML = m.html;
      var group = m.track.querySelector('.group');
      var w = group.offsetWidth;
      var vw = m.track.parentElement.offsetWidth;
      if (!w) return;
      var copies = Math.ceil(vw / w) + 1;
      var out = '';
      for (var i = 0; i < copies * 2; i++) {
        out += i === 0 ? m.html : m.html.replace('class="group"', 'class="group" aria-hidden="true"');
      }
      m.track.innerHTML = out;
      m.track.style.animationDuration = Math.round((w * copies) / m.speed) + 's';
    });
  }
  buildMarquees();
  window.addEventListener('load', buildMarquees);
  var rt;
  window.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(buildMarquees, 200);
  });

  /* 2. Mobile menu */
  var btn = document.querySelector('.menu-btn');
  var nav = document.getElementById('site-nav');
  if (btn && nav) {
    btn.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      btn.setAttribute('aria-expanded', open);
      btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    });
    nav.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        nav.classList.remove('open');
        btn.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* 3. Count-up for numeric stats */
  function countUp(el) {
    var target = parseInt(el.dataset.count, 10);
    var suffix = el.dataset.suffix || '';
    var start = null, duration = 1400;
    el.textContent = '0' + suffix;
    function step(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / duration, 1);
      el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3))) + suffix;
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  /* 4. Reveal on scroll (classes are removed afterwards so hover/click effects work normally) */
  var items = document.querySelectorAll('.reveal');
  items.forEach(function (el) { el.style.setProperty('--d', el.dataset.delay || 0); });

  function show(el) {
    el.classList.add('in');
    el.querySelectorAll('[data-count]').forEach(countUp);
    var wait = 900 + (parseInt(el.dataset.delay || 0, 10) * 110) + 100;
    setTimeout(function () {
      el.classList.remove('reveal', 'in', 'from-left', 'from-right', 'zoom');
    }, wait);
  }

  if (!('IntersectionObserver' in window)) {
    items.forEach(show);
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        show(entry.target);
        io.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -30px 0px' });
    items.forEach(function (el) { io.observe(el); });
  }

  /* 5. Stat cards: click to highlight (one at a time, click again to clear) */
  var cards = document.querySelectorAll('.stat-card');
  cards.forEach(function (card) {
    card.addEventListener('click', function () {
      var was = card.classList.contains('active');
      cards.forEach(function (c) {
        c.classList.remove('active');
        c.setAttribute('aria-pressed', 'false');
      });
      if (!was) {
        card.classList.add('active');
        card.setAttribute('aria-pressed', 'true');
      }
    });
    card.addEventListener('pointermove', function (e) {
      var r = card.getBoundingClientRect();
      card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      card.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
  });

  /* 6. Page switching (top bar + navbar never change) */
  var pages = {
    home: document.getElementById('home'),
    about: document.getElementById('about'),
    services: document.getElementById('services'),
    rituals: document.getElementById('rituals'),
    contact: document.getElementById('contact')
  };
  function route() {
    var key = (location.hash || '#home').replace('#', '');
    if (!pages[key]) key = 'home';
    Object.keys(pages).forEach(function (k) {
      if (pages[k]) pages[k].classList.toggle('active', k === key);
    });
    document.querySelectorAll('#site-nav a').forEach(function (a) {
      if (a.getAttribute('href') === '#' + key) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    window.scrollTo({ top: 0, behavior: 'auto' });
    buildMarquees(); /* widths are 0 while a page is hidden, so rebuild */
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('a[href^="#"]') : null;
    if (!a) return;
    var id = a.getAttribute('href').slice(1);
    if (!pages[id]) return;
    e.preventDefault();
    if (location.hash !== '#' + id) history.pushState(null, '', '#' + id);
    route();
  });
  window.addEventListener('popstate', route);
  route();

  /* 7. Scroll progress bar + back-to-top */
  var bar = document.getElementById('progress');
  var toTop = document.getElementById('toTop');
  function onScroll() {
    var h = document.documentElement.scrollHeight - window.innerHeight;
    var p = h > 0 ? window.scrollY / h : 0;
    if (bar) bar.style.transform = 'scaleX(' + p + ')';
    if (toTop) toTop.classList.toggle('show', window.scrollY > 600);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  if (toTop) toTop.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  /* 8. Contact form: validation, then send to WhatsApp */
  var form = document.getElementById('contactForm');
  if (form) {
    /* Your WhatsApp number: country code + number, no "+", spaces or dashes */
    var WHATSAPP_NUMBER = '919113037002';

    var ok = document.getElementById('formOk');
    var rules = {
      name:    function (v) { return v.trim().length >= 2 ? '' : 'Please enter your name.'; },
      phone:   function (v) { var d = v.replace(/\D/g, ''); return d.length >= 7 && d.length <= 15 ? '' : 'Please enter a valid phone number.'; },
      email:   function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? '' : 'Please enter a valid email address.'; },
      message: function (v) { return v.trim().length >= 10 ? '' : 'Please describe your problem (at least 10 characters).'; }
    };

    function check(input) {
      var msg = rules[input.name](input.value);
      var field = input.closest('.field');
      field.classList.toggle('invalid', !!msg);
      field.querySelector('.err').textContent = msg;
      return !msg;
    }

    form.querySelectorAll('input,textarea').forEach(function (inp) {
      inp.addEventListener('blur', function () { check(inp); });
      inp.addEventListener('input', function () {
        if (inp.closest('.field').classList.contains('invalid')) check(inp);
      });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      ok.hidden = true;

      var valid = true, first = null;
      form.querySelectorAll('input,textarea').forEach(function (inp) {
        if (!check(inp)) { valid = false; if (!first) first = inp; }
      });
      if (!valid) { first.focus(); return; }

      var d = new FormData(form);
      var text =
        '🙏 *New Enquiry – Sri Kolluru Mukambika Jyothishyalam*\n\n' +
        '*Name:* '    + d.get('name').trim()    + '\n' +
        '*Phone:* '   + d.get('phone').trim()   + '\n' +
        '*Email:* '   + d.get('email').trim()   + '\n' +
        '*Problem:* ' + d.get('message').trim();

      var url = 'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(text);

      /* must run straight from the click, or browsers block the new tab */
      var w = window.open(url, '_blank');
      if (!w) window.location.href = url;

      form.reset();
      ok.hidden = false;
    });
  }
})();