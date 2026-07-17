// @ts-nocheck

  // ── DATA ──────────────────────────────────────────────────────────────────
  // Смена 1: 30 мая — 8 июня 2026 (10 дней)
  const SHIFT_DATES = [
    'пт, 30 мая','сб, 31 мая','вс, 1 июня','пн, 2 июня','вт, 3 июня',
    'ср, 4 июня','чт, 5 июня','пт, 6 июня','сб, 7 июня','вс, 8 июня',
  ];

  const ROLES = {
    counselor: {
      label: 'Вожатый',
      days: {
        1:  { title: 'День заезда и знакомства', tasks: [
          'Встреча детей и родителей на входе — улыбаемся, помогаем',
          'Помощь с размещением по комнатам',
          'Первый инструктаж: режим дня, правила, распорядок',
          'Знакомство отряда — игра на имена',
          'Экскурсия по территории лагеря',
          'Ужин и организованный отбой (дети устают с дороги)',
          'Собрать все телефоны в конце дня',
          'Общее фото отряда — отправить родителям',
        ]},
        2:  { title: 'Запуск программы', tasks: [
          'Подъём за 20 минут до детей',
          'Организовать утреннюю зарядку',
          'Завтрак и первая линейка',
          'Объяснить игровую механику (деньги, правила, штрафы)',
          'Проводить детей на первые занятия к преподавателям',
          'Организовать досуг между занятиями',
          'Бассейн: собрать желающих, соблюдать безопасность',
          'Фото занятий и бассейна — в родительский чат',
          'Отбой с проверкой комнат',
        ]},
        3:  { title: 'Режим входит в норму', tasks: [
          'Чёткий контроль подъёма и зарядки',
          'Выдать первые игровые деньги за хорошее поведение',
          'Проследить дисциплину на занятиях',
          'Организовать досуг: настольные игры, спорт',
          'Контроль гигиены и уборки в комнатах',
          'Бассейн',
          'Заполнить дневник отряда (первая запись)',
          'Видео-интервью с 2–3 детьми для родителей',
          'Отбой с проверкой',
        ]},
        4:  { title: 'Активность и дисциплина', tasks: [
          'Утренняя мотивация на линейке',
          'Применить штрафы/награды если были нарушения',
          'Занятия — контроль присутствия и внимания',
          'Инициировать спортивный турнир',
          'Бассейн',
          'Контроль использования телефонов',
          'Отбой и обход комнат',
        ]},
        5:  { title: 'Середина смены', tasks: [
          'Психологический чек-ин: как дети себя чувствуют?',
          'Отметить тех, кто отстаёт или грустит — поговорить лично',
          'Занятия и досуг в штатном режиме',
          'Бассейн',
          'Укрепление дружбы в отряде (командные игры)',
          'Вечерний сбор отряда: рассказ о дне',
          'Отбой, проверка дневника отряда',
        ]},
        6:  { title: 'Интенсив', tasks: [
          'Запросить обратную связь у преподавателей о детях',
          'Мотивировать на вторую половину смены',
          'Занятия и творческий досуг',
          'Бассейн',
          'Вечерний костёр или общелагерное мероприятие',
          'Фото вечернего мероприятия для архива',
          'Отбой и отчёт руководителю',
        ]},
        7:  { title: 'Большое мероприятие', tasks: [
          'Подготовить отряд к общелагерному мероприятию',
          'Раздать награды за прошедшие дни',
          'Много фото и видео для родителей',
          'Свободный досуг по выбору детей',
          'Праздничный ужин',
          'Конкурсы или танцы',
          'Поздний отбой допускается',
          'Собрать обратную связь у детей',
        ]},
        8:  { title: 'После праздника, восстановление', tasks: [
          'Контроль режима — дети могут быть сонными',
          'Занятия в нормальном темпе',
          'Досуг с выбором',
          'Проверить здоровье (кто пожаловался вчера)',
          'Бассейн',
          'Начало финальных проектов (если есть)',
          'Отбой',
        ]},
        9:  { title: 'Предфинальный день', tasks: [
          'Сбор работ и проектов для выставки',
          'Фотографировать проекты детей',
          'Занятия: финальное закрепление',
          'Бассейн',
          'Объявить родителям о времени и формате выезда',
          'Вечерняя дискотека или концерт',
          'Итоговый сбор отряда — поблагодарить каждого',
        ]},
        10: { title: 'ДЕНЬ ОТЪЕЗДА', warning: true, tasks: [
          'ВАЖНО: ранний подъём, предупредить с вечера',
          'Быстрый завтрак',
          'Сбор вещей — проверить каждую комнату',
          'Прощальный сбор: слова благодарности каждому ребёнку',
          'Выдача сувениров и грамот',
          'Уборка комнат (до приёмки руководителем)',
          'Координация выдачи детей родителям — по спискам',
          'Финальная чистка, отчёт руководителю смены',
        ]},
      }
    },

    teacher: {
      label: 'Преподаватель',
      days: {
        1:  { title: 'Знакомство и диагностика', tasks: [
          'Подъём за 20 минут до детей',
          'Первое знакомство с группой — представиться, рассказать о курсе',
          'Диагностика уровня: простые вопросы, без стресса',
          'Первое занятие лёгкое — создаём интерес, не пугаем',
          'Помочь вожатому с размещением если нужно',
          'Передать вожатому впечатления о детях (кто активный, кто тихий)',
          'Ужин и отбой вместе с отрядом',
        ]},
        2:  { title: 'Программа стартует', tasks: [
          'Занятие 1: базовый материал, простые примеры',
          'Делать перерывы каждые 25–30 минут',
          'Занятие 2: закрепление первого дня',
          'Следить за концентрацией — переключать форматы',
          'Отметить детей с трудностями — сообщить вожатому',
          'Досуг: поддержать инициативу детей',
          'Ночное дежурство (свой блок)',
        ]},
        3:  { title: 'Программа развивается', tasks: [
          'Занятие 1: новый материал',
          'Занятие 2: добавить сложности, первые практические задачи',
          'Индивидуальная помощь отстающим',
          'Обед, свободное время',
          'Опциональное занятие для желающих (углублённое)',
          'Вечерний досуг',
          'Ночное дежурство',
        ]},
        4:  { title: 'Первые проекты', tasks: [
          'Занятие 1: повтор и углубление',
          'Занятие 2: запуск первого мини-проекта',
          'Помощь в работе над проектом во второй половине дня',
          'Обед',
          'Вечерняя игра или спорт с отрядом',
          'Отбой',
        ]},
        5:  { title: 'Середина курса', tasks: [
          'Занятие 1: закрепление пройденного (половина курса)',
          'Занятие 2: новый блок материала',
          'Практика и работа над проектами',
          'Обед и досуг',
          'Общелагерное мероприятие если есть',
          'Отбой',
        ]},
        6:  { title: 'Интенсив и мастерство', tasks: [
          'Занятие 1: углублённый материал',
          'Занятие 2: разбор сложных задач',
          'Работа над проектами',
          'Обед',
          'Дополнительная помощь тем, кто отстаёт',
          'Вечернее мероприятие лагеря',
          'Отбой',
        ]},
        7:  { title: 'Праздничный день', tasks: [
          'Занятий меньше или нет — зависит от расписания',
          'Участие в общелагерном мероприятии',
          'Награды за прогресс в обучении',
          'Свободное время, игры',
          'Вечер: концерт или танцы',
          'Поздний отбой допускается',
        ]},
        8:  { title: 'Вторая половина курса', tasks: [
          'Занятие 1: новый блок (финальный)',
          'Занятие 2: практика и проекты',
          'Обед и досуг',
          'Работа над финальными проектами',
          'Вечер',
          'Отбой',
        ]},
        9:  { title: 'Завершение курса', tasks: [
          'Занятие 1: обзор всего курса',
          'Занятие 2: финальная практика, дорабатываем проекты',
          'Собрать и сфотографировать все работы',
          'Обед',
          'Подготовка финальной демонстрации',
          'Вечер: концерт или дискотека',
          'Отбой',
        ]},
        10: { title: 'ФИНАЛЬНЫЙ ДЕНЬ', warning: true, tasks: [
          'ВАЖНО: короткое финальное занятие или его нет',
          'Финальная демонстрация проектов',
          'Дать обратную связь каждому ребёнку — позитивно',
          'Грамоты и сертификаты',
          'Обед',
          'Помочь с уборкой и сбором вещей',
          'Проводить детей',
        ]},
      }
    },

    director: {
      label: 'Руководитель смены',
      days: {
        1:  { title: 'Организация заезда', tasks: [
          'Инструктаж всего персонала до приезда детей',
          'Встреча детей и родителей на входе',
          'Контроль распределения по комнатам',
          'Проверка безопасности: электричество, вода, пожарные выходы',
          'Встреча с медицинским работником: кто болеет, какие лекарства',
          'Линейка открытия смены',
          'Контроль ужина и отбоя',
          'Вечерний сбор персонала: итоги дня, вопросы',
        ]},
        2:  { title: 'Запуск программы', tasks: [
          'Контроль подъёма и зарядки',
          'Общее собрание: объяснение режима и правил всем детям',
          'Запуск игровой механики — объяснить вожатым алгоритм',
          'Контроль первых занятий: заглянуть в каждую группу',
          'Обеденный контроль (качество питания, очереди)',
          'Проверить здоровье всех детей с медиком',
          'Вечерний сбор персонала: проблемы? что улучшить?',
          'Ночное дежурство согласно графику',
        ]},
        3:  { title: 'Стабилизация', tasks: [
          'Утренний сбор персонала (10 минут, стоя)',
          'Контроль соблюдения расписания',
          'Контроль занятий и досуга',
          'Бассейн: организация и безопасность (требовать нарукавники)',
          'Опрос медика: жалобы на здоровье',
          'Проверить корпус: чистота, порядок, освещение',
          'Ужин, отбой',
          'Разбор: что нужно улучшить',
        ]},
        4:  { title: 'Развитие активности', tasks: [
          'Утренний сбор',
          'Контроль режима и занятий',
          'Организовать первое соревнование / турнир',
          'Проверка санузлов и уборных (чистота)',
          'Проверить правильность начисления игровых денег',
          'Персональные беседы с проблемными детьми если есть',
          'Отбой',
        ]},
        5:  { title: 'Середина смены', tasks: [
          'Утренний сбор',
          'Проверить чеклист чистоты помещений',
          'Контроль занятий',
          'Позвонить родителям если есть проблемы с детьми',
          'Фото и видео дня для отчёта',
          'Контроль питьевого режима в жару',
          'Проверить оборудование: кровати, окна, лампы',
          'Вечерний сбор персонала',
          'Отбой',
        ]},
        6:  { title: 'Интенсив', tasks: [
          'Утренний сбор',
          'Помочь преподавателям с организацией занятий',
          'Организация большого вечернего мероприятия',
          'Промежуточный финансовый контроль',
          'Контроль здоровья: травмы, ссадины — в журнал',
          'Безопасность мероприятия: проверить территорию',
          'Фото и видео события',
          'Отбой и ночное дежурство',
        ]},
        7:  { title: 'Большое мероприятие', tasks: [
          'Утренний сбор',
          'Координация большого мероприятия / праздника',
          'Награды по итогам прошедших дней',
          'Много фото и видео',
          'Контроль здоровья (усталость, перегрев)',
          'Вечерняя линейка или общий сбор',
          'Поздний отбой допускается',
          'Анализ итогов первой половины смены',
        ]},
        8:  { title: 'Вторая половина, восстановление', tasks: [
          'Контроль режима',
          'Занятия и досуг в штатном темпе',
          'Никто не заболел? Опрос медика',
          'Контроль финансов',
          'Фото и видео',
          'Вечерний сбор персонала',
          'Отбой',
        ]},
        9:  { title: 'Подготовка к закрытию', tasks: [
          'Утренний сбор',
          'Занятия: финальные проекты',
          'Сбор всех фото и видео материалов смены',
          'Контроль сбора вещей (объявить родителям расписание выезда)',
          'Организация финального мероприятия — список задач',
          'Проверить дневники вожатых',
          'Подготовить грамоты и сертификаты',
          'Отбой',
        ]},
        10: { title: 'ЗАКРЫТИЕ СМЕНЫ — ДЕНЬ ОТЪЕЗДА', warning: true, tasks: [
          'ВАЖНО: ранний подъём, контроль сбора вещей',
          'Финальное мероприятие и демонстрация проектов',
          'Раздача наград и грамот',
          'Контроль сбора вещей во всех комнатах',
          'Быстрый обед',
          'Отправка детей: координация с родителями, по спискам',
          'ПРИЁМКА всех помещений: чеклист + фото каждой комнаты',
          'Финальный расчёт финансов смены',
          'Отчёт: итоги смены письменно',
          'Встреча с персоналом: что было хорошо, что улучшить',
        ]},
      }
    }
  };


  // ── ONBOARDING QUIZ ──────────────────────────────────────────────────────
  const OB_KEY = 'staff_onboarding_v2';

  const QUIZ = {
    counselor: [
      {
        q: 'Дети пошли на занятие к преподавателю. Вожатый может пойти отдохнуть в свою комнату?',
        answers: ['Да, можно передохнуть', 'Нет — вожатый с детьми всегда', 'Зависит от настроения', 'Можно, если директор не видит'],
        correct: 1,
        explanation: 'Вожатый несёт ответственность за детей весь день. Даже если дети на занятии — вожатый рядом, готов реагировать.'
      },
      {
        q: 'Ребёнок говорит: "Мне скучно, хочу домой". Что делать вожатому?',
        answers: ['Сказать: "Потерпи, скоро домой"', 'Позвонить родителям и попросить забрать', 'Найти что-то интересное, вовлечь в активность', 'Пожаловаться директору'],
        correct: 2,
        explanation: 'Вожатый — аниматор и психолог одновременно. Скука = сигнал активизировать ребёнка, а не звать на помощь.'
      },
      {
        q: 'Уже 23:30, ты слышишь шум из комнаты детей. Правильное действие?',
        answers: ['Сделать вид, что не слышишь', 'Зайти, спокойно попросить тишину и проверить что всё ок', 'Орать из коридора', 'Написать в чат и ждать'],
        correct: 1,
        explanation: 'Тихий, спокойный заход без конфликта. Дети чувствуют уважение — и успокаиваются быстрее.'
      },
      {
        q: 'Двое детей поссорились и дерутся. Твои первые слова?',
        answers: ['"Кто начал?!"', '"Немедленно прекратить!"', 'Молча разнять физически', '"Стоп. Оба сели. Дышим."'],
        correct: 3,
        explanation: 'Сначала деэскалация — разделить, успокоить. Разбираться кто прав — потом, когда эмоции спали.'
      },
      {
        q: 'Родитель позвонил тебе напрямую в 22:00 и требует срочно передать ребёнку "привет от бабушки". Ты...',
        answers: ['Бежишь будить ребёнка', 'Объясняешь что сейчас отбой, всё хорошо, передашь утром', 'Выключаешь телефон', 'Даёшь телефон ребёнку'],
        correct: 1,
        explanation: 'Вечерние звонки родителям — норма, но режим лагеря важнее. Мягко но твёрдо: ребёнок спит, всё хорошо, утром передам.'
      }
    ],
    teacher: [
      {
        q: 'Преподаватель устал в середине дня. Можно закрыться в своей комнате и отдохнуть час?',
        answers: ['Да, надо беречь себя', 'Нет — нахожусь с детьми или в зоне видимости', 'Можно, если тихий час', 'Зависит от расписания'],
        correct: 1,
        explanation: 'Преподаватель — не только учитель, но и взрослый отвечающий за безопасность. Тихий час = ты в отряде или рядом, не у себя.'
      },
      {
        q: 'Ребёнок не понимает материал второй день. Что делать?',
        answers: ['Оставить как есть, всех не научишь', 'Дать больше самостоятельных заданий', 'Поговорить индивидуально, найти другой подход', 'Сказать родителям что ребёнок "не тянет"'],
        correct: 2,
        explanation: 'Мы работаем с разными детьми. Индивидуальный подход — не исключение, это норма. Найди что цепляет именно этого ребёнка.'
      },
      {
        q: 'Ребёнок на занятии явно в плохом настроении, молчит, не участвует. Правильная реакция?',
        answers: ['Не обращать внимания, само пройдёт', 'Попросить вожатого разобраться', 'Тихо поговорить один на один в перерыве', 'Поставить плохую отметку за пассивность'],
        correct: 2,
        explanation: 'Замкнутость ребёнка — сигнал. Тихий разговор один на один даёт больше, чем публичный вопрос перед всей группой.'
      },
      {
        q: 'Занятие закончилось раньше плана на 20 минут. Что делаешь?',
        answers: ['Отпускаешь детей раньше', 'Импровизируешь: мини-проект, викторина, coding challenge', 'Ждёшь когда придут вожатые', 'Сидишь тихо'],
        correct: 1,
        explanation: 'Свободное время без присмотра — риск. Всегда имей в запасе мини-активность на 15-20 минут.'
      },
      {
        q: 'Двое детей поспорили на занятии — кто написал лучший код. Конфликт растёт. Твои действия?',
        answers: ['Объявить победителя', 'Прекратить разговор на эту тему, сменить тему', 'Превратить в учебную дискуссию: "расскажите оба что делает ваш код"', 'Выгнать обоих из класса'],
        correct: 2,
        explanation: 'Технические споры — отличный учебный момент. Кто может объяснить свой код — тот и молодец. Все выигрывают.'
      }
    ],
    director: [
      {
        q: 'Родитель приехал и требует забрать ребёнка прямо сейчас, без документов выезда',
        answers: ['Отдать ребёнка — родитель же', 'Следовать регламенту: документы выезда → связь с директором → отпуск', 'Позвонить в полицию', 'Сказать "приходите завтра"'],
        correct: 1,
        explanation: 'Мы несём юридическую ответственность за ребёнка весь период смены. Даже родителю без документов — нет. Это защита и ребёнка и лагеря.'
      },
      {
        q: 'Вожатый пришёл к тебе в 14:00 и говорит что "не может больше". Что делаешь?',
        answers: ['Говоришь: "Все устали, справляйся"', 'Отстраняешь немедленно от работы', 'Выслушиваешь, находишь причину, временно перераспределяешь нагрузку', 'Игнорируешь'],
        correct: 2,
        explanation: 'Выгорание вожатого = риск для детей. Быстро понять причину и дать передышку лучше, чем потерять человека совсем.'
      },
      {
        q: 'На следующий день ожидается 40°C. Что делаешь заранее?',
        answers: ['Ничего, дети закалятся', 'Меняешь расписание: все занятия в помещении, больше воды, тихий час длиннее', 'Отменяешь смену', 'Ждёшь жалоб от родителей'],
        correct: 1,
        explanation: 'Безопасность детей — приоритет. Жара = корректировка расписания, усиленный контроль питья, укрытие от солнца.'
      },
      {
        q: 'Ребёнку стало плохо (высокая температура). Алгоритм действий:',
        answers: ['Звонишь родителям, ждёшь', 'Медработник → родители → документация → при необходимости скорая', 'Даёшь парацетамол сам', 'Ждёшь до утра'],
        correct: 1,
        explanation: 'Строго по протоколу: сначала медик, потом родители, всё фиксируется. Самолечение запрещено.'
      },
      {
        q: 'Сотрудник грубо разговаривал с ребёнком при свидетелях. Твои действия?',
        answers: ['Поговоришь потом, когда будет время', 'Сделаешь замечание публично — чтобы все видели', 'Поговоришь наедине немедленно, зафиксируешь в журнале', 'Не вмешиваешься — сами разберутся'],
        correct: 2,
        explanation: 'Грубость с детьми = стоп. Немедленный разговор без аудитории — уважительно но твёрдо. Фиксация важна для прозрачности.'
      }
    ]
  };

  const RULES = {
    counselor: [
      'Я нахожусь с детьми весь день — это моя основная задача',
      'Я не ухожу в свою комнату пока дети не спят',
      'При любом конфликте — сначала деэскалация, потом разбор',
      'Я не обсуждаю детей с другими детьми',
      'При недомогании ребёнка — немедленно сообщаю руководителю'
    ],
    teacher: [
      'Я нахожусь в зоне видимости детей в своё рабочее время',
      'У меня есть запасная активность на случай окончания занятия раньше',
      'Я не ставлю детей в неловкое положение перед группой',
      'Тревожные сигналы от ребёнка — сразу сообщаю вожатому',
      'Результат занятия — каждый ребёнок сделал что-то своё'
    ],
    director: [
      'Я знаю алгоритм действий при ЧС наизусть',
      'Документы выезда обязательны — нет исключений даже для родителей',
      'Я готов перераспределить нагрузку при выгорании сотрудника',
      'Все инциденты фиксируются письменно в день события',
      'Жара, болезни, конфликты — у каждого есть протокол действий'
    ]
  };

  const ROLE_LABELS = {
    counselor: { label: 'Вожатый', icon: 'bi-people-fill' },
    teacher:   { label: 'Преподаватель', icon: 'bi-laptop-fill' },
    director:  { label: 'Руководитель смены', icon: 'bi-star-fill' }
  };

  let obRole = null;
  let obQIdx = 0;
  let obAnswered = false;

  function showScreen(id) {
    ['login-screen','onboarding-screen','portal'].forEach(s => {
      const el = document.getElementById(s);
      if (el) el.style.display = (s === id) ? (id === 'portal' ? 'block' : 'block') : 'none';
    });
  }

  function enterPortal(role) {
    showScreen('portal');
    renderDays(role);
    setActiveRole(role);
    // Синхронизировать мобильную навигацию с ролью
    document.querySelectorAll('.mobile-nav-btn').forEach(b => b.classList.remove('active'));
    const mBtn = document.getElementById('mnav-' + role);
    if (mBtn) mBtn.classList.add('active');
  }

  function renderObRoleSelect() {
    const card = document.getElementById('ob-card');
    card.innerHTML = `
      <p class="ob-role-title"><i class="bi bi-person-badge"></i> Выберите свою роль</p>
      <div class="ob-question">Кто вы на смене?</div>
      <div class="ob-role-select">
        ${Object.entries(ROLE_LABELS).map(([k,v]) => `
          <button class="ob-role-btn" data-role="${k}">
            <i class="bi ${v.icon}"></i>
            ${v.label}
          </button>
        `).join('')}
      </div>
    `;
    card.querySelectorAll('.ob-role-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        obRole = btn.dataset.role;
        obQIdx = 0;
        logAction({ role: obRole, action: 'onboarding_start' });
        renderObRules();
      });
    });
  }

  function renderObQuestion() {
    const qs = QUIZ[obRole];
    const q  = qs[obQIdx];
    const total = qs.length;
    const card  = document.getElementById('ob-card');

    const dots = Array.from({length: total}, (_, i) =>
      `<div class="ob-dot ${i < obQIdx ? 'done' : i === obQIdx ? 'active' : ''}"></div>`
    ).join('');

    card.innerHTML = `
      <div class="ob-step-indicator">${dots}</div>
      <p class="ob-role-title">${ROLE_LABELS[obRole].label} · проверка · вопрос ${obQIdx + 1} из ${total}</p>
      <div class="ob-question">${q.q}</div>
      <div class="ob-answers">
        ${q.answers.map((a, i) => `<div class="ob-answer" data-idx="${i}">${a}</div>`).join('')}
      </div>
      <div class="ob-feedback" id="ob-feedback"></div>
      <button class="ob-next-btn" id="ob-next">
        ${obQIdx < total - 1 ? 'Следующий вопрос <i class="bi bi-arrow-right"></i>' : 'К документам <i class="bi bi-arrow-right"></i>'}
      </button>
    `;

    obAnswered = false;
    card.querySelectorAll('.ob-answer').forEach(btn => {
      btn.addEventListener('click', () => {
        if (obAnswered) return;
        obAnswered = true;
        const chosen = parseInt(btn.dataset.idx);
        const isOk = chosen === q.correct;
        const fb = document.getElementById('ob-feedback');

        card.querySelectorAll('.ob-answer').forEach((b, i) => {
          if (i === q.correct) b.classList.add('correct');
          else if (i === chosen && !isOk) b.classList.add('wrong');
        });

        fb.textContent = (isOk ? '✓ Верно! ' : '✗ Неверно. ') + q.explanation;
        fb.className = 'ob-feedback ' + (isOk ? 'ok' : 'bad');
        fb.style.display = 'block';

        logAction({ role: obRole, action: 'quiz_answer', question: obQIdx, correct: isOk });
        document.getElementById('ob-next').style.display = 'block';
      });
    });

    document.getElementById('ob-next').addEventListener('click', () => {
      obQIdx++;
      if (obQIdx < QUIZ[obRole].length) {
        renderObQuestion();
      } else {
        const ob = { done: true, role: obRole, ts: Date.now() };
        localStorage.setItem(OB_KEY, JSON.stringify(ob));
        logAction({ role: obRole, action: 'onboarding_complete' });
        enterPortal(obRole);
      }
    });
  }

  function renderObRules() {
    const rules = RULES[obRole];
    const card  = document.getElementById('ob-card');
    const checked = new Array(rules.length).fill(false);

    function updateDoneBtn() {
      const allDone = checked.every(Boolean);
      const btn = document.getElementById('ob-done-btn');
      if (btn) btn.style.opacity = allDone ? '1' : '.5';
      if (btn) btn.disabled = !allDone;
    }

    card.innerHTML = `
      <p class="ob-role-title"><i class="bi bi-info-circle"></i> Основные моменты — интро</p>
      <div class="ob-question">Прочитайте и отметьте каждый пункт. Дальше — короткий тест на эти моменты:</div>
      <div class="ob-rules-list">
        ${rules.map((r, i) => `
          <div class="ob-rule-item" data-i="${i}">
            <div class="ob-rule-icon" id="rule-icon-${i}"></div>
            <div class="ob-rule-text">${r}</div>
          </div>
        `).join('')}
      </div>
      <button class="ob-next-btn" id="ob-done-btn" style="opacity:.5" disabled>
        К тесту <i class="bi bi-arrow-right"></i>
      </button>
    `;

    card.querySelectorAll('.ob-rule-item').forEach(item => {
      item.addEventListener('click', () => {
        const i = parseInt(item.dataset.i);
        checked[i] = !checked[i];
        item.classList.toggle('checked', checked[i]);
        const icon = document.getElementById(`rule-icon-${i}`);
        if (icon) icon.innerHTML = checked[i] ? '<i class="bi bi-check-lg" style="color:white;font-size:12px"></i>' : '';
        updateDoneBtn();
      });
    });

    document.getElementById('ob-done-btn').addEventListener('click', () => {
      logAction({ role: obRole, action: 'intro_complete' });
      obQIdx = 0;
      renderObQuestion();
    });
  }

  // ── AUTH ──────────────────────────────────────────────────────────────────
  const COOKIE_NAME = 'staff_auth_2026';
  const PASSWORD    = '2026';

  function getCookie(name) {
    return document.cookie.split('; ').reduce((r, v) => {
      const [k, ...val] = v.split('=');
      return k === name ? decodeURIComponent(val.join('=')) : r;
    }, null);
  }
  function setCookie(name, value, days) {
    const d = new Date();
    d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${name}=${encodeURIComponent(value)};expires=${d.toUTCString()};path=/;SameSite=Lax`;
  }
  function removeCookie(name) {
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
  }

  function showPortal() {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('portal').style.display = 'block';
    renderDays('counselor');
  }

  function handleLogin() {
    const pwd      = document.getElementById('pwd-input').value.trim();
    const remember = document.getElementById('remember-me').checked;
    const errEl    = document.getElementById('login-error');

    if (pwd === PASSWORD) {
      // Значение cookie — сам пароль (не '1'): /api/shift-plan сверяет его на сервере
      // с STAFF_ACCESS_PASSWORD, а не просто проверяет факт логина.
      setCookie(COOKIE_NAME, pwd, remember ? 30 : 1);
      // Интро/тест — отдельные пункты меню в портале, не блокируют вход.
      enterPortal('counselor');
    } else {
      errEl.style.display = 'block';
      document.getElementById('pwd-input').value = '';
    }
  }

  // ── RENDER ────────────────────────────────────────────────────────────────
  let currentRole = 'counselor';

  function renderDays(role) {
    currentRole = role;
    const data = ROLES[role];
    if (!data) return;

    document.getElementById('content-title').textContent = data.label;
    document.getElementById('days-view').style.display   = 'block';
    document.getElementById('docs-view').style.display   = 'none';
    document.getElementById('search-results').style.display = 'none';
    document.getElementById('days-list').style.display   = '';
    document.getElementById('empty-state').style.display = 'none';
    document.getElementById('search-count').style.display = 'none';
    document.getElementById('search-input').value = '';

    const list = document.getElementById('days-list');
    list.innerHTML = '';

    const today = new Date();
    const shiftStart = new Date('2026-05-30');
    const dayOfShift = Math.floor((today - shiftStart) / 86400000) + 1;

    Object.entries(data.days).forEach(([dayNum, dayData]) => {
      const n       = parseInt(dayNum);
      const isToday = n === dayOfShift;
      const dateStr = SHIFT_DATES[n - 1] || '';
      const isWarning = dayData.warning;

      const card = document.createElement('div');
      card.className = 'day-card';
      card.dataset.day = dayNum;

      const numClass = isWarning ? 'day-num warning' : isToday ? 'day-num today' : 'day-num';
      const completedCount = dayData.tasks.filter((_, ti) =>
        localStorage.getItem(`task_${role}_${dayNum}_${ti}`) === '1'
      ).length;
      const totalCount = dayData.tasks.length;

      card.innerHTML = `
        <div class="day-header${isToday ? ' open' : ''}">
          <div class="${numClass}">${n}</div>
          <div class="day-meta">
            <div class="day-title">День ${n} — ${dayData.title}</div>
            <div class="day-date">${dateStr}${isToday ? ' · <strong style="color:var(--orange)">Сегодня</strong>' : ''}</div>
          </div>
          <div class="day-tasks-count">${completedCount}/${totalCount}</div>
          <i class="bi bi-chevron-down day-chevron"></i>
        </div>
        <div class="day-body${isToday ? ' open' : ''}">
          <div class="tasks-list">
            ${dayData.tasks.map((task, ti) => {
              const done = localStorage.getItem(`task_${role}_${dayNum}_${ti}`) === '1';
              const isWarn = task.startsWith('ВАЖНО:') || task.startsWith('ПРИЁМКА');
              return `
                <div class="task-item${isWarn ? ' warning' : ''}" data-ti="${ti}">
                  <div class="task-check${done ? ' done' : ''}" data-role="${role}" data-day="${dayNum}" data-ti="${ti}"></div>
                  <div class="task-text">${task}</div>
                </div>`;
            }).join('')}
          </div>
        </div>
      `;
      list.appendChild(card);

      // Accordion — event listener (not global onclick)
      card.querySelector('.day-header').addEventListener('click', () => {
        card.querySelector('.day-header').classList.toggle('open');
        card.querySelector('.day-body').classList.toggle('open');
      });

      // Task check — event delegation
      card.querySelectorAll('.task-check').forEach(el => {
        el.addEventListener('click', () => {
          const r  = el.dataset.role;
          const d  = el.dataset.day;
          const ti = el.dataset.ti;
          const key  = `task_${r}_${d}_${ti}`;
          const done = el.classList.toggle('done');
          localStorage.setItem(key, done ? '1' : '0');
          // Update counter
          const total     = card.querySelectorAll('.task-check').length;
          const completed = card.querySelectorAll('.task-check.done').length;
          card.querySelector('.day-tasks-count').textContent = `${completed}/${total}`;
          // Server log
          logAction({ role: r, day: parseInt(d), taskIndex: parseInt(ti),
            task: el.nextElementSibling?.textContent?.trim() || '',
            action: done ? 'check' : 'uncheck' });
        });
      });
    });
  }

  function toggleDay(header) {
    header.classList.toggle('open');
    header.nextElementSibling.classList.toggle('open');
  }

  // Server logging (fire-and-forget)
  function logAction(data) {
    fetch('/api/staff-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, timestamp: new Date().toISOString() }),
      keepalive: true,
    }).catch(() => {});
  }

  // ── SEARCH ────────────────────────────────────────────────────────────────
  function handleSearch(query) {
    const q = query.trim().toLowerCase();

    if (!q) {
      document.getElementById('search-results').style.display = 'none';
      document.getElementById('days-list').style.display = '';
      document.getElementById('search-count').style.display = 'none';
      document.getElementById('empty-state').style.display = 'none';
      return;
    }

    document.getElementById('days-list').style.display = 'none';
    const resultsEl = document.getElementById('search-results');
    resultsEl.style.display = 'flex';
    resultsEl.innerHTML = '';

    let matches = [];
    Object.entries(ROLES).forEach(([roleKey, roleData]) => {
      Object.entries(roleData.days).forEach(([dayNum, dayData]) => {
        dayData.tasks.forEach((task, ti) => {
          if (task.toLowerCase().includes(q)) {
            matches.push({ roleKey, roleLabel: roleData.label, dayNum, dayTitle: dayData.title, task, ti });
          }
        });
      });
    });

    document.getElementById('search-count').style.display = matches.length ? 'block' : 'none';
    document.getElementById('search-count').textContent = `Найдено: ${matches.length}`;
    document.getElementById('empty-state').style.display = matches.length ? 'none' : 'block';

    const re = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')})`, 'gi');
    matches.forEach(m => {
      const el = document.createElement('div');
      el.className = 'search-result-item';
      el.innerHTML = `
        <div class="search-result-meta">
          <span class="search-badge">${m.roleLabel}</span>
          <span class="search-badge">День ${m.dayNum} — ${m.dayTitle}</span>
        </div>
        <div class="search-result-text">${m.task.replace(re, '<mark>$1</mark>')}</div>
      `;
      el.onclick = () => {
        document.getElementById('search-input').value = '';
        handleSearch('');
        setActiveRole(m.roleKey);
        renderDays(m.roleKey);
        setTimeout(() => {
          const card = document.querySelector(`[data-day="${m.dayNum}"]`);
          if (card) {
            card.scrollIntoView({ behavior: 'smooth', block: 'start' });
            const h = card.querySelector('.day-header');
            if (!h.classList.contains('open')) toggleDay(h);
          }
        }, 100);
      };
      resultsEl.appendChild(el);
    });
  }

  // ── INIT ──────────────────────────────────────────────────────────────────
  function setActiveRole(role) {
    document.querySelectorAll('.role-btn').forEach(b => b.classList.remove('active'));
    const btn = document.querySelector(`[data-role="${role}"]`);
    if (btn) btn.classList.add('active');
  }

  function mobileNav(role) {
    // Обновить активную кнопку мобильной навигации
    document.querySelectorAll('.mobile-nav-btn').forEach(b => b.classList.remove('active'));
    const mBtn = document.getElementById('mnav-' + role);
    if (mBtn) mBtn.classList.add('active');
    // Эмулировать клик по sidebar-кнопке
    const sideBtn = document.querySelector('[data-role="' + role + '"]');
    if (sideBtn) sideBtn.click();
  }

  document.addEventListener('DOMContentLoaded', () => {
    // Значение cookie теперь сам пароль, не литерал '1' — сравниваем с константой.
    const authed = getCookie(COOKIE_NAME) === PASSWORD;
    const ob = JSON.parse(localStorage.getItem(OB_KEY) || '{}');

    if (authed) {
      enterPortal(ob.role || 'counselor');
    }

    document.getElementById('login-btn').addEventListener('click', handleLogin);
    document.getElementById('pwd-input').addEventListener('keydown', e => {
      if (e.key === 'Enter') handleLogin();
    });
    document.getElementById('logout-btn').addEventListener('click', () => {
      removeCookie(COOKIE_NAME);
      location.reload();
    });

    document.querySelectorAll('.role-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const role = btn.dataset.role;
        setActiveRole(role);
        // Синхронизировать мобильную навигацию
        const mobileIds = ['counselor','teacher','director','docs','schedule'];
        document.querySelectorAll('.mobile-nav-btn').forEach(b => b.classList.remove('active'));
        if (mobileIds.includes(role)) {
          const mBtn = document.getElementById('mnav-' + role);
          if (mBtn) mBtn.classList.add('active');
        }
        const views = ['days-view','docs-view','intro-view','quiz-view','schedule-view'];
        views.forEach(v => { document.getElementById(v).style.display = 'none'; });
        if (role === 'docs') {
          document.getElementById('docs-view').style.display = 'block';
        } else if (role === 'intro') {
          renderIntroStandalone();
        } else if (role === 'quiz') {
          renderQuizStandalone();
        } else if (role === 'schedule') {
          document.getElementById('schedule-view').style.display = 'block';
          initScheduleView();
        } else {
          renderDays(role);
        }
      });
    });

    function renderIntroStandalone() {
      document.getElementById('intro-view').style.display = 'block';
      document.getElementById('intro-role-label').textContent = ROLE_LABELS[currentRole]?.label?.toLowerCase() || 'вожатый';
      const list = document.getElementById('intro-list');
      const rules = RULES[currentRole] || [];
      list.innerHTML = rules.map((r, i) => `
        <div style="display:flex;gap:12px;align-items:flex-start;padding:14px 16px;background:var(--surface);border:1px solid var(--border);border-radius:12px">
          <div style="flex-shrink:0;width:26px;height:26px;border-radius:50%;background:var(--primary-soft,#fff4e8);color:var(--orange);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px">${i + 1}</div>
          <div style="font-size:15px;line-height:1.55;color:var(--text)">${r}</div>
        </div>
      `).join('');
      logAction({ role: currentRole, action: 'intro_view_open' });
    }

    let quizStandaloneIdx = 0;
    function renderQuizStandalone() {
      document.getElementById('quiz-view').style.display = 'block';
      document.getElementById('quiz-role-label').textContent = ROLE_LABELS[currentRole]?.label?.toLowerCase() || 'вожатый';
      quizStandaloneIdx = 0;
      renderQuizStandaloneStep();
      logAction({ role: currentRole, action: 'quiz_view_open' });
    }

    function renderQuizStandaloneStep() {
      const qs = QUIZ[currentRole] || [];
      if (!qs.length) {
        document.getElementById('quiz-card').innerHTML = '<div style="padding:14px;color:var(--text2)">Тест для этой роли пока не подготовлен.</div>';
        return;
      }
      const total = qs.length;
      const card = document.getElementById('quiz-card');

      if (quizStandaloneIdx >= total) {
        card.innerHTML = `
          <p class="ob-role-title"><i class="bi bi-check2-circle" style="color:#10b981"></i> Тест пройден</p>
          <div class="ob-question">Вы прошли все ${total} вопросов. Можете перепройти заново.</div>
          <button class="ob-next-btn" id="quiz-restart-btn">
            <i class="bi bi-arrow-counterclockwise"></i> Пройти заново
          </button>
        `;
        document.getElementById('quiz-restart-btn').addEventListener('click', () => {
          quizStandaloneIdx = 0;
          renderQuizStandaloneStep();
        });
        return;
      }

      const q = qs[quizStandaloneIdx];
      const dots = Array.from({ length: total }, (_, i) =>
        `<div class="ob-dot ${i < quizStandaloneIdx ? 'done' : i === quizStandaloneIdx ? 'active' : ''}"></div>`
      ).join('');

      card.innerHTML = `
        <div class="ob-step-indicator">${dots}</div>
        <p class="ob-role-title">Вопрос ${quizStandaloneIdx + 1} из ${total}</p>
        <div class="ob-question">${q.q}</div>
        <div class="ob-answers">
          ${q.answers.map((a, i) => `<div class="ob-answer" data-idx="${i}">${a}</div>`).join('')}
        </div>
        <div class="ob-feedback" id="quiz-feedback"></div>
        <button class="ob-next-btn" id="quiz-next" style="display:none">
          ${quizStandaloneIdx < total - 1 ? 'Следующий <i class="bi bi-arrow-right"></i>' : 'Завершить <i class="bi bi-check"></i>'}
        </button>
      `;

      let answered = false;
      card.querySelectorAll('.ob-answer').forEach(btn => {
        btn.addEventListener('click', () => {
          if (answered) return;
          answered = true;
          const chosen = parseInt(btn.dataset.idx);
          const isOk = chosen === q.correct;
          const fb = document.getElementById('quiz-feedback');

          card.querySelectorAll('.ob-answer').forEach((b, i) => {
            if (i === q.correct) b.classList.add('correct');
            else if (i === chosen && !isOk) b.classList.add('wrong');
          });

          fb.textContent = (isOk ? '✓ Верно. ' : '✗ Неверно. ') + q.explanation;
          fb.className = 'ob-feedback ' + (isOk ? 'ok' : 'bad');
          fb.style.display = 'block';

          logAction({ role: currentRole, action: 'quiz_standalone_answer', question: quizStandaloneIdx, correct: isOk });
          document.getElementById('quiz-next').style.display = 'block';
        });
      });

      document.getElementById('quiz-next').addEventListener('click', () => {
        quizStandaloneIdx++;
        renderQuizStandaloneStep();
      });
    }

    document.getElementById('search-input').addEventListener('input', e => {
      handleSearch(e.target.value);
    });
  });

