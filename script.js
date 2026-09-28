(() => {
  /* ===========================================================
     01. SHARED MODAL SYSTEM
     =========================================================== */
  const modalRoot = document.getElementById('modal-root');
  let lastFocused = null;

  const closeModal = () => {
    const backdrop = modalRoot?.querySelector('.modal-backdrop');
    if (!backdrop) return;
    backdrop.remove();
    document.body.style.overflow = '';
    lastFocused?.focus?.();
  };

  const openModal = (content, label = 'Dialog') => {
    if (!modalRoot) return;
    lastFocused = document.activeElement;
    modalRoot.innerHTML = `<div class="modal-backdrop" role="presentation"><section class="modal" role="dialog" aria-modal="true" aria-label="${label}"><button class="modal-close" type="button" aria-label="Close dialog">×</button>${content}</section></div>`;
    document.body.style.overflow = 'hidden';
    const backdrop = modalRoot.querySelector('.modal-backdrop');
    const modal = modalRoot.querySelector('.modal');
    modalRoot.querySelector('.modal-close').addEventListener('click', closeModal);
    backdrop.addEventListener('click', (event) => { if (event.target === backdrop) closeModal(); });
    modal.querySelector('button, a, input, select')?.focus();
  };

  const successContent = (title, message) => `
    <div class="success-state">
      <div class="success-mark" aria-hidden="true">✓</div>
      <span class="modal-kicker">Registration received</span>
      <h2>${title}</h2>
      <p class="modal-lead">${message}</p>
      <div class="modal-actions"><button class="primary-button" type="button" data-finish>Done</button></div>
    </div>`;

  const wireForm = (form, title, message) => {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      const modal = modalRoot.querySelector('.modal');
      modal.innerHTML = successContent(title, message);
      modal.querySelector('[data-finish]').addEventListener('click', closeModal);
    });
  };

  /* ===========================================================
     02. VISITOR REGISTRATION FORM
     =========================================================== */
  const visitorForm = () => {
    openModal(`
      <span class="modal-kicker">Free visitor access</span>
      <h2>Register as a Visitor</h2>
      <p class="modal-lead">Join us at BNMPC Campus from October 29–31, 2026.</p>
      <form class="registration-form" id="visitor-form">
        <div class="field"><label for="visitor-name">Full Name</label><input id="visitor-name" name="name" autocomplete="name" required></div>
        <div class="field"><label for="visitor-institution">Institution</label><input id="visitor-institution" name="institution" required></div>
        <div class="field"><label for="visitor-email">Email Address</label><input id="visitor-email" name="email" type="email" autocomplete="email" required></div>
        <div class="field"><label for="visitor-phone">Phone Number</label><input id="visitor-phone" name="phone" type="tel" inputmode="tel" autocomplete="tel" required></div>
        <div class="field full"><label for="visitor-address">Address / District</label><textarea id="visitor-address" name="address" autocomplete="street-address" required></textarea></div>
        <p class="form-note">This preview confirms your form on screen. Online data storage will be connected when the official registration system is announced.</p>
        <button class="submit-button primary-button" type="submit">Submit Registration</button>
      </form>`, 'Visitor registration');
    wireForm(document.getElementById('visitor-form'), 'Thank you!', 'Your visitor registration has been received successfully.');
  };

  /* ===========================================================
     03. VISITOR / PARTICIPANT CHOICE
     =========================================================== */
  const registrationChoice = () => {
    openModal(`
      <span class="modal-kicker">3rd BNMPC National Science Carnival</span>
      <h2>How would you like to join?</h2>
      <p class="modal-lead">Visitor entry is free. Participants can select a competition segment before registering.</p>
      <div class="register-choice">
        <button class="choice-card" type="button" data-visitor-choice><span class="choice-visual" aria-hidden="true"><svg viewBox="0 0 32 32"><path d="M16 17a6 6 0 1 0 0-12 6 6 0 0 0 0 12Z"/><path d="M5.5 28c.8-5.2 4.3-8 10.5-8s9.7 2.8 10.5 8"/><path d="M24 8h5v8h-5"/></svg></span><strong>Register as Visitor</strong><span>Visit the exhibitions and experience the carnival.</span></button>
        <a class="choice-card" href="events.html"><span class="choice-visual" aria-hidden="true"><svg viewBox="0 0 32 32"><path d="M10 5h12v5c0 6-2.7 9-6 9s-6-3-6-9V5Z"/><path d="M10 8H5c0 5 2.1 8 6.4 8M22 8h5c0 5-2.1 8-6.4 8M16 19v5M11 28h10M13 24h6v4"/></svg></span><strong>Register as Participant</strong><span>Choose an event and enter the competition.</span></a>
      </div>`, 'Registration options');
    modalRoot.querySelector('[data-visitor-choice]').addEventListener('click', visitorForm);
  };

  document.querySelectorAll('[data-register-trigger]').forEach(button => button.addEventListener('click', registrationChoice));

  /* ===========================================================
     04. EVENT-SPECIFIC PARTICIPANT FORM
     =========================================================== */
  const participantForm = (eventName) => {
    const isTeam = /Wall Magazine|Marvel|General Knowledge|Robo Soccer|Valorant/.test(eventName);
    openModal(`
      <span class="modal-kicker">Participant registration</span>
      <h2>${eventName}</h2>
      <p class="modal-lead">Complete the preliminary form below. Official category and event-specific fields can be updated later.</p>
      <form class="registration-form" id="participant-form">
        <div class="field"><label for="participant-name">${isTeam ? 'Team Leader' : 'Participant'} Name</label><input id="participant-name" name="name" autocomplete="name" required></div>
        <div class="field"><label for="participant-institution">Institution</label><input id="participant-institution" name="institution" required></div>
        <div class="field"><label for="participant-class">Class / Grade</label><input id="participant-class" name="class" required></div>
        <div class="field"><label for="participant-category">Category</label><select id="participant-category" name="category" required><option value="">Select category</option><option>Junior</option><option>Secondary</option><option>Higher Secondary</option></select></div>
        <div class="field"><label for="participant-email">Email Address</label><input id="participant-email" name="email" type="email" autocomplete="email" required></div>
        <div class="field"><label for="participant-phone">Phone Number</label><input id="participant-phone" name="phone" type="tel" inputmode="tel" autocomplete="tel" required></div>
        ${isTeam ? '<div class="field full"><label for="team-name">Team Name</label><input id="team-name" name="teamName" required></div><div class="field full"><label for="team-members">Team Members</label><textarea id="team-members" name="teamMembers" placeholder="Write each member name on a new line" required></textarea></div>' : ''}
        <div class="field full"><label for="guardian-contact">Teacher / Guardian Contact</label><input id="guardian-contact" name="guardian" type="tel" inputmode="tel" required></div>
        <div class="field full"><label for="participant-address">Address / District</label><textarea id="participant-address" name="address" required></textarea></div>
        <p class="form-note">By submitting, you confirm that the information is accurate and agree to follow the official event rules when published.</p>
        <button class="submit-button primary-button" type="submit">Submit Registration</button>
      </form>`, `${eventName} registration`);
    wireForm(document.getElementById('participant-form'), 'Registration noted', `Thank you for choosing ${eventName}. Your preliminary registration has been received.`);
  };

  /* ===========================================================
     05. EVENT DETAILS POPUPS AND CARD BUTTONS
     =========================================================== */
  document.querySelectorAll('.details-button').forEach(button => {
    button.addEventListener('click', () => {
      const card = button.closest('.event-card');
      const eventName = card.dataset.event;
      openModal(`
        <span class="modal-kicker">Event ${card.dataset.icon} · Preliminary details</span>
        <h2>${eventName}</h2>
        <p class="modal-lead">${card.dataset.description}</p>
        <div class="detail-meta">
          <div><span>Format</span><strong>${card.dataset.format}</strong></div>
          <div><span>Venue</span><strong>BNMPC Campus</strong></div>
          <div><span>Event dates</span><strong>October 29–31, 2026</strong></div>
          <div><span>Official rules</span><strong>Will be updated</strong></div>
        </div>
        <div class="modal-actions"><button class="ghost-button" type="button" data-cancel>Close</button><button class="primary-button" type="button" data-register-event>Register Now</button></div>`, `${eventName} details`);
      modalRoot.querySelector('[data-cancel]').addEventListener('click', closeModal);
      modalRoot.querySelector('[data-register-event]').addEventListener('click', () => participantForm(eventName));
    });
  });

  document.querySelectorAll('.event-register').forEach(button => {
    button.addEventListener('click', () => participantForm(button.closest('.event-card').dataset.event));
  });

  /* ===========================================================
     06. KEYBOARD ACCESSIBILITY
     =========================================================== */
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeModal();
    if (event.key === 'Tab') {
      const modal = modalRoot?.querySelector('.modal');
      if (!modal) return;
      const focusable = [...modal.querySelectorAll('button, a[href], input, select, textarea')].filter(el => !el.disabled);
      if (!focusable.length) return;
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });

  /* ===========================================================
     07. SCHEDULE DAY NAVIGATION
     All three charts remain visible. Clicking a day scrolls to it.
     =========================================================== */
  const dayTabs = [...document.querySelectorAll('.day-tab')];
  const scheduleBoards = [...document.querySelectorAll('[data-schedule-day]')];
  const selectScheduleDay = (day) => {
    dayTabs.forEach(tab => {
      const selected = tab.dataset.day === String(day);
      tab.classList.toggle('active', selected);
      tab.setAttribute('aria-pressed', String(selected));
    });
  };
  dayTabs.forEach(tab => tab.addEventListener('click', () => {
    selectScheduleDay(tab.dataset.day);
    document.getElementById(`day-${tab.dataset.day}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }));
  if (scheduleBoards.length && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      const visible = entries.filter(entry => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible) selectScheduleDay(visible.target.dataset.scheduleDay);
    }, { rootMargin: '-210px 0px -48% 0px', threshold: [0, .15, .35] });
    scheduleBoards.forEach(board => observer.observe(board));
  }

  /* ===========================================================
     08. ORGANIZING COMMITTEE STUDENT / TEACHER SWITCH
     =========================================================== */
  const committeeTabs = [...document.querySelectorAll('.committee-tab')];
  committeeTabs.forEach(tab => tab.addEventListener('click', () => {
    committeeTabs.forEach(item => {
      const selected = item === tab;
      item.classList.toggle('active', selected);
      item.setAttribute('aria-selected', String(selected));
    });
    document.querySelectorAll('.committee-panel').forEach(panel => {
      const selected = panel.id === `${tab.dataset.committee}-committee`;
      panel.hidden = !selected;
      panel.classList.toggle('active', selected);
    });
  }));

  /* ===========================================================
     09. LIVE EVENT COUNTDOWN
     =========================================================== */
  const countdown = () => {
    const target = new Date('2026-10-29T08:00:00+06:00').getTime();
    const now = Date.now();
    const distance = Math.max(0, target - now);
    const values = {
      days: Math.floor(distance / 86400000),
      hours: Math.floor((distance % 86400000) / 3600000),
      minutes: Math.floor((distance % 3600000) / 60000),
      seconds: Math.floor((distance % 60000) / 1000)
    };
    Object.entries(values).forEach(([key, value]) => {
      const node = document.getElementById(key);
      if (node) node.textContent = key === 'days' ? String(value).padStart(3, '0') : String(value).padStart(2, '0');
    });
  };
  countdown();
  if (document.getElementById('days')) setInterval(countdown, 1000);

  /* ===========================================================
     10. DESKTOP EVENT-LOGO PARALLAX
     =========================================================== */
  const parallax = document.querySelector('[data-parallax]');
  if (parallax && matchMedia('(pointer:fine)').matches && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.addEventListener('pointermove', event => {
      const x = (event.clientX / innerWidth - .5) * 9;
      const y = (event.clientY / innerHeight - .5) * -7;
      parallax.style.transform = `rotateY(${x}deg) rotateX(${y}deg)`;
    });
    document.addEventListener('pointerleave', () => { parallax.style.transform = ''; });
  }
})();
