(function registerDocsRuntimeContent(windowObj){
  'use strict';

  if(!windowObj) return;
  windowObj.AC_RUNTIME_CONFIG = windowObj.AC_RUNTIME_CONFIG || {};

  windowObj.AC_RUNTIME_CONFIG.docsRuntime = Object.freeze({
    mobileDocsCopy: Object.freeze({
      orgName: 'ООО «ВОИП КОННЕКТ»',
      orgMeta: 'ИНН 7729713637 · РТО 025773',
      copyright: '© 2019–2026',
      links: Object.freeze([
        Object.freeze({ href:'legal.html#education-license', target:'_blank', rel:'noopener noreferrer', text:'Образовательная лицензия Л035-01298-77/01082973' }),
        Object.freeze({ href:'mailto:hello@codims.ru', text:'hello@codims.ru' }),
        Object.freeze({ href:'https://www.codims.ru/privacy', target:'_blank', rel:'noopener noreferrer', text:'Политика обработки персональных данных' }),
        Object.freeze({ href:'legal.html#legal-info', target:'_blank', rel:'noopener noreferrer', text:'Юридическая информация' }),
        Object.freeze({ href:'legal.html#org-info', target:'_blank', rel:'noopener noreferrer', text:'Сведения об организации' }),
        Object.freeze({ href:'legal.html#children-rest', target:'_blank', rel:'noopener noreferrer', text:'Отдых и оздоровление детей' }),
        Object.freeze({ href:'legal.html#partners-info', target:'_blank', rel:'noopener noreferrer', text:'Условия для партнёров' }),
        Object.freeze({ href:'legal.html#bloggers-info', target:'_blank', rel:'noopener noreferrer', text:'Сотрудничество с блогерами' })
      ])
    }),
    desktopMobileSectionTemplates: Object.freeze({
      'section-about': `
        <h3>О лагере</h3>
        <p class="section-lead">AiDaCamp — место, где ребёнок создаёт, двигается, работает в команде и уезжает со смены с понятным результатом.</p>
        <div class="mobile-about-features" id="mobileAboutFeaturesDesktop"></div>
      `,
      'section-journey': `
        <h3>Как проходит смена</h3>
        <p class="section-lead">4 шага: от быстрого включения к понятному результату за смену.</p>
        <div class="mobile-journey-flow" id="mobileJourneyContentDesktop"></div>
      `,
      'section-programs': `
        <h3>Описание смен</h3>
        <p class="section-lead">Выберите смену в селекторе — ниже покажем одну карточку с ключевыми деталями.</p>
        <div class="mobile-programs-flow" id="mobileProgramsContentDesktop"></div>
      `,
      'section-photos': `
        <h3>Фото</h3>
        <p class="section-lead">Живые кадры лагеря: занятия, бассейн, спорт, питание, команда и атмосфера.</p>
        <div class="mobile-media-filter-row" id="mobilePhotoFiltersDesktop">
          <button class="mobile-media-filter active" type="button" data-photo-filter="camp">Атмосфера</button>
          <button class="mobile-media-filter" type="button" data-photo-filter="pool">Бассейн</button>
          <button class="mobile-media-filter" type="button" data-photo-filter="sport">Спорт</button>
          <button class="mobile-media-filter" type="button" data-photo-filter="study">Учёба</button>
          <button class="mobile-media-filter" type="button" data-photo-filter="food">Питание</button>
        </div>
        <div id="mobilePhotoGalleryDesktop"></div>
      `,
      'section-videos': `
        <h3>Видео</h3>
        <p class="section-lead">Короткие видео, которые быстро объясняют, почему дети в лагере меняются сильнее, чем родители ожидают.</p>
        <div id="mobileVideoGalleryDesktop"></div>
      `,
      'section-reviews': `
        <h3>Отзывы</h3>
        <p class="section-lead">Сильный внешний social proof: реальные отзывы родителей на Яндекс Картах.</p>
        <div id="mobileReviewsGalleryDesktop"></div>
      `,
      'section-faq': `
        <h3>FAQ</h3>
        <p class="section-lead">Ключевые вопросы по медицине, безопасности, питанию и проживанию.</p>
        <div class="mobile-faq-filter-row" id="mobileFaqFiltersDesktop"></div>
        <div class="mobile-faq-accordion" id="mobileFaqListDesktop"></div>
      `,
      'section-team': `
        <h3>Команда</h3>
        <p class="section-lead">Люди, которые ведут смены и работают с детьми в проектном формате.</p>
        <div class="mobile-team-list" id="mobileInlineTeamListDesktop"></div>
      `,
      'section-stay': `
        <h3>Размещение</h3>
        <p class="section-lead">Комнаты, бытовые зоны и территория лагеря.</p>
        <div class="mobile-stay-list" id="mobileInlineStayListDesktop"></div>
      `,
      'section-contacts': `
        <h3>Контакты</h3>
        <p class="section-lead">Быстрая связь и маршрут до лагеря.</p>
        <div class="mobile-contacts-list" id="mobileInlineContactsListDesktop"></div>
        <div class="mobile-socials-row" id="mobileInlineSocialsDesktop"></div>
      `
    })
  });
})(window);