// ── SCHEDULE ──────────────────────────────────────────────────────────────

const SCHEDULES = {
  1: {
    label: 'Смена 1',
    startDate: new Date(2026, 4, 30), // 30 мая 2026
    days: [
      { num:1,  date:'пт, 30 мая',    title:'День заезда',         special:'arrival',
        events:['до 12:00 — Заезд','12:30 — Обед','14:30 — Игры-знакомство','16:00 — Интервью','20:00 — Мои интересы'],
        evening:'Вечернее мероприятие: мои интересы',
      },
      { num:2,  date:'сб, 31 мая',    title:'Программа стартует',
        events:['08:00 — Подъём','09:30 — 1-й блок занятий','11:00 — Активные игры + знакомство','14:30 — Бассейн','16:00 — 2-й блок занятий'],
        evening:'Огонёк знакомств',
      },
      { num:3,  date:'вс, 1 июня',    title:'Командный квест',
        events:['09:30 — 1-й блок занятий','11:00 — Квест "моя команда"','14:30 — Бассейн','16:00 — 2-й блок занятий'],
        evening:'Мой цвет настроения дня',
      },
      { num:4,  date:'пн, 2 июня',    title:'Фильм и спорт',
        events:['09:30 — 1-й блок занятий','11:00 — Игры + короткометражка','14:30 — Бассейн','16:00 — 2-й блок занятий'],
        evening:'Кинопоказ «Звезда АйДаКемп»',
      },
      { num:5,  date:'вт, 3 июня',    title:'Экватор смены',
        events:['09:30 — 1-й блок занятий','11:00 — Активные игры','14:30 — Бассейн','16:00 — 2-й блок занятий'],
        evening:'Огонёк-экватор',
      },
      { num:6,  date:'ср, 4 июня',    title:'Активный день',
        events:['09:30 — 1-й блок занятий','11:00 — Активные игры','14:30 — Бассейн','16:00 — 2-й блок занятий'],
        evening:'Я сегодня молодец, потому что…',
      },
      { num:7,  date:'чт, 5 июня',    title:'Фотокросс',
        events:['09:30 — 1-й блок занятий','11:00 — Активные игры + фотокросс','14:30 — Бассейн','16:00 — 2-й блок занятий'],
        evening:'Итоги фотокросса · мой день …/10',
      },
      { num:8,  date:'пт, 6 июня',    title:'Финишная прямая',
        events:['09:30 — 1-й блок занятий','11:00 — Активные игры','14:30 — Бассейн','16:00 — 2-й блок занятий'],
        evening:'Огонёк завершения смены',
      },
      { num:9,  date:'сб, 7 июня',    title:'Подготовка к защите',
        events:['09:30 — 1-й блок занятий','11:00 — Подготовка к защите','18:00 — Сборка вещей'],
        evening:'Вечер у костра',
      },
      { num:10, date:'вс, 8 июня',    title:'ДЕНЬ ОТЪЕЗДА',        special:'departure',
        events:['09:30 — Сборка вещей + "нас здесь не было"','12:30 — Обед','13:00 — ОТЪЕЗД'],
        evening:'',
      },
    ]
  },
  2: {
    label: 'Смена 2',
    startDate: new Date(2026, 5, 10), // 10 июня 2026
    days: [
      { num:1,  date:'ср, 10 июня',   title:'День заезда',         special:'arrival',
        events:['до 12:00 — Заезд','12:30 — Обед','14:30 — Игры-знакомство','16:00 — Интервью','20:00 — Мои интересы'],
        evening:'Вечернее мероприятие: мои интересы',
      },
      { num:2,  date:'чт, 11 июня',   title:'Программа стартует',
        events:['09:30 — 1-й блок занятий','11:00 — Игры + знакомство','14:30 — Бассейн','16:00 — 2-й блок занятий'],
        evening:'Я сегодня молодец, потому что…',
      },
      { num:3,  date:'пт, 12 июня',   title:'Квест на сплочение',
        events:['09:30 — 1-й блок занятий','11:00 — Квест на сплочение','14:30 — Бассейн','16:00 — 2-й блок занятий'],
        evening:'Огонёк знакомств',
      },
      { num:4,  date:'сб, 13 июня',   title:'Активный день',
        events:['09:30 — 1-й блок занятий','11:00 — Активные игры','14:30 — Бассейн','16:00 — 2-й блок занятий'],
        evening:'Мой цвет настроения дня',
      },
      { num:5,  date:'вс, 14 июня',   title:'АйДаЯрмарка',
        events:['09:30 — 1-й блок занятий','11:00 — Активные игры','14:30 — Бассейн','16:00 — 2-й блок занятий','18:00 — Подготовка к ярмарке'],
        evening:'АйДаЯрмарка',
      },
      { num:6,  date:'пн, 15 июня',   title:'Середина курса',
        events:['09:30 — 1-й блок занятий','11:00 — Активные игры','14:30 — Бассейн','16:00 — 2-й блок занятий'],
        evening:'Я сегодня молодец, потому что…',
      },
      { num:7,  date:'вт, 16 июня',   title:'Экватор смены',
        events:['09:30 — 1-й блок занятий','11:00 — Активные игры','14:30 — Бассейн','16:00 — 2-й блок занятий'],
        evening:'Огонёк-экватор',
      },
      { num:8,  date:'ср, 17 июня',   title:'Интенсив',
        events:['09:30 — 1-й блок занятий','11:00 — Активные игры','14:30 — Бассейн','16:00 — 2-й блок занятий'],
        evening:'Вечернее мероприятие',
      },
      { num:9,  date:'чт, 18 июня',   title:'Интеллектуальная игра',
        events:['09:30 — 1-й блок занятий','11:00 — Активные игры','14:30 — Бассейн','16:00 — 2-й блок занятий'],
        evening:'Интеллектуальная игра',
      },
      { num:10, date:'пт, 19 июня',   title:'Фотокросс',
        events:['09:30 — 1-й блок занятий','11:00 — Активные игры + фотокросс','14:30 — Бассейн','16:00 — 2-й блок занятий'],
        evening:'Итоги фотокросса · мой день …/10',
      },
      { num:11, date:'сб, 20 июня',   title:'Детектив по корпусу',
        events:['09:30 — 1-й блок занятий','11:00 — Активные игры','14:30 — Бассейн','16:00 — 2-й блок занятий'],
        evening:'Детективная игра по корпусу',
      },
      { num:12, date:'вс, 21 июня',   title:'Финишная прямая',
        events:['09:30 — 1-й блок занятий','11:00 — Активные игры','14:30 — Бассейн','16:00 — 2-й блок занятий'],
        evening:'Огонёк завершения смены',
      },
      { num:13, date:'пн, 22 июня',   title:'Защита проектов',
        events:['09:30 — 1-й блок занятий','11:00 — Подготовка к защите','13:00 — Защита проектов','18:00 — Сборка вещей'],
        evening:'Вечер у костра',
      },
      { num:14, date:'вт, 23 июня',   title:'ДЕНЬ ОТЪЕЗДА',        special:'departure',
        events:['09:30 — Сборка вещей + "нас здесь не было"','12:30 — Обед','13:00 — ОТЪЕЗД'],
        evening:'',
      },
    ]
  }
};

