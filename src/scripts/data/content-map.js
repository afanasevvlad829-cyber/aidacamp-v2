(function () {
  "use strict";
  var ICON_MAP = (window.AC_DATA && window.AC_DATA.ICON_MAP) || {};

  var CONTENT_MAP = {
    menu: [
      { key: "info", label: "О лагере", icon: ICON_MAP.robot, href: "#program" },
      { key: "aiprogram", label: "AI программы", icon: ICON_MAP.sparkle, href: "#ai" },
      { key: "location", label: "Локация", icon: ICON_MAP.pool, href: "#location" },
      { key: "photo", label: "Фото", icon: ICON_MAP.search, href: "#photos" },
      { key: "video", label: "Видео", icon: ICON_MAP.play, href: "#video" },
      { key: "faq", label: "FAQ", icon: ICON_MAP.clipboard, href: "#faq" },
      { key: "reviews", label: "Отзывы", icon: ICON_MAP.fire, href: "#reviews" },
      { key: "team", label: "Команда", icon: ICON_MAP.check, href: "#team" }
    ],
    sectionTitles: {
      program: "Программа по возрастам",
      format: "Формат и условия",
      ai: "AI-программы",
      location: "Локация",
      photos: "Фото лагеря",
      video: "Видео",
      reviews: "Отзывы родителей",
      team: "Команда",
      faq: "FAQ"
    },
    footer: {
      brand: "© AiDaCamp",
      tagline: "Лагерь в Подмосковье для детей 7-14 лет"
    },
    ui: {
      prev: "Назад",
      next: "Вперёд",
      all: "Все",
      list: "Список",
      grid: "Плитка",
      close: "Закрыть",
      closeAria: "Закрыть",
      confirm: "Подтвердить",
      contactTitle: "Связаться",
      shiftsTitle: "Смены и цены",
      shiftsMeta: "Выберите смену по возрасту и направлению.",
      techBadge: "TECH v2026.03.21-01",
      modeCompactLabel: "Кратко",
      modeFullLabel: "Подробно",
      brandSub: "IT-лагерь 7-14 лет",
      ageLabel: "Выберите возраст",
      heroContactLabel: "Связаться",
      heroCampaignLabel: "AI-программы июнь",
      heroOverlayTitle: "ПРОГРАММА И БЕЗОПАСНОСТЬ",
      heroSafetyMedTitle: "Медик 24/7",
      heroSafetyMedDesc: "Врач на территории всю смену",
      heroSafetyLockTitle: "Охрана",
      heroSafetyLockDesc: "Закрытая территория, КПП",
      heroSafetyFoodTitle: "5-разовое питание",
      heroSafetyFoodDesc: "Горячее каждый день",
      heroSafetyPoolTitle: "Бассейн",
      heroSafetyPoolDesc: "Каждый день, тренер рядом",
      stepLabel: "Шаг",
      stepLabelDelimiter: "из",
      finalBookingCta: "Смотреть даты и цены смен",
      locationWhereTitle: "Где проходит смена",
      locationNearbyTitle: "Что рядом и внутри",
      watchVideoLabel: "Смотреть видео",
      contactMeta: "Оставьте заявку, и мы подберем смену по возрасту и интересам ребенка.",
      phoneLabel: "Телефон",
      telegramLabel: "Telegram",
      emailLabel: "Email",
      shiftPriceFrom: "от 48 000 ₽",
      yandexReviewsLabel: "Отзывы на Яндекс Картах",
      yandexReviewsUrl: "https://yandex.ru/maps/org/aydakemp/35558479035/reviews/",
      programmingBookUrl: "https://www.codims.ru/python-book"
    },
    programCards: [
      {
        title: "7-9 лет",
        text: "Scratch + базовый Python. Визуальное программирование, первые игры, логика."
      },
      {
        title: "10-12 лет",
        text: "Python + веб. Проекты на Python, основы HTML/CSS, мини-сайт."
      },
      {
        title: "13-14 лет",
        text: "AI-интенсив. Нейросети, боты, хакатон с защитой проекта."
      }
    ],
    formatCards: [
      {
        title: "Что внутри смены",
        list: [
          "IT-проекты по уровню ребёнка",
          "Бассейн каждый день",
          "Внутренняя экономика и лагерная валюта",
          "Командные активности и спорт"
        ]
      },
      {
        title: "Безопасность и условия",
        list: [
          "Медик 24/7 на территории",
          "Закрытая территория и охрана",
          "Организованный режим и звонки родителям",
          "Безопасность, условия проживания и организованный режим"
        ]
      },
      {
        title: "Бронирование и цены",
        text: "Все актуальные смены, места и финальные цены остаются в интерактивном блоке выше. Кнопка в меню ведёт прямо к нему, а форма заявки остаётся рабочей."
      }
    ],
    aiStats: [
      { value: "+43%", label: "Больше зарплата", text: "у разработчиков с AI-навыками — это +18 000 $ в год к зарплате обычного программиста." },
      { value: "<1%", label: "разработчиков владеют AI-стеком", text: "" },
      { value: "97M", label: "новых рабочих мест создаст ИИ к 2025 г. (WEF)", text: "" },
      { value: "85M", label: "рутинных должностей автоматизируют — но не творческих", text: "" },
      { value: "↑2×", label: "быстрее растут вакансии AI/ML vs обычный IT", text: "" }
    ],
    aiCopy: [
      "ИИ не заменит людей — он заменит тех, кто не умеет с ним работать.",
      "Настоящая угроза не в роботах, а в том, что ваш ребёнок вырастет потребителем ИИ, а не его создателем. Разница в доходах между этими двумя группами — уже сейчас в 3–5 раз.",
      "На нашем лагере дети за 13 дней строят реальные AI-проекты: нейросети, ботов, компьютерное зрение. Не «играют в программирование» — а создают то, что работает."
    ],
    location: {
      where: [
        "📍 60 км от Москвы · Киевское шоссе",
        "Санаторий «Изумруд», Наро-Фоминский район"
      ],
      nearby: [
        "🚗 60 км по Киевскому шоссе",
        "🚌 Трансфер от м. Юго-Западная",
        "🌳 Закрытая территория 14 га",
        "🏊 Бассейн, спорт, лес"
      ],
      mapUrl: "https://yandex.ru/map-widget/v1/?ll=36.719422%2C55.261573&z=15&pt=36.719422,55.261573,pm2rdm"
    },
    photoCategories: [
      { id: "all", label: "Все" },
      { id: "food", label: "Еда" },
      { id: "sport", label: "Спорт" },
      { id: "pool", label: "Бассейн" },
      { id: "study", label: "Учёба" }
    ],
    photos: [
      { cat: "all", src: "/assets/images/cdn-cache/a5f92a14_photo_2025-06-14_08-.jpg", alt: "all" },
      { cat: "all", src: "/assets/images/cdn-cache/8cca10f8_photo.jpg", alt: "all" },
      { cat: "all", src: "/assets/images/cdn-cache/1ac9b8f7_photo_2025-06-14_08-.jpg", alt: "all" },
      { cat: "all", src: "/assets/images/cdn-cache/1063273d_photo_2025-06-17_13-.jpg", alt: "all" },
      { cat: "study", src: "/assets/images/cdn-cache/a591ceb9_IMG_1543.JPG", alt: "study" },
      { cat: "food", src: "/assets/images/cdn-cache/9e4f4646_photo_2025-06-14_08-.jpg", alt: "food" },
      { cat: "food", src: "/assets/images/cdn-cache/8aee104b_photo_2025-06-14_08-.jpg", alt: "food" },
      { cat: "food", src: "/assets/images/cdn-cache/5babf9c8_photo.jpg", alt: "food" },
      { cat: "study", src: "/assets/images/cdn-cache/d8b90de0_photo_2025-06-14_08-.jpg", alt: "study" },
      { cat: "study", src: "/assets/images/cdn-cache/7e509c20_photo_2025-06-14_08-.jpg", alt: "study" },
      { cat: "study", src: "/assets/images/cdn-cache/81652cd9_photo_2025-06-14_08-.jpg", alt: "study" },
      { cat: "study", src: "/assets/images/cdn-cache/0e2e55a2_photo_2025-06-14_08-.jpg", alt: "study" },
      { cat: "pool", src: "/assets/images/cdn-cache/0d2ab9ef_photo_2025-06-14_08-.jpg", alt: "pool" },
      { cat: "pool", src: "/assets/images/cdn-cache/6a17713f_photo_2025-06-14_08-.jpg", alt: "pool" },
      { cat: "sport", src: "/assets/images/cdn-cache/cab7c193_photo.jpg", alt: "sport" },
      { cat: "sport", src: "/assets/images/cdn-cache/841dac3d_photo_2025-06-14_07-.jpg", alt: "sport" },
      { cat: "sport", src: "/assets/images/cdn-cache/e7095a88_photo_2025-06-14_08-.jpg", alt: "sport" }
    ],
    videos: [
      {
        title: "За неделю в лагере ребёнок меняется больше, чем за год дома",
        poster: "/assets/video-covers/cover-week-change.jpg",
        posterMobile: "/assets/video-covers/cover-week-change.jpg",
        url: "https://rutube.ru/shorts/f1538387b19f82f0305f7ae7222bf57d/"
      },
      {
        title: "Зачем детям копить деньги в лагере?",
        poster: "/assets/video-covers/cover-money-why.jpg",
        posterMobile: "/assets/video-covers/cover-money-why.jpg",
        url: "https://rutube.ru/shorts/01ca8a077f86db0b95bb0adfebd8ebce/"
      },
      {
        title: "Ребёнок сам откажется от телефона за 3 дня?",
        poster: "/assets/video-covers/cover-phone-3days.jpg",
        posterMobile: "/assets/video-covers/cover-phone-3days.jpg",
        url: "https://rutube.ru/shorts/41bbae1d1b167cd49c7aad94cc76b133/"
      }
    ],
    reviews: [
      {
        name: "Сергей Найденов",
        meta: "Яндекс Карты · 2 февраля 2026",
        avatar: "https://avatars.mds.yandex.net/get-yapic/27503/0r-4/islands-68",
        quote: "Отличное расположение в живописном месте, большие просторные аудитории для занятий. Большое значение придавалось и активностям вне аудиторных занятий: футбол, бадминтон и прочее."
      },
      {
        name: "виктория",
        meta: "Яндекс Карты · 13 ноября 2024",
        avatar: "https://avatars.mds.yandex.net/get-yapic/54535/fsnR7nvUqoioiSqyIVRArH7QSFs-1/islands-68",
        quote: "Лагерь «Айдакемп» — это круто. Была там несколько раз, и каждый раз это был незабываемый опыт."
      },
      {
        name: "Natalia Savenkova",
        meta: "Яндекс Карты · 10 ноября 2024",
        avatar: "https://avatars.mds.yandex.net/get-yapic/68143/0s-4/islands-68",
        quote: "Хочу поблагодарить АйДаКемп за отличную организацию и правильный подход в общении и воспитании детей в лагере. Потрясающие вожатые и педагоги."
      },
      {
        name: "Надежда Ш.",
        meta: "Яндекс Карты · 12 августа 2025",
        avatar: "https://avatars.mds.yandex.net/get-yapic/58107/0f-1/islands-68",
        quote: "Сын в 9 лет этим летом побывал в первый раз в этом лагере. Остался в полном восторге и сказал, что обязательно поедет ещё."
      },
      {
        name: "Кристина",
        meta: "Яндекс Карты · 8 ноября 2024",
        avatar: "https://avatars.mds.yandex.net/get-yapic/49368/enc-f5d05dcd44e9fc6a6283d03f5fc4dfbadc08d6b278aedeb06cfa14e5027cfb80/islands-68",
        quote: "Дочери лагерь понравился, с удовольствием провела время на каникулах. Интересные занятия, вкусная еда, комфортное размещение."
      },
      {
        name: "Мария Григорьева",
        meta: "Яндекс Карты · 13 ноября 2024",
        avatar: "https://avatars.mds.yandex.net/get-yapic/56823/XGlOg8N65vTR91xedCasHKXWqI-1/islands-68",
        quote: "Отправляла детей 10 и 14 лет, оба остались довольны и готовы снова ехать на следующий год. Благодарна за опыт и пользу для детей."
      }
    ],
    team: [
      {
        name: "Дарья Афанасьева",
        role: "основатель и вдохновитель АйДаКемп",
        avatar: "/assets/images/cdn-cache/15b41072_photo.png",
        bio: "предприниматель в сфере детского IT-образования и мама подростка, которая строит лагерь таким, каким сама хотела бы видеть обучение своего ребёнка."
      },
      {
        name: "Никита Брагин",
        role: "преподаватель Scratch, Minecraft и Python",
        avatar: "/assets/images/cdn-cache/dc9ef9b6_photo.png",
        bio: "автор учебника по разработке игр; специализируется на геймдеве и помогает детям создавать собственные игровые миры."
      },
      {
        name: "Александр Ташкин",
        role: "преподаватель Scratch, Minecraft и Python",
        avatar: "/assets/images/cdn-cache/1e93e3b8_photo.png",
        bio: "соавтор учебника по разработке игр; умеет зажигать интерес к программированию через практические задачи и командные проекты."
      },
      {
        name: "Омар Алхамви",
        role: "преподаватель Python и нейросетей",
        avatar: "/assets/images/cdn-cache/67852b0a_photo.png",
        bio: "работает со старшими и продвинутыми группами, часть занятий ведёт на английском и показывает, как применять AI в реальных проектах."
      },
      {
        name: "Дарья Воронцова",
        role: "преподаватель Python и Scratch",
        avatar: "/assets/images/cdn-cache/791a236a_ChatGPT_Image_18__20.png",
        bio: "помогает детям легко войти в программирование через игры, логику и первые самостоятельные программы."
      }
    ],
    faqTabs: [
      { id: "medicine", label: "Медицина" },
      { id: "security", label: "Безопасность" },
      { id: "food", label: "Питание" },
      { id: "living", label: "Проживание" },
      { id: "communication", label: "Связь" }
    ],
    faqItems: {
      medicine: [
        "Есть ли медик в лагере?",
        "Что если ребёнок заболеет?",
        "Можно давать лекарства?"
      ],
      security: [
        "Территория закрыта?",
        "Сколько детей на вожатого?"
      ],
      food: [
        "Сколько раз кормят?",
        "Учитываются аллергии?"
      ],
      living: [
        "Сколько детей в комнате?"
      ],
      communication: [
        "Будет ли телефон у ребёнка?",
        "Как следить что происходит?"
      ]
    }
  };

  var TABS = CONTENT_MAP.menu;

  var AGE_PROFILES = [
    {
      id: "7-9",
      min: 7,
      max: 9,
      title: "AiDaCamp: IT-лагерь без телефонов в Подмосковье",
      subtitle: "Для детей 7-14 лет: свои IT-проекты, бассейн и спорт каждый день, внутренняя экономика с лагерной валютой.",
      progress: "63 % - мест занято",
      ageText: "Возраст: 7-9 лет -> Scratch + базовый Python",
      benefits: [
        { icon: ICON_MAP.robot, text: "IT-проекты по уровню" },
        { icon: ICON_MAP.money, text: "Внутренняя экономика и лагерная валюта" },
        { icon: ICON_MAP.pool, text: "Собственный бассейн каждый день" }
      ]
    },
    {
      id: "10-12",
      min: 10,
      max: 12,
      title: "AiDaCamp: IT-лагерь без телефонов в Подмосковье",
      subtitle: "Для детей 10-12 лет: Python, веб-проекты, командные задачи и баланс учебы, спорта и отдыха.",
      progress: "58 % - мест занято",
      ageText: "Возраст: 10-12 лет -> Python + веб",
      benefits: [
        { icon: ICON_MAP.robot, text: "Практика Python и веб-разработки" },
        { icon: ICON_MAP.money, text: "Экономические игровые механики" },
        { icon: ICON_MAP.pool, text: "Бассейн и спорт ежедневно" }
      ]
    },
    {
      id: "13-14",
      min: 13,
      max: 14,
      title: "AiDaCamp: IT-лагерь без телефонов в Подмосковье",
      subtitle: "Для детей 13-14 лет: AI-интенсив, хакатоны, презентация проектов и продуктовый подход.",
      progress: "49 % - мест занято",
      ageText: "Возраст: 13-14 лет -> AI + проектная работа",
      benefits: [
        { icon: ICON_MAP.robot, text: "AI-инструменты и прикладные кейсы" },
        { icon: ICON_MAP.money, text: "Управление бюджетом командных проектов" },
        { icon: ICON_MAP.pool, text: "Фокус на режиме, здоровье и спорте" }
      ]
    }
  ];

  var SHIFTS = [
    {
      id: "shift-1",
      direction: "base",
      line: "1 смена",
      summary: "Визуальное программирование, первые игры, логика.",
      descriptions_by_age: {
        "7-9": "Визуальное программирование, первые игры, логика.",
        "10-12": "Python и веб-проекты, первые командные мини-спринты.",
        "13-14": "AI-практика, анализ данных и защита мини-проекта."
      },
      nextCta: "Смотреть даты и цены смен",
      benefits: [
        { icon: ICON_MAP.robot, text: "Визуальные IT-проекты по уровню ребёнка" },
        { icon: ICON_MAP.money, text: "Первые шаги во внутренней экономике" },
        { icon: ICON_MAP.pool, text: "Бассейн и активность каждый день" }
      ]
    },
    {
      id: "shift-2",
      direction: "web",
      line: "2 смена",
      summary: "Python, веб-проекты и командные мини-спринты.",
      descriptions_by_age: {
        "7-9": "Scratch и визуальные проекты: алгоритмы, игровые механики, логика.",
        "10-12": "Python, веб-проекты и командные мини-спринты.",
        "13-14": "AI-инструменты, продуктовые задачи и командная разработка."
      },
      nextCta: "Смотреть даты и цены смен",
      benefits: [
        { icon: ICON_MAP.robot, text: "Python + веб-проекты в мини-командах" },
        { icon: ICON_MAP.money, text: "Игровая экономика: роли, бюджет, решения" },
        { icon: ICON_MAP.pool, text: "Ежедневный спорт и бассейн по расписанию" }
      ]
    },
    {
      id: "shift-3",
      direction: "ai",
      line: "3 смена",
      summary: "AI-практика, анализ данных, проектная защита.",
      descriptions_by_age: {
        "7-9": "Игровые IT-проекты, логика, первые презентации результатов.",
        "10-12": "AI-практика, анализ данных, проектная защита.",
        "13-14": "AI-интенсив, хакатоны и проектная защита."
      },
      nextCta: "Смотреть даты и цены смен",
      benefits: [
        { icon: ICON_MAP.robot, text: "AI-кейсы, аналитика и защита проекта" },
        { icon: ICON_MAP.money, text: "Управление ресурсами в проектной команде" },
        { icon: ICON_MAP.pool, text: "Баланс: интеллектуальная и физическая нагрузка" }
      ]
    },
    {
      id: "shift-4",
      direction: "base",
      line: "4 смена",
      summary: "Длинная смена: полный цикл обучения и проектной практики.",
      descriptions_by_age: {
        "7-9": "Длинная смена: визуальные IT-проекты и командная практика.",
        "10-12": "Длинная смена: полный цикл обучения и проектной практики.",
        "13-14": "Длинная смена: AI-кейсы, командные проекты и защита."
      },
      nextCta: "Смотреть даты и цены смен",
      benefits: [
        { icon: ICON_MAP.robot, text: "Полный цикл IT-практики и командной работы" },
        { icon: ICON_MAP.money, text: "Навык финансового планирования в лагере" },
        { icon: ICON_MAP.pool, text: "Бассейн, спорт и активный отдых ежедневно" }
      ]
    },
    {
      id: "shift-5",
      direction: "web",
      line: "5 смена",
      summary: "Летний интенсив: проекты, командные задачи, защита результатов.",
      descriptions_by_age: {
        "7-9": "Летний интенсив: игровые проекты, логика и командные задачи.",
        "10-12": "Летний интенсив: проекты, командные задачи, защита результатов.",
        "13-14": "Летний интенсив: AI-проекты, аналитика и защита результатов."
      },
      nextCta: "Смотреть даты и цены смен",
      benefits: [
        { icon: ICON_MAP.robot, text: "Проектная работа с ментором каждый день" },
        { icon: ICON_MAP.money, text: "Экономика лагеря: роли, цели, ответственность" },
        { icon: ICON_MAP.pool, text: "Сбалансированный режим: обучение + спорт" }
      ]
    },
    {
      id: "shift-6",
      direction: "ai",
      line: "6 смена",
      summary: "Финальная августовская смена с практическими IT-кейсами.",
      descriptions_by_age: {
        "7-9": "Финальная смена: закрепление навыков через игровые IT-кейсы.",
        "10-12": "Финальная августовская смена с практическими IT-кейсами.",
        "13-14": "Финальная смена: AI-кейсы, проектная практика и презентация."
      },
      nextCta: "Смотреть даты и цены смен",
      benefits: [
        { icon: ICON_MAP.robot, text: "Практика в IT-направлениях под возраст" },
        { icon: ICON_MAP.money, text: "Финансовые решения и командная экономика" },
        { icon: ICON_MAP.pool, text: "Спорт и бассейн как часть ежедневного режима" }
      ]
    },
    {
      id: "shift-7",
      direction: "pro",
      line: "Смена и цены",
      summary: "Финальный выбор смены, условий и бронирования.",
      nextCta: "Смотреть даты и цены смен",
      benefits: [
        { icon: ICON_MAP.robot, text: "Финальная программа по выбранному направлению" },
        { icon: ICON_MAP.money, text: "Прозрачные даты, цены и условия бронирования" },
        { icon: ICON_MAP.pool, text: "Подтверждение смены и организационных деталей" }
      ]
    }
  ];

  var DIRECTIONS = [
    { id: "base", label: "База" },
    { id: "web", label: "Web" },
    { id: "ai", label: "AI" },
    { id: "pro", label: "Pro" }
  ];

  var TAB_TO_SECTION = {
    info: "program",
    aiprogram: "ai",
    location: "location",
    photo: "photos",
    video: "video",
    faq: "faq",
    reviews: "reviews",
    team: "team"
  };

  var AGE_SLIDER_POINTS = [9, 11, 13];

  window.AC_DATA = window.AC_DATA || {};
  window.AC_DATA.ICON_MAP = ICON_MAP;
  window.AC_DATA.CONTENT_MAP = CONTENT_MAP;
  window.AC_DATA.TABS = TABS;
  window.AC_DATA.AGE_PROFILES = AGE_PROFILES;
  window.AC_DATA.SHIFTS = SHIFTS;
  window.AC_DATA.DIRECTIONS = DIRECTIONS;
  window.AC_DATA.TAB_TO_SECTION = TAB_TO_SECTION;
  window.AC_DATA.AGE_SLIDER_POINTS = AGE_SLIDER_POINTS;
})();
