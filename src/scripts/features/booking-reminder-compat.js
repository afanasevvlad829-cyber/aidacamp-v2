(function () {
  const initBookingReminderCompat = () => {
    if (window.__acBookingReminderCompatInit) return true;

    const root = document.querySelector('[data-booking-root]');
    if (!root) return false;

    const modal = document.getElementById('bookingReminderModal');
    const closeModal = () => modal?.close();

    root
      .querySelector('[data-booking-reminder-close]')
      ?.addEventListener('click', closeModal);

    modal?.addEventListener('click', (event) => {
      if (event.target === modal) closeModal();
    });

    const normalizePhone = (raw) => {
      let digits = String(raw || '').replace(/\D/g, '');
      if (digits.startsWith('8')) digits = `7${digits.slice(1)}`;
      if (!digits.startsWith('7')) digits = `7${digits}`;
      digits = digits.slice(0, 11);

      const parts = [
        digits[0],
        digits.slice(1, 4),
        digits.slice(4, 7),
        digits.slice(7, 9),
        digits.slice(9, 11),
      ];

      let formatted = '+7';
      if (parts[1]) formatted += ` (${parts[1]}`;
      if (parts[1]?.length === 3) formatted += ')';
      if (parts[2]) formatted += ` ${parts[2]}`;
      if (parts[3]) formatted += `-${parts[3]}`;
      if (parts[4]) formatted += `-${parts[4]}`;

      return { formatted, digits };
    };

    Array.from(root.querySelectorAll('form[data-form]')).forEach((form) => {
      const ageInput = form.querySelector('[data-age-input]');
      const ageButtons = Array.from(form.querySelectorAll('[data-age-btn]'));
      const phoneInput = form.querySelector('[data-phone-input]');
      const consent = form.querySelector('[data-consent]');
      const submit = form.querySelector('[data-submit-btn]');

      if (!(ageInput && phoneInput && consent && submit && ageButtons.length)) return;

      const setAge = (value) => {
        ageInput.value = value;
        ageButtons.forEach((btn) => {
          const active = (btn.getAttribute('data-age-value') || '') === value;
          btn.setAttribute('aria-checked', String(active));
          btn.classList.toggle('border-[#ec7c00]', active);
          btn.classList.toggle('bg-[#ec7c00]', active);
          btn.classList.toggle('text-white', active);
          btn.classList.toggle('border-[#e6e6e6]', !active);
          btn.classList.toggle('bg-white', !active);
          btn.classList.toggle('text-[#333]', !active);
        });
      };

      const isPhoneValid = () => {
        const digits = String(phoneInput.value || '').replace(/\D/g, '');
        return digits.length === 11 && digits.startsWith('7');
      };

      const syncSubmit = () => {
        submit.disabled = !(isPhoneValid() && !!consent.checked);
      };

      ageButtons.forEach((btn) => {
        btn.addEventListener('click', () => {
          setAge(btn.getAttribute('data-age-value') || '');
          syncSubmit();
        });
      });

      phoneInput.addEventListener('input', () => {
        const { formatted } = normalizePhone(phoneInput.value);
        phoneInput.value = formatted;
        syncSubmit();
      });

      consent.addEventListener('change', syncSubmit);

      form.addEventListener('submit', (event) => {
        const phoneOk = isPhoneValid();
        const consentOk = !!consent.checked;
        if (phoneOk && consentOk) return;

        event.preventDefault();
        submit.disabled = true;
        window.acTrack?.('booking_validation_error', {
          form: form.getAttribute('data-form') || '',
          phone: phoneOk ? 'ok' : 'missing',
          consent: consentOk ? 'ok' : 'missing',
        });
        modal?.showModal();
      });

      setAge(ageInput.value || ageButtons[0]?.getAttribute('data-age-value') || '');
      syncSubmit();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && modal?.open) closeModal();
    });

    window.__acBookingReminderCompatInit = true;
    return true;
  };

  const run = () => {
    if (initBookingReminderCompat()) return;
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      if (initBookingReminderCompat() || tries >= 10) {
        clearInterval(timer);
      }
    }, 100);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run, { once: true });
  } else {
    run();
  }
})();