const DAY_TASKS = {
  arrival: [
    'Инструктаж всего персонала до заезда детей',
    'Встреча детей и родителей на входе — улыбаемся, помогаем',
    'Контроль размещения по комнатам',
    'ПРИЁМКА помещений: чеклист + фото каждой комнаты → рабочий чат',
    'Встреча с медработником: кто болеет, какие лекарства',
    'Первый инструктаж для детей: режим, правила, телефоны',
    'Знакомство отряда — игры на имена',
    'Обед, тихий час, распаковка',
    'Интервью детей для распределения на занятия',
    'Вечерняя программа: мои интересы',
    'Собрать телефоны, организованный отбой',
    'Вечерний сбор персонала: итоги дня',
    'Общее фото отряда → отправить родителям',
  ],
  regular: [
    'Подъём + зарядка (08:00–08:30)',
    'Завтрак и контроль явки (08:30–09:00)',
    'Уборка комнат (09:00–09:30)',
    'Первый блок занятий (09:30–11:00)',
    'Активные игры / спорт (11:00–12:30)',
    'Обед (12:30–13:00)',
    'Тихий час / настольные игры (13:00–14:30)',
    'Бассейн — соблюдать безопасность (14:30–15:30)',
    'Полдник (15:35)',
    'Второй блок занятий (16:00–18:00)',
    'Игры на свежем воздухе (18:00–19:30)',
    'Ужин (19:30–20:00)',
    'Вечернее мероприятие (20:00–21:00)',
    'Время на телефоны (21:00–21:30)',
    'Подготовка ко сну (21:30–22:00)',
    'Отбой + обход комнат (22:00)',
  ],
  departure: [
    'Ранний подъём — предупредить с вечера',
    'Сборка вещей по комнатам (09:30–12:30)',
    'Мероприятие "нас здесь не было"',
    'Прощальный сбор отряда: слова благодарности каждому',
    'Проверить каждую комнату — ничего не забыто',
    'Быстрый обед (12:30–13:00)',
    'Выдача детей родителям строго по спискам',
    'ПРИЁМКА всех помещений после отъезда: чеклист + фото',
    'Уборка корпуса',
    'Финальный отчёт руководителю',
  ],
};

