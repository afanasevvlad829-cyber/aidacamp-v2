(function(){
  function createShiftOptionsFlow(ctx = {}){
    const getState = typeof ctx.getState === 'function' ? ctx.getState : (() => ({}));
    const getShifts = typeof ctx.getShifts === 'function' ? ctx.getShifts : (() => []);
    const parseShiftDate = typeof ctx.parseShiftDate === 'function' ? ctx.parseShiftDate : (() => null);
    const formatPrice = typeof ctx.formatPrice === 'function' ? ctx.formatPrice : ((value) => String(value || ''));
    const shiftDaysLabel = typeof ctx.shiftDaysLabel === 'function' ? ctx.shiftDaysLabel : (() => '');
    const hasSelectedAge = typeof ctx.hasSelectedAge === 'function' ? ctx.hasSelectedAge : (() => false);
    const syncGuidedState = typeof ctx.syncGuidedState === 'function' ? ctx.syncGuidedState : (() => {});
    const showHint = typeof ctx.showHint === 'function' ? ctx.showHint : (() => {});
    const nudgeUserToNextStep = typeof ctx.nudgeUserToNextStep === 'function' ? ctx.nudgeUserToNextStep : (() => {});
    const selectShift = typeof ctx.selectShift === 'function' ? ctx.selectShift : (() => {});
    const closeTransientModals = typeof ctx.closeTransientModals === 'function' ? ctx.closeTransientModals : (() => {});
    const applyCompactSectionModalLayout = typeof ctx.applyCompactSectionModalLayout === 'function' ? ctx.applyCompactSectionModalLayout : (() => {});
    const resolveViewKey = typeof ctx.resolveViewKey === 'function' ? ctx.resolveViewKey : ((viewKey) => viewKey === 'mobile' ? 'mobile' : 'desktop');
    const resolveShiftOptionsTargetId = typeof ctx.resolveShiftOptionsTargetId === 'function' ? ctx.resolveShiftOptionsTargetId : (() => '');
    const getShiftOptionPanels = typeof ctx.getShiftOptionPanels === 'function' ? ctx.getShiftOptionPanels : (() => ({
      desktop:{aboutId:null, calendarId:null},
      mobile:{aboutId:null, calendarId:null}
    }));

    function getShiftSummaryLines(ageKey){
      const summaryByAge = {
        '7-9': [
          'IT-проекты: Scratch / Python',
          'Бассейн каждый день',
          'Живая среда без гаджетного залипания',
          'Подходит для 7–9 лет'
        ],
        '10-12': [
          'Python и командные мини-спринты',
          'Бассейн и спорт ежедневно',
          'Командные роли и самостоятельность',
          'Подходит для 10–12 лет'
        ],
        '13-14': [
          'AI-практика и проектная защита',
          'Спорт + живая лагерная среда',
          'Меньше телефонов, больше результата',
          'Подходит для 13–14 лет'
        ]
      };
      return summaryByAge[ageKey] || summaryByAge['7-9'];
    }

    function normalizeShiftText(value){
      return String(value || '').replace(/\s+/g, ' ').trim();
    }

    function getShiftAgeFocusedDescription(shift, ageKey){
      if(!shift) return '';
      const full = String(shift.fullDesc || '').replace(/\r/g, '').trim();
      if(!full) return shift.desc || '';
      const compact = normalizeShiftText(full);
      const firstPart = normalizeShiftText(
        compact.split(/Для\s+(?:7[–-]9|10[–-]12|13[–-]14)\s+лет:/i)[0] || ''
      );

      const markerPatternByAge = {
        '7-9': 'Для\\s+7[–-]9\\s+лет:',
        '10-12': 'Для\\s+10[–-]12\\s+лет:',
        '13-14': 'Для\\s+13[–-]14\\s+лет:'
      };
      const ageLabelByAge = {
        '7-9': 'Для 7–9 лет:',
        '10-12': 'Для 10–12 лет:',
        '13-14': 'Для 13–14 лет:'
      };
      const markerPattern = markerPatternByAge[ageKey] || markerPatternByAge['7-9'];
      const ageLabel = ageLabelByAge[ageKey] || ageLabelByAge['7-9'];
      const agePartMatch = compact.match(
        new RegExp(`${markerPattern}\\s*([\\s\\S]*?)(?=\\s*Для\\s+(?:7[–-]9|10[–-]12|13[–-]14)\\s+лет:|$)`, 'i')
      );
      const agePart = normalizeShiftText(agePartMatch?.[1] || '');

      const sentences = compact.match(/[^.!?]+[.!?]?/g) || [];
      const finalPart = normalizeShiftText((sentences.length && sentences[sentences.length - 1]) || '');

      const result = [];
      if(firstPart) result.push(firstPart);
      if(agePart) result.push(`${ageLabel} ${agePart}`);
      if(finalPart && !result.includes(finalPart)){
        result.push(finalPart);
      }
      return result.join(' ').trim();
    }

    function getShiftDisplayDescription(shift){
      if(!shift) return '';
      if(!hasSelectedAge()) return shift.desc || '';
      const state = getState();
      return getShiftAgeFocusedDescription(shift, state.age || '7-9');
    }

    function openShiftAboutModal(shiftId){
      const state = getState();
      const shifts = getShifts();
      const modal = document.getElementById('sectionModal');
      const titleEl = document.getElementById('sectionModalTitle');
      const bodyEl = document.getElementById('sectionModalBody');
      const shift = shifts.find((item) => item.id === shiftId);
      if(!modal || !titleEl || !bodyEl || !shift) return false;

      closeTransientModals('section');
      const isCompactDesktop = state.previewView === 'desktop' && state.desktopMode === 'compact';
      const isMobilePanel = state.previewView === 'mobile';
      modal.classList.toggle('section-modal-compact', isCompactDesktop);
      modal.classList.toggle('section-modal-mobile', isMobilePanel);

      const start = parseShiftDate(shift.start);
      const end = parseShiftDate(shift.end);
      const startText = (start && start.toLocaleDateString('ru-RU')) || shift.start;
      const endText = (end && end.toLocaleDateString('ru-RU')) || shift.end;
      const summaryLines = getShiftSummaryLines(state.age || '7-9');

      titleEl.textContent = `${shift.label || `Смена ${shift.title}`}: программа`;
      bodyEl.innerHTML = `
        <article class="shift-modal-content">
          <div class="shift-modal-content__meta">
            <strong>${shift.dates}</strong>
            <span>${formatPrice(shift.price)} · ${shiftDaysLabel(shift)} · осталось ${shift.left} мест</span>
          </div>
          <p class="shift-modal-content__desc"><strong>Коротко:</strong> ${shift.desc}</p>
          <p class="shift-modal-content__desc"><strong>Подробно:</strong> ${getShiftDisplayDescription(shift)}</p>
          <ul class="shift-modal-content__list">
            ${summaryLines.map((line) => `<li>${line}</li>`).join('')}
          </ul>
          <div class="shift-modal-content__dates">
            <div><strong>Заезд:</strong> ${startText}</div>
            <div><strong>Выезд:</strong> ${endText}</div>
          </div>
        </article>
      `;

      modal.classList.remove('hidden');
      applyCompactSectionModalLayout();
      return true;
    }

    function renderShiftOptions(viewKey){
      const state = getState();
      const shifts = getShifts();
      const safeViewKey = resolveViewKey(viewKey);
      const targetId = resolveShiftOptionsTargetId(safeViewKey);
      const box = document.getElementById(targetId);
      if(!box) return;

      const selectedAge = state.age || '7-9';
      const summaryLines = getShiftSummaryLines(selectedAge);
      const shiftOptionPanels = getShiftOptionPanels();

      box.innerHTML = shifts.slice(0, 2).map((shift) => {
        const isInlineView = safeViewKey === 'mobile';
        const showAbout = isInlineView && shiftOptionPanels[safeViewKey]?.aboutId === shift.id;
        const showCalendar = isInlineView && shiftOptionPanels[safeViewKey]?.calendarId === shift.id;
        const start = parseShiftDate(shift.start);
        const end = parseShiftDate(shift.end);
        const startText = (start && start.toLocaleDateString('ru-RU')) || shift.start;
        const endText = (end && end.toLocaleDateString('ru-RU')) || shift.end;

        return `
        <div class="shift-option ${state.shiftId === shift.id ? 'active' : ''}" data-id="${shift.id}">
          <div class="shift-option-head">
            <strong>
              <span class="shift-option-dates">${shift.dates}</span>
            </strong>
            <small>
              <span class="shift-option-seats">осталось ${shift.left} мест</span>
              <span class="shift-option-price-row">
                <span class="shift-option-price">${formatPrice(shift.price)}</span>
                <span class="shift-option-inline-actions">
                  <button class="shift-option-action shift-option-action-info" type="button" data-action="toggle-shift-about" data-shift-id="${shift.id}" data-shift-view="${safeViewKey}" aria-label="Описание смены ${shift.dates}">
                    <img class="ac-icon" src="/assets/icons/info.svg" alt="" aria-hidden="true">
                  </button>
                  <button class="shift-option-action shift-option-action-calendar" type="button" data-action="toggle-shift-calendar-inline" data-shift-id="${shift.id}" data-shift-view="${safeViewKey}" aria-label="Календарь ${shift.dates}">
                    <img class="ac-icon" src="/assets/icons/calendar.svg" alt="" aria-hidden="true">
                  </button>
                  <button class="shift-option-select-indicator" type="button" aria-label="Выбрать смену ${shift.dates}">
                    <img class="ac-icon" src="/assets/icons/chevron-right.svg" alt="" aria-hidden="true">
                  </button>
                </span>
              </span>
            </small>
          </div>
          <div class="shift-inline-panel ${showAbout ? 'visible' : ''}">
            <ul>
              ${summaryLines.map((line) => `<li>${line}</li>`).join('')}
            </ul>
          </div>
          <div class="shift-inline-panel shift-inline-calendar ${showCalendar ? 'visible' : ''}">
            <div><strong>Заезд:</strong> ${startText}</div>
            <div><strong>Выезд:</strong> ${endText}</div>
            <div><strong>Длительность:</strong> ${shiftDaysLabel(shift)}</div>
          </div>
        </div>
      `;
      }).join('');

      box.querySelectorAll('.shift-option').forEach((el) => {
        el.addEventListener('click', (event) => {
          if(event.target.closest('.shift-option-action')){
            return;
          }
          if(!hasSelectedAge()){
            showHint('Сначала выберите возраст ребёнка', 'age');
            nudgeUserToNextStep('Сначала выберите возраст ребёнка — тогда откроется список смен.');
            return;
          }
          selectShift(el.dataset.id);
        });
      });
    }

    function renderShiftCards(){
      syncGuidedState();
      const shifts = getShifts();
      const grid = document.getElementById('shiftCardsGrid');
      if(!grid) return;
      const shortGrid = document.getElementById('shortShiftCards');
      const mainShifts = shifts.filter((shift) => !shift.isShort);
      const shortShifts = shifts.filter((shift) => !!shift.isShort);
      const showExtendedDescription = hasSelectedAge();
      const cleanShiftCardTitle = (title) => {
        const raw = String(title || '').trim();
        const cleaned = raw
          .replace(/^\s*\d+(?:[.,]\d+)?\s*[\])}.:\-–—,]?\s*/u, '')
          .replace(/^(?:TT|ТТ)\s*[\d.]+[\s:.\-–—]*/iu, '')
          .trim();
        return cleaned || raw;
      };

      grid.innerHTML = mainShifts.map((shift) => `
        <div class="mini-card">
          <h4>${cleanShiftCardTitle(shift.title)}</h4>
          <div class="price-row">
            <strong>${formatPrice(shift.price)}</strong>
            <span class="price-row-actions">
              <button class="shift-calendar-btn shift-about-btn" type="button" data-action="toggle-shift-about" data-shift-id="${shift.id}" aria-label="Описание смены ${shift.title}">
                <img class="ac-icon" src="/assets/icons/info.svg" alt="" aria-hidden="true">
              </button>
              <button class="shift-calendar-btn" type="button" data-action="open-calendar" data-shift-id="${shift.id}" aria-label="Календарь ${shift.title}">
                <img class="ac-icon" src="/assets/icons/calendar.svg" alt="" aria-hidden="true">
              </button>
            </span>
          </div>
          <div class="price-row-meta">${shift.dates} · ${shiftDaysLabel(shift)}</div>
          ${showExtendedDescription
            ? `
              <p><strong>Коротко:</strong> ${shift.desc || ''}</p>
              <p><strong>Подробно:</strong> ${getShiftDisplayDescription(shift)}</p>
            `
            : `<p>${shift.desc || ''}</p>`
          }
        </div>
      `).join('');

      if(shortGrid){
        shortGrid.innerHTML = shortShifts.map((shift) => `
          <div class="mini-card short-shift-card">
            <div class="short-shift-head">
              <h4>${cleanShiftCardTitle(shift.title)}</h4>
              <span class="short-shift-tag">короткая смена</span>
            </div>
            <div class="price-row">
              <strong>${formatPrice(shift.price)}</strong>
              <span class="price-row-actions">
                <button class="shift-calendar-btn shift-about-btn" type="button" data-action="toggle-shift-about" data-shift-id="${shift.id}" aria-label="Описание смены ${shift.title}">
                  <img class="ac-icon" src="/assets/icons/info.svg" alt="" aria-hidden="true">
                </button>
                <button class="shift-calendar-btn" type="button" data-action="open-calendar" data-shift-id="${shift.id}" aria-label="Календарь ${shift.title}">
                  <img class="ac-icon" src="/assets/icons/calendar.svg" alt="" aria-hidden="true">
                </button>
              </span>
            </div>
            <div class="price-row-meta">${shift.dates}</div>
            ${showExtendedDescription
              ? `<p><strong>Коротко:</strong> ${shift.desc || ''}</p>`
              : `<p>${shift.desc || ''}</p>`
            }
          </div>
        `).join('');
        shortGrid.closest('.programs-short-block')?.classList.remove('hidden');
      }
    }

    return Object.freeze({
      getShiftDisplayDescription,
      openShiftAboutModal,
      renderShiftOptions,
      renderShiftCards
    });
  }

  window.AC_FEATURES = window.AC_FEATURES || {};
  window.AC_FEATURES.shiftOptionsFlow = Object.freeze({ create: createShiftOptionsFlow });
})();
