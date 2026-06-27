/* =========================================================
   Daniel & Chloe — Wedding Website
   script.js
   ========================================================= */

/* ---------------------------------------------------------
   1. CONFIG — edit everything in this block, nothing else
   --------------------------------------------------------- */
const CONFIG = {
  // Paste these from Supabase: Project Settings → API
  SUPABASE_URL: 'https://tosymztbubcntseituqp.supabase.co',        // e.g. https://xxxxx.supabase.co
  SUPABASE_ANON_KEY: 'sb_publishable_mtYAs1v8hSGYganmJrcEqg_pHm79qzw',

  // Leave WEDDING_DATE as null until the date is confirmed.
  // Once set, the countdown, "Details" section and Schema.org
  // markup should be updated to match — use ISO format:
  // '2027-06-12T14:00:00'
  WEDDING_DATE: null,

  VENUE_NAME: '',      // e.g. 'The Orangery, Kew Gardens'
  VENUE_ADDRESS: '',   // full address, used to build the map link

  HASHTAG: '#DanielAndChloe',
};

const SUPABASE_CONFIGURED =
  CONFIG.SUPABASE_URL.startsWith('https://') &&
  !CONFIG.SUPABASE_URL.includes('YOUR_SUPABASE_URL') &&
  !CONFIG.SUPABASE_ANON_KEY.includes('YOUR_SUPABASE_ANON_KEY');

let supabaseClient = null;
if (SUPABASE_CONFIGURED && window.supabase) {
  supabaseClient = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
}

/* ---------------------------------------------------------
   2. Small storage helper (guards against blocked storage —
      e.g. private browsing, or a preview sandbox — so the
      site never breaks even if storage is unavailable)
   --------------------------------------------------------- */
const storage = {
  get(key) {
    try { return window.localStorage.getItem(key); } catch (e) { return null; }
  },
  set(key, value) {
    try { window.localStorage.setItem(key, value); } catch (e) { /* no-op */ }
  },
};
const session = {
  get(key) {
    try { return window.sessionStorage.getItem(key); } catch (e) { return null; }
  },
  set(key, value) {
    try { window.sessionStorage.setItem(key, value); } catch (e) { /* no-op */ }
  },
};

/* ---------------------------------------------------------
   3. Loading screen
   --------------------------------------------------------- */
window.addEventListener('load', () => {
  const loader = document.getElementById('loading-screen');
  if (loader) {
    setTimeout(() => loader.classList.add('is-hidden'), 350);
  }
});

/* ---------------------------------------------------------
   4. Theme toggle (dark mode)
   --------------------------------------------------------- */
(function initTheme() {
  const root = document.documentElement;
  const body = document.body;
  const toggle = document.getElementById('theme-toggle');
  const sunIcon = document.getElementById('theme-icon-sun');
  const moonIcon = document.getElementById('theme-icon-moon');

  const saved = storage.get('theme');
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const initial = saved || (prefersDark ? 'dark' : 'light');
  applyTheme(initial);

  function applyTheme(theme) {
    root.setAttribute('data-theme', theme);
    body.setAttribute('data-theme', theme);
    if (toggle) toggle.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
    if (sunIcon && moonIcon) {
      sunIcon.style.display = theme === 'dark' ? 'none' : 'block';
      moonIcon.style.display = theme === 'dark' ? 'block' : 'none';
    }
  }

  if (toggle) {
    toggle.addEventListener('click', () => {
      const current = root.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      storage.set('theme', next);
    });
  }
})();

/* ---------------------------------------------------------
   5. Sticky nav background on scroll
   --------------------------------------------------------- */