const PHOTO_TASKS = {
  arrival: [
    'Фото встречи детей на входе',
    'Групповое фото отряда в 1-й день',
    'Видео-интро детей (30 сек): "меня зовут ____, я из ____"',
    'Фото комнат (все убраны, готовы к заезду)',
    'Фото первого обеда',
  ],
  regular: [
    'Фото занятия (ребята за компьютерами)',
    'Фото активных игр на улице',
    'Фото бассейна (без крупных планов)',
    'Видео вечернего мероприятия (30–60 сек)',
  ],
  departure: [
    'Фото финальной демонстрации проектов',
    'Фото вручения грамот/сертификатов',
    'Видео прощального сбора',
    'Фото "до свидания" — ребята с вожатыми',
  ],
};

const ROOM_CHECKLIST_ITEMS = [
  'Свет: все лампочки горят',
  'Туалет: смыв работает',
  'Душ: есть горячая вода',
  'Душ: есть холодная вода',
  'Раковина: вода течёт, нет течи',
  'Кровати: поднять матрасы — каркасы целы',
  'Матрасы: нет дыр, пятен, запаха',
  'Подушки и одеяла: есть, чистые',
  'Занавески: висят, карниз цел',
  'Окна: открываются и закрываются',
  'Замок/ручка двери: работает',
  'Пол: чистый, нет битого стекла',
  'Стены: нет дыр, трещин',
];

const ROOMS = ['101', '102', '103', '104', '105', '106', '107', '108', '109', '110', '201', '202', '203', '204', '205', '206', '207', '208'];

let currentShift = 1;
let currentDay = null;

function getCheckKey(shiftNum, dayNum, type, idx) {
  return 'sched_s' + shiftNum + '_d' + dayNum + '_' + type + '_' + idx;
}
function isChecked(key) { return localStorage.getItem(key) === '1'; }
function setChecked(key, val) { localStorage.setItem(key, val ? '1' : '0'); }

function getTodayDayNum(shiftNum) {
  const today = new Date(); today.setHours(0,0,0,0);
  const shift = SCHEDULES[shiftNum];
  const diffMs = today - shift.startDate;
  const diffDays = Math.floor(diffMs / 86400000) + 1;
  if (diffDays >= 1 && diffDays <= shift.days.length) return diffDays;
  return null;
}

function getDayProgress(shiftNum, dayNum, dayData) {
  const type = dayData.special || 'regular';
  const tasks = DAY_TASKS[type] || DAY_TASKS.regular;
  const total = tasks.length;
  let done = 0;
  tasks.forEach(function(_, i) { if (isChecked(getCheckKey(shiftNum, dayNum, 'task', i))) done++; });
  return { done: done, total: total };
}