(function initNavScroll() {
  const nav = document.getElementById('site-nav');
  if (!nav) return;
  const onScroll = () => {
    nav.classList.toggle('is-scrolled', window.scrollY > 40);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();

/* ---------------------------------------------------------
   6. Mobile nav drawer
   --------------------------------------------------------- */
(function initDrawer() {
  const toggle = document.getElementById('nav-toggle');
  const drawer = document.getElementById('nav-drawer');
  const overlay = document.getElementById('drawer-overlay');
  if (!toggle || !drawer || !overlay) return;

  function open() {
    drawer.classList.add('is-open');
    overlay.classList.add('is-open');
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', 'Close menu');
  }
  function close() {
    drawer.classList.remove('is-open');
    overlay.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open menu');
  }

  toggle.addEventListener('click', () => {
    drawer.classList.contains('is-open') ? close() : open();
  });
  overlay.addEventListener('click', close);
  drawer.querySelectorAll('a').forEach((a) => a.addEventListener('click', close));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
})();

/* ---------------------------------------------------------
   7. Reveal-on-scroll
   --------------------------------------------------------- */
(function initReveal() {
  const items = document.querySelectorAll('.reveal');
  if (!items.length) return;

  if (!('IntersectionObserver' in window)) {
    items.forEach((el) => el.classList.add('is-visible'));
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  items.forEach((el) => observer.observe(el));
})();

/* ---------------------------------------------------------
   8. Hero monogram — animate once per session only
   --------------------------------------------------------- */
(function initMonogram() {
  const hero = document.getElementById('hero-monogram');
  if (!hero) return;
  if (session.get('seenMonogram')) {
    hero.classList.remove('monogram--animate');
  } else {
    session.set('seenMonogram', '1');
  }
})();

/* ---------------------------------------------------------
   9. Countdown + Details section state
   --------------------------------------------------------- */
(function initDetailsAndCountdown() {
  const hasDate = !!CONFIG.WEDDING_DATE;
  const eyebrow = document.getElementById('hero-eyebrow');
  const dateLine = document.getElementById('hero-date-line');
  const countdownEl = document.getElementById('countdown');
  const tbaMessage = document.getElementById('details-tba-message');
  const detailsGrid = document.getElementById('details-grid');
  const detailDate = document.getElementById('detail-date');
  const detailVenue = document.getElementById('detail-venue');
  const mapBtn = document.getElementById('map-btn');

  if (!hasDate) {
    return; // TBA states already shown by default in the HTML
  }

  const weddingDate = new Date(CONFIG.WEDDING_DATE);
  const formatted = weddingDate.toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  if (eyebrow) eyebrow.textContent = 'Save the date';
  if (dateLine) dateLine.textContent = formatted;
  if (countdownEl) countdownEl.hidden = false;
  if (tbaMessage) tbaMessage.textContent = `We can't wait to celebrate with you on ${formatted}.`;
  if (detailsGrid) detailsGrid.hidden = false;
  if (detailDate) detailDate.textContent = formatted;
  if (detailVenue) detailVenue.textContent = CONFIG.VENUE_NAME || 'To be announced';

  if (mapBtn) {
    if (CONFIG.VENUE_ADDRESS) {
      mapBtn.removeAttribute('disabled');
      mapBtn.addEventListener('click', () => {
        const q = encodeURIComponent(CONFIG.VENUE_ADDRESS);
        window.open(`https://www.google.com/maps/search/?api=1&query=${q}`, '_blank', 'noopener');
      });
    }
  }

  function tick() {
    const now = new Date().getTime();
    const distance = weddingDate.getTime() - now;
    if (distance <= 0) {
      clearInterval(timer);
      if (eyebrow) eyebrow.textContent = "Today's the day!";
      if (countdownEl) countdownEl.hidden = true;
      return;
    }
    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((distance % (1000 * 60)) / 1000);

    setText('cd-days', days);
    setText('cd-hours', hours);
    setText('cd-mins', mins);
    setText('cd-secs', secs);
  }
  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = String(value).padStart(2, '0');
  }

  tick();
  const timer = setInterval(tick, 1000);
})();

/* ---------------------------------------------------------
   10. "Notify me" — date announcement subscribers
   --------------------------------------------------------- */
(function initNotifyForm() {
  const form = document.getElementById('notify-form');
  const status = document.getElementById('notify-status');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('notify-email').value.trim();
    if (!email) return;

    setStatus('loading', 'Saving…');

    if (!supabaseClient) {
      setStatus('error', 'Notifications aren\u2019t connected yet — add your Supabase keys in script.js to enable this.');
      return;
    }

    try {
      const { error } = await supabaseClient
        .from('date_announcements')
        .upsert({ email }, { onConflict: 'email' });
      if (error) throw error;
      setStatus('success', 'You\u2019re on the list — we\u2019ll email you the moment it\u2019s official.');
      form.reset();
    } catch (err) {
      console.error(err);
      setStatus('error', 'Something went wrong — please try again in a moment.');
    }
  });

  function setStatus(type, message) {
    if (!status) return;
    status.className = `form-status show ${type}`;
    status.textContent = message;
  }
})();

/* ---------------------------------------------------------
   11. RSVP form
   --------------------------------------------------------- */
(function initRsvpForm() {
  const form = document.getElementById('rsvp-form');
  const submitBtn = document.getElementById('rsvp-submit');
  const status = document.getElementById('rsvp-status');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validate()) return;

    const data = {
      name: document.getElementById('rsvp-name').value.trim(),
      email: document.getElementById('rsvp-email').value.trim().toLowerCase(),
      phone: document.getElementById('rsvp-phone').value.trim(),
      guests: Number(document.getElementById('rsvp-guests').value) || 1,
      attendance: form.querySelector('input[name="attendance"]:checked').value,
      meal: document.getElementById('rsvp-meal').value,
      song_request: document.getElementById('rsvp-song').value.trim(),
      dietary: document.getElementById('rsvp-dietary').value.trim(),
      message: document.getElementById('rsvp-message').value.trim(),
    };

    setLoading(true);
    setStatus('', '');

    if (!supabaseClient) {
      setLoading(false);
      setStatus('error', 'RSVPs aren\u2019t connected yet — add your Supabase keys in script.js to enable this.');
      return;
    }

    try {
      // upsert on email: resubmitting with the same email updates
      // the existing reply instead of creating a duplicate row.
      const { error } = await supabaseClient
        .from('rsvp')
        .upsert(data, { onConflict: 'email' });
      if (error) throw error;

      setLoading(false);
      if (data.attendance === 'yes') {
        setStatus('success', `Wonderful, ${data.name.split(' ')[0]} — we can't wait to celebrate with you!`);
      } else {
        setStatus('success', `Thank you for letting us know, ${data.name.split(' ')[0]} — we'll miss you!`);
      }
      form.reset();
    } catch (err) {
      console.error(err);
      setLoading(false);
      setStatus('error', 'Something went wrong sending your RSVP — please try again.');
    }
  });

  function validate() {
    let valid = true;
    const name = document.getElementById('rsvp-name');
    const email = document.getElementById('rsvp-email');
    const attendance = form.querySelector('input[name="attendance"]:checked');

    clearError('err-name'); clearError('err-email'); clearError('err-attendance');

    if (!name.value.trim()) { showError('err-name', 'Please enter your name.'); valid = false; }
    if (!email.value.trim() || !/^\S+@\S+\.\S+$/.test(email.value.trim())) {
      showError('err-email', 'Please enter a valid email.'); valid = false;
    }
    if (!attendance) { showError('err-attendance', 'Please choose an option.'); valid = false; }

    return valid;
  }
  function showError(id, msg) { const el = document.getElementById(id); if (el) el.textContent = msg; }
  function clearError(id) { const el = document.getElementById(id); if (el) el.textContent = ''; }

  function setLoading(isLoading) {
    if (!submitBtn) return;
    submitBtn.classList.toggle('is-loading', isLoading);
    submitBtn.disabled = isLoading;
  }
  function setStatus(type, message) {
    if (!status) return;
    status.className = type ? `form-status show ${type}` : 'form-status';
    status.textContent = message;
  }
})();