function renderSchedGrid() {
  const shift = SCHEDULES[currentShift];
  const todayNum = getTodayDayNum(currentShift);
  const grid = document.getElementById('sched-grid');
  const cols = Math.min(5, shift.days.length);
  grid.style.gridTemplateColumns = 'repeat(' + cols + ', 160px)';

  grid.innerHTML = shift.days.map(function(day) {
    const isToday = day.num === todayNum;
    const prog = getDayProgress(currentShift, day.num, day);
    const isDone = prog.done === prog.total && prog.total > 0;
    const pct = prog.total ? Math.round(prog.done / prog.total * 100) : 0;
    const isSpecial = day.special === 'arrival' || day.special === 'departure';
    return '<div class="sched-day-card ' + (isToday ? 'today' : '') + ' ' + (isDone ? 'done' : '') + '"' +
      ' data-day="' + day.num + '" onclick="openDayDetail(' + day.num + ')">' +
      '<div class="sched-day-num">День ' + day.num + '</div>' +
      '<div class="sched-day-date">' + day.date + '</div>' +
      '<div class="sched-day-title">' + (isSpecial ? '<i class="bi bi-lightning-charge" aria-hidden="true"></i> ' : '') + day.title + '</div>' +
      '<div class="sched-day-events">' +
        day.events.slice(0, 3).map(function(e) {
          return '<div class="sched-day-event ' + (e.includes('Заезд') || e.includes('ОТЪЕЗД') ? 'highlight' : '') + '">' + e + '</div>';
        }).join('') +
        (day.events.length > 3 ? '<div class="sched-day-event">+' + (day.events.length - 3) + ' ещё</div>' : '') +
      '</div>' +
      (day.evening ? '<div class="sched-day-event highlight" style="margin-top:4px"><i class="bi bi-fire" aria-hidden="true"></i> ' + day.evening + '</div>' : '') +
      '<div class="sched-progress"><div class="sched-progress-fill" style="width:' + pct + '%"></div></div>' +
      '</div>';
  }).join('');
}

function openDayDetail(dayNum) {
  currentDay = dayNum;
  const shift = SCHEDULES[currentShift];
  const day = shift.days.find(function(d) { return d.num === dayNum; });
  if (!day) return;

  document.getElementById('sched-grid').closest('.sched-grid-wrap').style.display = 'none';
  document.querySelector('.sched-tabs').style.display = 'none';
  const detail = document.getElementById('sched-detail');
  detail.style.display = 'block';
  document.getElementById('sched-detail-title').textContent = 'День ' + day.num + ' · ' + day.date + ' · ' + day.title;
  // Прокрутить контентную область к верху при открытии дня
  var mainEl = document.querySelector('main') || detail;
  mainEl.scrollTop = 0;
  window.scrollTo(0, 0);

  // 1. Расписание дня
  renderDayScheduleBlock(day);

  // 2. Приёмка помещений (только день 1, свёрнута по умолчанию)
  const roomInsp = document.getElementById('room-inspection');
  roomInsp.style.display = day.num === 1 ? 'block' : 'none';
  if (day.num === 1) {
    // Сбросить состояние аккордеона — всегда закрыт при открытии дня
    var roomBody = document.getElementById('room-inspection-body');
    var chevron = document.getElementById('room-insp-chevron');
    if (roomBody) roomBody.style.display = 'none';
    if (chevron) chevron.style.transform = '';
    renderRoomInspection();
  }

  // 3. Чеклисты по ролям — Вожатый / Преподаватель / Руководитель
  ['counselor', 'teacher', 'director'].forEach(function(role) {
    var roleDay = getRoleDayData(role, dayNum);
    renderRoleChecklist(role, roleDay, currentShift, dayNum);
  });

  // 4. Итоги для родителей — динамически из событий дня
  var parentTasks = buildParentReport(day);
  renderChecklist('photo-checklist', 'photo-badge', parentTasks, currentShift, dayNum, 'photo', 'photo-item');

  const saved = localStorage.getItem('defects_s' + currentShift);
  const defEl = document.getElementById('defects-text');
  if (saved && defEl) defEl.value = saved;
}

function renderDayScheduleBlock(day) {
  var el = document.getElementById('day-sched-section');
  if (!el) return;
  var events = day.events || [];
  if (!events.length && !day.evening) { el.style.display = 'none'; return; }
  el.style.display = 'block';
  var html = '<div class="checklist-section-title" style="margin-top:0;margin-bottom:10px">' +
    '<i class="bi bi-calendar3" aria-hidden="true"></i> Расписание дня</div>' +
    '<div class="day-events-list">';
  events.forEach(function(e) {
    html += '<div class="day-event-item"><i class="bi bi-clock" style="font-size:12px;color:var(--orange)" aria-hidden="true"></i><span>' + e + '</span></div>';
  });
  if (day.evening) {
    html += '<div class="day-event-item evening"><i class="bi bi-moon-stars" style="font-size:12px;color:var(--orange)" aria-hidden="true"></i><span>Вечер: ' + day.evening + '</span></div>';
  }
  html += '</div>';
  el.innerHTML = html;
}

function getRoleDayData(role, dayNum) {
  var roleData = ROLES[role];
  if (!roleData) return null;
  var days = roleData.days;
  if (days[dayNum]) return days[dayNum];
  // Смена 2 — дни 11-13: берём похожий день из 10-дневного шаблона
  if (dayNum >= 11 && dayNum <= 13) return days[Math.min(dayNum - 3, 9)] || days[9] || null;
  if (dayNum >= 14) return days[10] || null; // день отъезда
  return null;
}

function renderRoleChecklist(role, roleDay, shiftNum, dayNum) {
  var bodyEl = document.getElementById('cl-body-' + role);
  var badgeEl = document.getElementById('cl-badge-' + role);
  if (!bodyEl) return;
  var tasks = (roleDay && roleDay.tasks) ? roleDay.tasks : [];
  if (!tasks.length) {
    bodyEl.innerHTML = '<div style="color:var(--text3);font-size:13px;padding:6px 0">Данные не заполнены</div>';
    if (badgeEl) badgeEl.textContent = '—';
    return;
  }
  var done = 0;
  bodyEl.innerHTML = tasks.map(function(task, i) {
    var key = getCheckKey(shiftNum, dayNum, 'role_' + role, i);
    var checked = isChecked(key);
    if (checked) done++;
    var isWarn = task.startsWith('ВАЖНО:') || task.startsWith('ПРИЁМКА');
    return '<label class="checklist-item ' + (checked ? 'checked' : '') + (isWarn ? ' warning' : '') + '" data-key="' + key + '">' +
      '<input type="checkbox" ' + (checked ? 'checked' : '') + ' onchange="toggleRoleCheck(this,\'' + key + '\',\'' + role + '\')">' +
      '<span class="checklist-item-label">' + task + '</span>' +
      '</label>';
  }).join('');
  if (badgeEl) badgeEl.textContent = done + '/' + tasks.length;
}