/* ---------------------------------------------------------
   12. Accordion (Good to Know)
   --------------------------------------------------------- */
(function initAccordion() {
  const triggers = document.querySelectorAll('.accordion-trigger');
  triggers.forEach((trigger) => {
    const panel = document.getElementById(trigger.getAttribute('aria-controls'));
    if (!panel) return;
    trigger.addEventListener('click', () => {
      const isOpen = trigger.getAttribute('aria-expanded') === 'true';
      trigger.setAttribute('aria-expanded', String(!isOpen));
      panel.style.maxHeight = isOpen ? null : panel.scrollHeight + 'px';
    });
  });
})();

/* ---------------------------------------------------------
   13. Gallery lightbox
   --------------------------------------------------------- */
(function initLightbox() {
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightbox-img');
  const closeBtn = document.getElementById('lightbox-close');
  const items = document.querySelectorAll('.gallery-item');
  if (!lightbox || !lightboxImg) return;

  items.forEach((item) => {
    item.addEventListener('click', () => {
      const img = item.querySelector('img');
      if (!img) return; // still a placeholder — nothing to enlarge yet
      lightboxImg.src = img.src;
      lightboxImg.alt = img.alt || '';
      lightbox.classList.add('is-open');
    });
  });

  function close() { lightbox.classList.remove('is-open'); lightboxImg.src = ''; }
  if (closeBtn) closeBtn.addEventListener('click', close);
  lightbox.addEventListener('click', (e) => { if (e.target === lightbox) close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
})();

/* ---------------------------------------------------------
   14. Guestbook
   --------------------------------------------------------- */
(function initGuestbook() {
  const form = document.getElementById('guestbook-form');
  const status = document.getElementById('guestbook-status');
  const wall = document.getElementById('guestbook-wall');
  if (!form || !wall) return;

  async function loadEntries() {
    if (!supabaseClient) return;
    try {
      const { data, error } = await supabaseClient
        .from('guestbook')
        .select('name, message, created_at')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      renderEntries(data || []);
    } catch (err) {
      console.error(err);
    }
  }

  function renderEntries(entries) {
    if (!entries.length) {
      wall.innerHTML = '<p class="guestbook-empty">Be the first to leave a note.</p>';
      return;
    }
    wall.innerHTML = entries.map((entry) => `
      <div class="guestbook-note">
        <p class="name">${escapeHtml(entry.name)}</p>
        <p class="msg">${escapeHtml(entry.message)}</p>
      </div>
    `).join('');
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('gb-name').value.trim();
    const message = document.getElementById('gb-message').value.trim();
    if (!name || !message) return;

    if (!supabaseClient) {
      setStatus('error', 'The guestbook isn\u2019t connected yet — add your Supabase keys in script.js to enable this.');
      return;
    }

    setStatus('loading', 'Posting…');
    try {
      const { error } = await supabaseClient.from('guestbook').insert({ name, message });
      if (error) throw error;
      setStatus('success', 'Thank you for your note!');
      form.reset();
      loadEntries();
    } catch (err) {
      console.error(err);
      setStatus('error', 'Something went wrong — please try again.');
    }
  });

  function setStatus(type, message) {
    if (!status) return;
    status.className = `form-status show ${type}`;
    status.textContent = message;
  }

  loadEntries();
})();

/* ---------------------------------------------------------
   15. Back to top
   --------------------------------------------------------- */
(function initBackToTop() {
  const btn = document.getElementById('back-to-top');
  if (!btn) return;
  window.addEventListener('scroll', () => {
    btn.classList.toggle('show', window.scrollY > 600);
  }, { passive: true });
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
})();

/* ---------------------------------------------------------
   16. Footer year
   --------------------------------------------------------- */
(function initFooterYear() {
  const el = document.getElementById('footer-year');
  if (el) el.textContent = new Date().getFullYear();
})();