function toggleRoleCheck(cb, key, role) {
  setChecked(key, cb.checked);
  cb.closest('label').classList.toggle('checked', cb.checked);
  var body = document.getElementById('cl-body-' + role);
  var total = body.querySelectorAll('input[type=checkbox]').length;
  var done = body.querySelectorAll('input[type=checkbox]:checked').length;
  var badge = document.getElementById('cl-badge-' + role);
  if (badge) badge.textContent = done + '/' + total;
  renderSchedGrid();
}

function buildParentReport(day) {
  var type = day.special || 'regular';
  var base = (PHOTO_TASKS[type] || PHOTO_TASKS.regular).slice();
  var extras = [];
  var seen = {};
  function addExtra(t) { if (!seen[t]) { seen[t] = 1; extras.push(t); } }

  (day.events || []).forEach(function(e) {
    var el = e.toLowerCase();
    if (el.indexOf('бассейн') >= 0) addExtra('Фото/видео бассейна → родительский чат');
    if (el.indexOf('футбол') >= 0 || el.indexOf('спорт') >= 0 || el.indexOf('игры') >= 0) addExtra('Фото активных игр/спорта → родительский чат');
    if (el.indexOf('хакатон') >= 0 || el.indexOf('защита') >= 0) addExtra('🎬 Видео защиты проектов — приоритет!');
    if (el.indexOf('квест') >= 0) addExtra('Фото квеста → родительский чат');
    if (el.indexOf('ярмарка') >= 0) addExtra('Фото АйДаЯрмарки → родительский чат');
    if (el.indexOf('занятий') >= 0 || el.indexOf('блок') >= 0) addExtra('Фото занятия (дети за компьютерами) → родительский чат');
  });
  if (day.evening) {
    var ev = day.evening.toLowerCase();
    if (ev.indexOf('огонёк') >= 0) addExtra('Фото/видео огонька → родительский чат');
    if (ev.indexOf('дискотека') >= 0) addExtra('Видео дискотеки → родительский чат');
    if (ev.indexOf('костёр') >= 0) addExtra('Видео вечера у костра → родительский чат');
    if (ev.indexOf('ярмарка') >= 0) addExtra('Фото/видео АйДаЯрмарки → родительский чат');
    if (ev.indexOf('концерт') >= 0) addExtra('Видео концерта → родительский чат');
    if (ev.indexOf('детектив') >= 0 || ev.indexOf('игра') >= 0) addExtra('Фото вечерней игры → родительский чат');
  }

  // Стандартные итоговые задачи
  base = base.concat(extras);
  base.push('Написать краткий текст о дне в родительский чат (2–4 предложения)');
  base.push('Ответить на вопросы родителей (не позднее 22:00)');
  return base;
}

function renderChecklist(containerId, badgeId, items, shiftNum, dayNum, type, cls) {
  const container = document.getElementById(containerId);
  let done = 0;
  container.innerHTML = items.map(function(item, i) {
    const key = getCheckKey(shiftNum, dayNum, type, i);
    const checked = isChecked(key);
    if (checked) done++;
    return '<label class="' + cls + ' ' + (checked ? 'checked' : '') + '" data-key="' + key + '">' +
      '<input type="checkbox" ' + (checked ? 'checked' : '') + ' onchange="toggleCheck(this,\'' + key + '\',\'' + cls + '\')">' +
      '<span class="' + cls + '-label">' + item + '</span>' +
      '</label>';
  }).join('');
  document.getElementById(badgeId).textContent = done + '/' + items.length;
}

function toggleCheck(cb, key, cls) {
  setChecked(key, cb.checked);
  const label = cb.closest('label');
  label.classList.toggle('checked', cb.checked);
  const container = label.parentElement;
  const total = container.querySelectorAll('input[type=checkbox]').length;
  const done = container.querySelectorAll('input[type=checkbox]:checked').length;
  const titleEl = container.previousElementSibling;
  if (titleEl) {
    const badge = titleEl.querySelector('.checklist-badge');
    if (badge) badge.textContent = done + '/' + total;
  }
  renderSchedGrid();
}

function renderRoomInspection() {
  const container = document.getElementById('room-checklist');
  let totalDone = 0, totalAll = 0;
  container.innerHTML = ROOMS.map(function(roomId) {
    const items = ROOM_CHECKLIST_ITEMS;
    let roomDone = 0;
    const itemsHtml = items.map(function(item, i) {
      const key = getCheckKey(currentShift, 1, 'room_' + roomId, i);
      const checked = isChecked(key);
      if (checked) { roomDone++; totalDone++; }
      totalAll++;
      return '<label class="checklist-item ' + (checked ? 'checked' : '') + '" data-key="' + key + '">' +
        '<input type="checkbox" ' + (checked ? 'checked' : '') + ' onchange="toggleRoomCheck(this,\'' + key + '\',\'' + roomId + '\')">' +
        '<span class="checklist-item-label">' + item + '</span>' +
        '</label>';
    }).join('');
    const statusIcon = roomDone === items.length ? '<i class="bi bi-check-circle-fill" style="color:#16a34a" aria-hidden="true"></i>' :
      roomDone > 0 ? '<i class="bi bi-arrow-repeat" aria-hidden="true"></i>' : '<i class="bi bi-square" aria-hidden="true"></i>';
    return '<div class="room-block" id="room-block-' + roomId + '">' +
      '<div class="room-block-header" onclick="toggleRoom(\'' + roomId + '\')">' +
        '<span><span class="room-num">Комн. ' + roomId + '</span>' + statusIcon + '</span>' +
        '<span class="room-block-progress">' + roomDone + '/' + items.length + '</span>' +
      '</div>' +
      '<div class="room-block-body" id="room-body-' + roomId + '" style="display:none">' + itemsHtml + '</div>' +
      '</div>';
  }).join('');
  document.getElementById('room-badge').textContent = totalDone + '/' + totalAll;
}

function toggleRoom(roomId) {
  const body = document.getElementById('room-body-' + roomId);
  body.style.display = body.style.display === 'none' ? 'block' : 'none';
}

function toggleRoomCheck(cb, key, roomId) {
  setChecked(key, cb.checked);
  cb.closest('label').classList.toggle('checked', cb.checked);
  const block = document.getElementById('room-block-' + roomId);
  const total = block.querySelectorAll('input[type=checkbox]').length;
  const done = block.querySelectorAll('input[type=checkbox]:checked').length;
  block.querySelector('.room-block-progress').textContent = done + '/' + total;
  const allInputs = document.querySelectorAll('#room-checklist input[type=checkbox]');
  const allDone = Array.from(allInputs).filter(function(i) { return i.checked; }).length;
  document.getElementById('room-badge').textContent = allDone + '/' + allInputs.length;
}

function toggleRoomInspection() {
  var body = document.getElementById('room-inspection-body');
  var chevron = document.getElementById('room-insp-chevron');
  var open = body.style.display !== 'none';
  body.style.display = open ? 'none' : 'block';
  if (chevron) chevron.style.transform = open ? '' : 'rotate(180deg)';
}

document.querySelectorAll('.sched-tab').forEach(function(tab) {
  tab.addEventListener('click', function() {
    document.querySelectorAll('.sched-tab').forEach(function(t) { t.classList.remove('active'); });
    tab.classList.add('active');
    currentShift = parseInt(tab.dataset.shift);
    renderSchedGrid();
  });
});

document.getElementById('sched-back').addEventListener('click', function() {
  document.getElementById('sched-detail').style.display = 'none';
  document.getElementById('sched-grid').closest('.sched-grid-wrap').style.display = 'block';
  document.querySelector('.sched-tabs').style.display = 'flex';
  currentDay = null;
  renderSchedGrid();
});

document.getElementById('copy-defects').addEventListener('click', function() {
  const text = document.getElementById('defects-text').value;
  if (!text.trim()) { alert('Нет замечаний для копирования'); return; }
  navigator.clipboard.writeText(text).then(function() {
    const btn = document.getElementById('copy-defects');
    const orig = btn.innerHTML;
    btn.innerHTML = '<i class="bi bi-check-lg"></i> Скопировано!';
    setTimeout(function() { btn.innerHTML = orig; }, 2000);
  });
});

document.getElementById('defects-text').addEventListener('input', function() {
  localStorage.setItem('defects_s' + currentShift, this.value);
});

function initScheduleView() {
  renderSchedGrid();
}

// Expose global functions for HTML event handlers
Object.assign(window, {
  buildParentReport, getCheckKey, getDayProgress, getRoleDayData,
  getTodayDayNum, initScheduleView, isChecked, openDayDetail,
  renderChecklist, renderDayScheduleBlock, renderRoleChecklist,
  renderRoomInspection, renderSchedGrid, setChecked,
  toggleCheck, toggleRoleCheck, toggleRoom, toggleRoomCheck, toggleRoomInspection,
});
