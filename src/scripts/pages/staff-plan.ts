// @ts-nocheck

/* ============== РЕЖИМ ХРАНЕНИЯ ==============
   Превью: state в памяти/localStorage (персонально, без общего сохранения).
   Реальная страница переопределяет PERSIST.load/save на /api/shift-plan. */
const PERSIST = window.PERSIST || {
  mode:'preview',
  load: async()=> { try{ return JSON.parse(localStorage.getItem('ac_shift_plan')||'null'); }catch(e){ return null; } },
  save: async(p)=> { try{ localStorage.setItem('ac_shift_plan', JSON.stringify(p)); }catch(e){} return true; },
};

const ROLES={
  counselor:{label:'Вожатый',plural:'Вожатые',icon:'bi-person-arms-up',editor:true},
  teacher:{label:'Преподаватель',plural:'Преподаватели',icon:'bi-laptop',editor:true},
  manager:{label:'Руководитель',plural:'Руководство',icon:'bi-clipboard-check',editor:true},
  medic:{label:'Медработник',plural:'Медработник',icon:'bi-heart-pulse-fill',editor:false},
  chief:{label:'Начальник лагеря',plural:'Хозяйство и безопасность',icon:'bi-shield-fill',editor:false},
  assistant:{label:'Помощник преп.',plural:'Помощники преподавателей',icon:'bi-person-badge',editor:false},
};
const EDITOR_ROLES=['counselor','teacher','manager'];
const ALL_ROLES=['counselor','teacher','manager','assistant','medic','chief'];
const AV_COLORS=['#f97316','#2563eb','#16a34a','#9333ea','#0891b2','#db2777','#ca8a04','#0d9488'];
const TYPE_LABEL={arrival:'День заезда',study:'Учебный день',defense:'Показ / защита',departure:'День выезда'};

/* ============== SEED: реальный план из «боевого документа» ============== */
function defaultPlan(){
  const team=[
    {id:'c1',name:'Вожатый · Junior-1',role:'counselor',group:'Junior-1'},
    {id:'c2',name:'Вожатый · Junior-2',role:'counselor',group:'Junior-2'},
    {id:'c3',name:'Вожатый · Middle-1',role:'counselor',group:'Middle-1'},
    {id:'c4',name:'Вожатый · Middle-2',role:'counselor',group:'Middle-2'},
    {id:'c5',name:'Вожатый · Senior',role:'counselor',group:'Senior'},
    {id:'t1',name:'Преп. · Junior (программирование)',role:'teacher',group:'Junior'},
    {id:'t2',name:'Преп. · Python (Middle-1)',role:'teacher',group:'Middle-1'},
    {id:'t3',name:'Преп. · Веб (Middle-2)',role:'teacher',group:'Middle-2'},
    {id:'t4',name:'Преп. · AI & CV (Senior)',role:'teacher',group:'Senior'},
    {id:'m1',name:'Руководитель смены',role:'manager',group:''},
    {id:'med',name:'Медработник',role:'medic',group:''},
    {id:'chief',name:'Начальник лагеря',role:'chief',group:''},
    {id:'a1',name:'Помощник · Junior',role:'assistant',group:'Junior'},
    {id:'a2',name:'Помощник · Middle',role:'assistant',group:'Middle'},
    {id:'a3',name:'Помощник · Senior',role:'assistant',group:'Senior'},
  ];
  const groups=['Все','Junior-1','Junior-2','Middle-1','Middle-2','Senior','Junior','Middle','Middle/Senior'];
  const days=[
    {n:1,date:'пт, 30 мая',type:'arrival',title:'Прибытие и встреча'},
    {n:2,date:'сб, 31 мая',type:'study',title:'Первые уроки'},
    {n:3,date:'вс, 1 июн',type:'study',title:'Погружение'},
    {n:4,date:'пн, 2 июн',type:'study',title:'Закрепление и проектная работа'},
    {n:5,date:'вт, 3 июн',type:'defense',title:'Промежуточный показ'},
    {n:6,date:'ср, 4 июн',type:'defense',title:'Финал. доработки и конкурсы'},
    {n:7,date:'чт, 5 июн',type:'departure',title:'Отъезд'},
  ];
  // обязательное расписание (якоря из шаблона) по типам дня
  const anchors={
    arrival:[['15:30','16:00','Обед'],['18:00','18:45','Ужин'],['21:00','','Отбой']],
    study:[['08:00','08:30','Подъём, туалет'],['08:30','09:00','Завтрак'],['11:00','11:15','Полдник'],['12:15','13:00','Обед'],['13:00','14:00','Тихий час'],['15:00','15:15','Полдник'],['17:15','18:00','Ужин'],['21:00','','Отбой']],
    defense:[['08:00','08:30','Подъём, туалет'],['08:30','09:00','Завтрак'],['11:00','11:15','Полдник'],['12:15','13:00','Обед'],['13:00','14:00','Тихий час'],['17:15','18:00','Ужин'],['21:00','','Отбой']],
    departure:[['08:00','08:30','Подъём'],['08:30','09:00','Завтрак (последний)'],['12:00','13:00','Прощальный обед']],
  };
  let _id=0; const A=(day,role,start,end,title,resp,type,place,group,chk,desc)=>({
    id:'a'+(++_id),day,role,start,end,title,resp:resp||'',type,place:place||'',group:group||'Все',
    desc:desc||'',checklist:(chk||[]).map(t=>({text:t,done:false})),status:'planned',result:''});
  const acts=[
    // ── ДЕНЬ 1 ──
    A(0,'manager','14:00','14:45','Встреча на парковке/вокзале','m1','mandatory','Площадка встреч','Все',['Список детей','Проверка документов']),
    A(0,'counselor','14:45','15:30','Завоз вещей в корпуса','c1','mandatory','Корпуса 1-3','Все',['Помощь с чемоданами','Расселение по комнатам']),
    A(0,'counselor','16:00','16:30','Знакомство группы · ледокол «Имя + суперсила»','c1','extra','Кабинеты','Все',['Реквизит готов','Каждый назвал суперсилу']),
    A(0,'counselor','16:30','17:30','Экскурсия по лагерю','c2','mandatory','Территория','Все',['Столовая, корпуса, туалеты','Медпункт, класс']),
    A(0,'counselor','17:30','18:00','Общелагерная игра · эстафета-знакомство','c3','extra','Поляна','Все',['Командное деление','Финальное фото']),
    A(0,'manager','19:00','20:30','Огонёк знакомства','m1','mandatory','Костровая','Все',['Представить вожатых','Правила и расписание']),
    A(0,'counselor','20:30','21:00','Вечерний туалет, подготовка ко сну','c1','mandatory','Корпуса','Все',['Проверка наличия всех']),
    A(0,'manager','21:30','','Отчёт родителям · День 1','m1','extra','—','Все',['8-10 фото','Текст-анонс','Видео 20-30 сек'],'Публикация в чат после отбоя'),
    // ── ДЕНЬ 2 ──
    A(1,'teacher','09:00','09:50','Урок 1: Введение в ИИ','t4','mandatory','Класс A','Все',['Проектор работает','Интернет есть','Звук включён'],'Что такое ИИ, примеры, как работает. 40 мин лекция + 10 вопросы.'),
    A(1,'teacher','10:00','10:50','Урок 2: Первый код (Scratch)','t1','mandatory','Класс A','Junior',['Ноутбуки 12 заряжены','Scratch открыт'],'Команды Scratch, рисуем квадрат ×4. Каждый сохранил файл.'),
    A(1,'teacher','10:00','10:50','Урок 2: Python basics','t2','mandatory','Класс B','Middle-1',['Ноутбуки 15','PyCharm установлен','Шпаргалка'],'Переменные, типы, print(). Программа «Hello, [имя]».'),
    A(1,'teacher','10:00','10:50','Урок 2: HTML/CSS intro','t3','mandatory','Класс C','Middle-2',['VS Code','Шаблон HTML скачан'],'Структура HTML, CSS. Карточка с именем и аватаром.'),
    A(1,'teacher','10:00','10:50','Урок 2: Computer Vision','t4','mandatory','Класс D','Senior',['Jupyter notebook','API-ключ в .env'],'Как ИИ видит изображения. Классификация объектов (ImageNet).'),
    A(1,'counselor','11:30','12:15','Квест по лагерю','c2','extra','Территория','Все',['Подсказки распечатаны','5 конвертов с заданиями','Фото команд']),
    A(1,'teacher','14:00','14:15','Видеоурок: как делают мемы с ИИ','t4','extra','Класс A','Middle/Senior',['Видеопроектор','Интернет'],'Kinescope ID tJAaAnvCYYJ5vRz7uyUepj + обсуждение.'),
    A(1,'counselor','15:30','16:30','Спортивная игра (волейбол/футбол/регби)','c4','extra','Спортплощадка','Все',['Мячи 3 шт','Сетка (если волейбол)']),
    A(1,'manager','18:00','18:20','Огонёк отзывов о Дне 1','m1','extra','Костровая','Все',['Каждый — одно слово о дне','Фото у костра']),
    A(1,'counselor','18:30','19:30','Вечерняя игра или кино','c5','extra','Класс A','Все',[]),
    A(1,'manager','19:00','19:15','Стендап команды','m1','mandatory','—','Все',['Что получилось','Какие проблемы','Что менять']),
    A(1,'manager','20:00','20:30','Сборка отчёта родителям','m1','extra','Кабинет','Все',['Фото от каждого курса','Видео-моменты','Текст ~250 слов']),
    A(1,'manager','20:30','','Публикация в чат родителям','m1','extra','—','Все',['10 фото','Видео 30 сек']),
    // ── ДЕНЬ 3 ──
    A(2,'teacher','09:00','10:00','Урок 3 (по группам)','','mandatory','Классы','Все',['Фото результата','Сохранить файлы']),
    A(2,'teacher','10:30','11:30','Урок 4 — усложнение заданий','','mandatory','Классы','Все',[]),
    A(2,'counselor','12:15','13:00','Творческое занятие (рисование/музыка/драма)','c1','extra','Корпуса','Все',[]),
    A(2,'teacher','14:30','15:30','Практика: доработка проектов','','mandatory','Классы','Все',[]),
    A(2,'counselor','15:30','16:30','Спорт / свободная активность','c4','extra','Спортплощадка','Все',[]),
    A(2,'counselor','18:15','19:30','Вечернее мероприятие (дискотека/конкурс/сценка)','c5','extra','Класс A','Все',[]),
    A(2,'manager','20:30','','Публикация для родителей','m1','extra','—','Все',['12 фото','Видео 45 сек']),
    // ── ДЕНЬ 4 ──
    A(3,'teacher','09:00','11:30','Создание простой игры на Scratch','t1','mandatory','Класс A','Junior',[]),
    A(3,'teacher','09:00','11:30','Контрольная по Python (условия, циклы)','t2','mandatory','Класс B','Middle-1',[]),
    A(3,'teacher','09:00','11:30','Первая версия личного сайта','t3','mandatory','Класс C','Middle-2',[]),
    A(3,'teacher','09:00','11:30','Тренировка модели на своих данных','t4','mandatory','Класс D','Senior',[]),
    A(3,'teacher','14:30','15:30','Практика: доработка проектов','','mandatory','Классы','Все',[]),
    A(3,'counselor','12:15','13:00','Вожатская активность','c2','extra','Территория','Все',[]),
    A(3,'counselor','18:15','19:30','Вечернее мероприятие','c5','extra','Класс A','Все',[]),
    A(3,'manager','20:30','','Отчёт родителям','m1','extra','—','Все',[]),
    // ── ДЕНЬ 5 ──
    A(4,'teacher','09:00','11:30','Уроки — продолжение проектов','','mandatory','Классы','Все',[]),
    A(4,'manager','15:30','17:00','Промежуточный показ (каждая группа 5 мин)','m1','mandatory','Класс A','Все',['Расписание выступлений','Фото/видео нарезка 5-10 мин']),
    A(4,'counselor','18:15','19:30','Вечернее мероприятие','c5','extra','Класс A','Все',[]),
    A(4,'manager','20:30','','Отчёт родителям','m1','extra','—','Все',[]),
    // ── ДЕНЬ 6 ──
    A(5,'teacher','09:00','11:30','Финальные доработки проектов','','mandatory','Классы','Все',[]),
    A(5,'manager','15:30','17:00','Конкурс проектов (голосование групп)','m1','mandatory','Класс A','Все',['Бланки голосования','Жюри']),
    A(5,'counselor','15:30','17:00','Спортивный праздник / квест','c4','extra','Спортплощадка','Все',[]),
    A(5,'manager','19:00','20:30','Праздничный ужин, объявление результатов','m1','extra','Столовая','Все',['Награды/дипломы готовы']),
    A(5,'manager','20:30','','Отчёт родителям','m1','extra','—','Все',[]),
    // ── ДЕНЬ 7 ──
    A(6,'counselor','09:00','10:00','Сборка вещей','c1','mandatory','Корпуса','Все',['Ничего не забыли','Проверка номеров комнат']),
    A(6,'counselor','10:00','10:30','Контрольная проверка корпусов','c2','mandatory','Корпуса','Все',['Мусор','Свет','Окна','Замки']),
    A(6,'manager','10:30','11:00','Прощальный огонёк','m1','mandatory','Костровая','Все',['Каждый говорит спасибо']),
    A(6,'counselor','11:00','11:15','Фото на память','c3','mandatory','Поляна','Все',['Общая фотография','Групповые фото']),
    A(6,'manager','11:15','11:45','Раздача сертификатов и подарков','m1','mandatory','Поляна','Все',['Сертификаты готовы ДО дня','Печатные фото']),
    A(6,'counselor','11:45','12:00','Сборка в автобусе','c1','mandatory','Парковка','Все',['Счёт детей','Проверка списка']),
    A(6,'manager','12:00','','Отправление','m1','mandatory','Парковка','Все',[]),
    A(6,'counselor','13:30','14:00','Передача детей родителям','c1','mandatory','Вокзал','Все',['Счёт детей','Передача каждого маме/папе']),
    A(6,'manager','14:30','','Финальный отчёт родителям','m1','extra','—','Все',['Финальный ролик 2-3 мин','Текст благодарности']),
  ];
  const roleChecklists={
    counselor:{
      before:['Полное расписание смены распечатано','Список детей в группе (имена, как выглядят)','Информация об аллергиях / особенностях','5-7 простых игр в запасе','Песни для огонька выучены'],
      daily:['Все дети на месте (утренний счёт)','Завтрак готов вовремя','Дети умыты и одеты','Никто не ранен, не болен, не грустит'],
    },
    teacher:{
      before:['Полный план курса (7 дней) написан','Презентации готовы и скачаны','Файлы загружены на ноутбуки','Ноутбуки заряжены, ПО установлено','Интернет протестирован','API-ключи готовы','Резервные PDF уроков','Чек-лист перед каждым уроком'],
      daily:['Класс подготовлен (столы, свет)','Проектор работает, видно чётко','Интернет включён','Ноутбуки детей готовы','Файлы открыты','Звук проверен','Камера/телефон для фото результатов'],
    },
    manager:{
      before:['Все преподаватели сдали планы','Все вожатые сдали активности','Материалы проверены','Ноутбуки протестированы','Интернет в классах','Камеры заряжены','Родительский чат настроен','График постов 20:30','Контакты (в т.ч. аварийные)'],
      daily:['08:30 — проверка завтрака','08:45 — звонки преподавателям («готово к 09:00?»)','10:30 — проверка хода уроков','13:00 — проверка обеда','15:00 — проверка активностей вожатых','19:00 — стендап (15 мин)','20:00 — сборка отчёта','20:30 — публикация','21:00 — контроль отбоя'],
    },
  };
  const parentReports=[
    {day:0,time:'21:30',photos:'8-10',video:'видео 20-30 сек (огонёк/эстафета)',textTarget:'Текст-анонс: ребята прибыли, познакомились, проверили лагерь, первая игра',draft:'',status:'draft',shots:['Встреча на входе','Завоз вещей','Ледокол','Общелагерная игра','Огонёк знакомства']},
    {day:1,time:'20:30',photos:'10',video:'видео 30 сек с огонька',textTarget:'~250 слов: что прошли (Junior — первый код, Middle — сайты, Senior — ИИ), спорт, огонёк',draft:'',status:'draft',shots:['По фото на каждый класс','Спортивная игра','Огонёк отзывов']},
    {day:2,time:'20:30',photos:'12',video:'видео 45 сек (проекты + дискотека)',textTarget:'Освоились, создают реальные проекты, вечером дискотека',draft:'',status:'draft',shots:['2 фото на урок','Спорт','Дискотека']},
    {day:3,time:'20:30',photos:'10',video:'видео',textTarget:'Закрепление и проектная работа',draft:'',status:'draft',shots:['Уроки в процессе','Вожатская активность']},
    {day:4,time:'20:30',photos:'10',video:'нарезка показа',textTarget:'Промежуточный показ — каждая группа выступила',draft:'',status:'draft',shots:['Выступления групп','Зрители','Лучшие проекты']},
    {day:5,time:'20:30',photos:'12',video:'видео',textTarget:'Конкурс проектов, награждение, праздничный ужин',draft:'',status:'draft',shots:['Конкурс','Награждение','Праздничный ужин']},
    {day:6,time:'14:00',photos:'15',video:'финальный ролик 2-3 мин (лучшие моменты недели)',textTarget:'Смена закончилась, благодарность родителям. Публикация сразу после отправления',draft:'',status:'draft',shots:['Сборы','Прощальный огонёк','Групповые фото','Отправление']},
  ];
  return {
    shift:{name:'Смена «АйДаКемп» 2026',place:'Санаторий Изумруд, Волоколамский р-н',kids:'60+ детей (7-16 лет)',duration:'7 дней / 6 ночей'},
    groupsInfo:[
      {id:'Junior-1',age:'7-9',count:12,course:'Введение в программирование'},
      {id:'Junior-2',age:'7-9',count:12,course:'Введение в программирование'},
      {id:'Middle-1',age:'10-12',count:15,course:'Python для детей'},
      {id:'Middle-2',age:'10-12',count:15,course:'Веб-разработка'},
      {id:'Senior',age:'13-16',count:10,course:'AI & Computer Vision'},
    ],
    team, groups, days, anchors, activities:acts, roleChecklists, parentReports,
    rooms:defaultRooms(),
    roster:[
      {id:'k1',name:'Иванов Пётр (пример)',gender:1,age:11,alfaId:null},
      {id:'k2',name:'Петров Илья (пример)',gender:1,age:12,alfaId:null},
      {id:'k3',name:'Сидорова Аня (пример)',gender:0,age:10,alfaId:null},
      {id:'k4',name:'Кузнецова Маша (пример)',gender:0,age:11,alfaId:null},
      {id:'k5',name:'Орлов Дима (пример)',gender:1,age:9,alfaId:null},
      {id:'k6',name:'Смирнова Лиза (пример)',gender:0,age:12,alfaId:null},
    ],
    _seedTitleId:_id,
  };
}

/* ============== STATE ============== */
// Инициализация view и embed-режима из URL (?view=rooms&embed=1 — без sidebar/topbar).
const _qsp = new URLSearchParams(location.search);
const _vp = _qsp.get('view') || '';
const _vmap = ['rooms','schedule','overview','load','dgrid','editor','groups','reports','checklists','settings','team','log'];
const _initView = _vmap.includes(_vp) ? _vp : 'schedule';
if (_qsp.get('embed') === '1') document.body.classList.add('embed-mode');
let plan=null, store=null, currentUser=null, view=_initView, currentRole='counselor', editorDay=0, filter='all', groupFilter='all', groupsScope='teacher', modalChk=[], saveTimer=null, _dragId=null;
function nid(p){ return p+Date.now().toString(36)+Math.random().toString(36).slice(2,6); }
function activeShift(){ return store.shifts.find(s=>s.id===store.activeId) || store.shifts[0]; }
function clonePlan(pl){ return JSON.parse(JSON.stringify(pl, (k,v)=> k.charAt(0)==='_'?undefined:v)); }
function defaultRooms(){ const R=(id,name,cap)=>({id,name,cap,counselor:'',beds:Array(cap).fill(null)}); return [
  R('r1','1 этаж · 101',4), R('r2','1 этаж · 102',4), R('r3','1 этаж · 103',4), R('r4','1 этаж · 104',3),
  R('r5','2 этаж · 201',4), R('r6','2 этаж · 202',4), R('r7','2 этаж · 203',4), R('r8','2 этаж · 204',3),
]; }
let dragKid=null;
const AGE_SPREAD=3; // макс. норм. разброс возраста в комнате (лет)

// ── время: helpers для drag-and-drop ──
function toMin(t){ if(!t)return null; const [h,m]=t.split(':').map(Number); return h*60+m; }
function toHHMM(min){ min=Math.max(0,Math.min(1439,Math.round(min))); const h=Math.floor(min/60), m=min%60; return String(h).padStart(2,'0')+':'+String(m).padStart(2,'0'); }
function round5(min){ return Math.round(min/5)*5; }

// Какие уроки (по полю group активности) попадают в реальную группу
const GROUP_MEMBERSHIP={
  'Junior-1':['Junior-1','Junior','Все'],
  'Junior-2':['Junior-2','Junior','Все'],
  'Middle-1':['Middle-1','Middle','Middle/Senior','Все'],
  'Middle-2':['Middle-2','Middle','Middle/Senior','Все'],
  'Senior':['Senior','Middle/Senior','Все'],
};
function groupMatch(actGroup,row){ return (GROUP_MEMBERSHIP[row]||[row]).includes(actGroup); }

function initials(name){ const p=name.replace(/[·•]/g,' ').split(/\s+/).filter(Boolean); return ((p[0]?.[0]||'')+(p[1]?.[0]||'')).toUpperCase(); }
function avColor(id){ const i=plan.team.findIndex(p=>p.id===id); return AV_COLORS[(i<0?0:i)%AV_COLORS.length]; }
function person(id){ return plan.team.find(p=>p.id===id); }
function avatar(id,lg){ const p=person(id); if(!p) return ''; return `<span class="avatar${lg?' lg':''}" style="background:${avColor(id)}" title="${p.name}">${initials(p.name)}</span>`; }
function actsFor(day,role){ return plan.activities.filter(a=>a.day===day&&a.role===role).sort((a,b)=>(a.start||'').localeCompare(b.start||'')); }
function chkProgress(a){ const d=a.checklist.filter(c=>c.done).length; return {d,t:a.checklist.length}; }
function dayStatus(day){ let lanes=0,unassigned=0; EDITOR_ROLES.forEach(r=>{const acts=actsFor(day,r); if(acts.length){lanes++; if(acts.some(a=>!a.resp))unassigned++;}}); if(unassigned)return'red'; if(lanes<3)return'orange'; return'green'; }
function esc(s){ return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

/* ============== SAVE ============== */
function markSaving(){ const el=document.getElementById('savePill'); el.className='save-pill'; el.innerHTML='<i class="bi bi-arrow-repeat"></i> сохранение…'; }
function markSaved(){ const el=document.getElementById('savePill'); el.className='save-pill saved'; el.innerHTML='<i class="bi bi-check-circle-fill"></i> сохранено'; }
const VIEW_LABEL={schedule:'Расписание',overview:'Вся смена',load:'Загрузка',dgrid:'Сетка дня',rooms:'Расселение',editor:'Моё расписание',groups:'По группам',reports:'Отчёт родителям',checklists:'Чек-листы',settings:'Параметры',team:'Команда',log:'Журнал'};
function logChange(action){
  if(!store) return;
  store.log=store.log||[];
  const user=(currentUser&&currentUser.name)||'—';
  const text=action||('правка · '+(VIEW_LABEL[view]||view));
  const last=store.log[0];
  if(last && last.user===user && last.text===text && (Date.now()-last.ts)<90000){ last.ts=Date.now(); return; } // дедуп серии
  store.log.unshift({ts:Date.now(), user, text});
  if(store.log.length>300) store.log.length=300;
}
function commit(action){ logChange(action); markSaving(); clearTimeout(saveTimer); saveTimer=setTimeout(async()=>{ await PERSIST.save(store); markSaved(); },400); }
async function commitNow(action){ logChange(action); clearTimeout(saveTimer); markSaving(); try{ await PERSIST.save(store); }catch(e){} markSaved(); }

/* ============== ROOT ============== */
function render(){
  if(store) plan=activeShift().plan;
  const ss=document.getElementById('shiftSelect');
  if(ss&&store) ss.innerHTML=store.shifts.map(s=>`<option value="${s.id}" ${s.id===store.activeId?'selected':''}>${esc(s.plan.shift.name)}</option>`).join('');
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
  document.getElementById('roleSelect').value=currentRole;
  const wb=document.getElementById('whoBtn'); if(wb) wb.textContent=(currentUser&&currentUser.name)||'представьтесь';
  document.getElementById('modeBadge').textContent=PERSIST.mode==='live'?'рабочая':'превью';
  document.getElementById('shiftMeta').innerHTML=`<b>${esc(plan.shift.name)}</b><br>${esc(plan.shift.place)}<br>${esc(plan.shift.kids)} · ${plan.days.length} дней`;
  const c=document.getElementById('content');
  c.innerHTML = view==='schedule'?renderSchedule() : view==='overview'?renderOverview() : view==='load'?renderLoad() : view==='dgrid'?renderGridDay() : view==='rooms'?renderRooms() : view==='editor'?renderEditor() : view==='groups'?renderGroups() : view==='reports'?renderReports() : view==='checklists'?renderChecklists() : view==='settings'?renderSettings() : view==='log'?renderLog() : renderTeam();
}
function setView(v){ view=v; render(); }
function setRole(r){ currentRole=r; render(); }

/* ── личность (для журнала) ── */
let _idRole='counselor';
function renderIdRoles(){ document.querySelectorAll('#id-role .id-r').forEach(b=>b.classList.toggle('on',b.dataset.r===_idRole)); }
function openIdentity(){ _idRole=(currentUser&&currentUser.role)||currentRole||'counselor'; document.getElementById('id-name').value=(currentUser&&currentUser.name)||''; renderIdRoles(); document.getElementById('idOverlay').classList.add('open'); setTimeout(()=>{try{document.getElementById('id-name').focus();}catch(e){}},50); }
function idPickRole(r){ _idRole=r; renderIdRoles(); }
function closeIdentity(){ document.getElementById('idOverlay').classList.remove('open'); }
function saveIdentity(){ const n=document.getElementById('id-name').value.trim(); if(!n){alert('Введите имя');return;} currentUser={name:n,role:_idRole}; try{localStorage.setItem('ac_staff_user',JSON.stringify(currentUser));}catch(e){} currentRole=_idRole; closeIdentity(); render(); }

/* ── журнал изменений ── */
function renderLog(){
  const log=(store&&store.log)||[];
  const fmt=ts=>new Date(ts).toLocaleString('ru-RU',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
  const rows=log.length?log.map(e=>`<div class="log-row"><span class="log-time">${fmt(e.ts)}</span><span class="log-user">${esc(e.user)}</span><span class="log-text">${esc(e.text)}</span></div>`).join(''):'<div style="color:var(--text3);padding:26px;text-align:center">Журнал пуст — записи появятся при изменениях плана</div>';
  return `<div class="c-head"><div><div class="c-title">Журнал изменений</div><div class="c-sub">Кто и что менял в плане смены — автоматически по действиям. Всего записей: ${log.length}.</div></div></div><div class="log-list">${rows}</div>`;
}

/* ── смены: переключение / создание / дублирование / удаление ── */
function switchShift(id){ store.activeId=id; plan=activeShift().plan; editorDay=0; render(); commit(); }
function newShift(){ const p=defaultPlan(); p.shift.name='Смена '+(store.shifts.length+1); const id=nid('s'); store.shifts.push({id,plan:p}); store.activeId=id; editorDay=0; view='settings'; commit(); render(); }
function duplicateShift(id){ const src=store.shifts.find(s=>s.id===id)||activeShift(); const p=clonePlan(src.plan); p.shift.name=(src.plan.shift.name||'Смена')+' (копия)'; const v=nid('s'); store.shifts.push({id:v,plan:p}); store.activeId=v; editorDay=0; view='settings'; commit(); render(); }
function deleteShift(id){ if(store.shifts.length<=1){ alert('Должна остаться хотя бы одна смена'); return; } const s=store.shifts.find(x=>x.id===id); if(!confirm('Удалить смену «'+(s.plan.shift.name||'')+'»? Необратимо.')) return; store.shifts=store.shifts.filter(x=>x.id!==id); if(store.activeId===id) store.activeId=store.shifts[0].id; plan=activeShift().plan; editorDay=0; commit(); render(); }
function renameShift(id,v){ const s=store.shifts.find(x=>x.id===id); if(s&&v.trim()){ s.plan.shift.name=v.trim(); commit(); render(); } }

/* ============== РАСПИСАНИЕ (классическая день-таблица) ============== */
function personSelect(id,field,val){
  return `<select class="p-sel${val?'':' unset'}" onchange="setPersonField('${id}','${field}',this.value)"><option value="">${field==='resp'?'— ответственный —':'— исполнитель —'}</option>`
    + plan.team.map(p=>`<option value="${p.id}" ${val===p.id?'selected':''}>${esc(p.name)}</option>`).join('') + `</select>`;
}
function setPersonField(id,f,v){ const a=plan.activities.find(x=>x.id===id); if(a){a[f]=v; commit(); render();} }
function gotoEdit(role,day){ currentRole=role; editorDay=day; view='editor'; render(); }

const ROLE_COLOR={counselor:'#16a34a',teacher:'#2563eb',manager:'#f97316',medic:'#dc2626',chief:'#0d9488',assistant:'#9333ea'};
function actInterval(a){ const s=toMin(a.start); const e=a.end?toMin(a.end):s+30; return [s, Math.max(e, s+5)]; }
function bucketOf(min){ return min<540?'Утро':min<780?'Занятия':min<1080?'После обеда':'Вечер'; }
function dayConflicts(day){
  const acts=plan.activities.filter(a=>a.day===day), byP={}, conf={};
  acts.forEach(a=>{ const [s,e]=actInterval(a); [a.resp,a.exec].forEach(pid=>{ if(pid)(byP[pid]=byP[pid]||[]).push({a,s,e}); }); });
  Object.keys(byP).forEach(pid=>{ const l=byP[pid]; for(let i=0;i<l.length;i++)for(let j=i+1;j<l.length;j++){ if(l[i].s<l[j].e&&l[j].s<l[i].e){ const nm=((person(pid)||{}).name||'?').split('·')[0].trim();
    (conf[l[i].a.id]=conf[l[i].a.id]||[]).push(nm+': также «'+l[j].a.title+'» '+l[j].a.start);
    (conf[l[j].a.id]=conf[l[j].a.id]||[]).push(nm+': также «'+l[i].a.title+'» '+l[i].a.start); } } });
  return conf;
}
function dayLoad(day){ const m={}; plan.activities.filter(a=>a.day===day).forEach(a=>{ const [s,e]=actInterval(a); [a.resp,a.exec].forEach(pid=>{ if(pid){ const o=m[pid]=m[pid]||{n:0,min:0}; o.n++; o.min+=(e-s); } }); }); return m; }

function renderSchedule(){
  if(editorDay>=plan.days.length) editorDay=plan.days.length-1; if(editorDay<0) editorDay=0;
  let chips=`<div class="day-chips">`;
  plan.days.forEach((d,i)=>{ chips+=`<div class="chip${i===editorDay?' active':''}" onclick="selDay(${i})"><span class="chip-n">День ${d.n}</span><span class="chip-d">${d.date}</span></div>`; });
  chips+=`</div>`;
  const d=plan.days[editorDay];
  const conf=dayConflicts(editorDay), load=dayLoad(editorDay);
  let strip='';
  const loaded=Object.keys(load).sort((a,b)=>ALL_ROLES.indexOf((person(a)||{}).role)-ALL_ROLES.indexOf((person(b)||{}).role));
  if(loaded.length){
    strip=`<div class="load-strip"><span class="ls-label">Нагрузка дня:</span>`+loaded.map(pid=>{ const p=person(pid); if(!p)return''; const o=load[pid];
      const over=plan.activities.some(a=>a.day===editorDay&&(a.resp===pid||a.exec===pid)&&conf[a.id]);
      const h=o.min/60, hs=h>=1?(Math.round(h*10)/10+' ч'):(o.min+' мин');
      return `<span class="load-chip${over?' over':''}">${avatar(pid)} ${esc(p.name.split('·')[0].trim())} <span class="ld">${o.n} · ${hs}${over?' ⚠️':''}</span></span>`; }).join('')+`</div>`;
  }
  let rows=[];
  (plan.anchors[d.type]||[]).forEach(a=>rows.push({anchor:true,start:a[0],end:a[1],title:a[2]}));
  plan.activities.filter(a=>a.day===editorDay).forEach(a=>rows.push({anchor:false,...a}));
  rows.sort((a,b)=>(a.start||'').localeCompare(b.start||''));
  let body='', lastBucket='';
  if(!rows.length) body=`<tr><td colspan="5" style="text-align:center;color:var(--text3);padding:30px">Пусто — добавьте активности в «Моём расписании»</td></tr>`;
  rows.forEach(r=>{
    const bk=bucketOf(toMin(r.start)||0);
    if(bk!==lastBucket){ body+=`<tr class="sched-section"><td colspan="5">▸ ${bk}</td></tr>`; lastBucket=bk; }
    if(r.anchor){
      body+=`<tr class="row-anchor"><td class="t">${r.start}${r.end?'–'+r.end:''}</td><td><i class="bi bi-lock-fill"></i> ${esc(r.title)} <span class="sched-meta">· шаблон</span></td><td class="muted-cell">—</td><td class="muted-cell">—</td><td class="muted-cell">—</td></tr>`;
    } else {
      const meta=[]; if(r.place)meta.push(esc(r.place)); if(r.group&&r.group!=='Все')meta.push(esc(r.group));
      const st={planned:'Запланировано',progress:'В работе',done:'Выполнено'};
      const statusSel=`<select class="st-sel st-${r.status}" onchange="setStatus('${r.id}',this.value)">${Object.keys(st).map(k=>`<option value="${k}" ${r.status===k?'selected':''}>${st[k]}</option>`).join('')}</select>`;
      let flags='';
      if(!r.resp&&!r.exec) flags+=`<i class="bi bi-exclamation-circle-fill flag err" title="Не назначен ни ответственный, ни исполнитель"></i>`;
      if(conf[r.id]) flags+=`<i class="bi bi-exclamation-triangle-fill flag warn" title="${esc(conf[r.id].join('; '))}"></i>`;
      const accRole=(r.exec&&person(r.exec))?person(r.exec).role:r.role;
      const acc=ROLE_COLOR[accRole]||'var(--border2)';
      const typeDot=`<span class="type-dot" style="background:${r.type==='mandatory'?'var(--blue)':'var(--green)'}" title="${r.type==='mandatory'?'обязательная':'доп.'}"></span>`;
      body+=`<tr><td class="t" style="border-left:3px solid ${acc}">${r.start}${r.end?'–'+r.end:''}</td>
        <td>${flags}${typeDot}<i class="bi ${ROLES[r.role].icon} role-ic"></i><a class="sched-name" onclick="gotoEdit('${r.role}',${editorDay})">${esc(r.title)}</a>${meta.length?` <span class="sched-meta">· ${meta.join(' · ')}</span>`:''}</td>
        <td data-label="Ответственный">${personSelect(r.id,'resp',r.resp)}</td>
        <td data-label="Исполнитель">${personSelect(r.id,'exec',r.exec||'')}</td>
        <td data-label="Статус">${statusSel}</td></tr>`;
    }
  });
  const table=`<div class="sched-wrap"><table class="sched-table"><thead><tr><th>Время</th><th>Активность</th><th>Ответственный</th><th>Исполнитель</th><th>Статус</th></tr></thead><tbody>${body}</tbody></table></div>`;
  return `<div class="c-head"><div><div class="c-title">Расписание · День ${d.n} · ${d.date}</div><div class="c-sub">${esc(d.title)}. <i class="bi bi-exclamation-circle-fill" style="color:var(--red)"></i> никто не назначен · <i class="bi bi-exclamation-triangle-fill" style="color:var(--orange)"></i> пересечение по времени · цвет слева = роль исполнителя. Клик по названию — полное редактирование.</div></div><button class="btn-secondary" onclick="printShift()" style="white-space:nowrap"><i class="bi bi-printer"></i> Печать / PDF</button></div>${chips}${strip}${table}`;
}

function fmtH(min){ const h=min/60; return h>=1?(Math.round(h*10)/10+' ч'):(min+' мин'); }
function renderLoad(){
  const people=plan.team.filter(p=>plan.activities.some(a=>a.resp===p.id||a.exec===p.id));
  const confByDay=plan.days.map((_,i)=>dayConflicts(i));
  const cols=`190px repeat(${plan.days.length}, minmax(86px,1fr)) 110px`;
  let g=`<div class="grid-wrap"><div class="ov-grid" style="grid-template-columns:${cols}">`;
  g+=`<div class="ov-cell corner"></div>`;
  plan.days.forEach(d=>g+=`<div class="ov-cell day-head"><div class="ov-day-n">День ${d.n}</div><div class="ov-day-date">${d.date}</div></div>`);
  g+=`<div class="ov-cell day-head"><div class="ov-day-n">Итого</div></div>`;
  if(!people.length){
    g+=`<div class="ov-cell" style="grid-column:1/-1;text-align:center;color:var(--text3);padding:24px">Никто пока не назначен — назначьте людей в «Расписании»</div>`;
  }
  people.forEach(p=>{
    g+=`<div class="ov-cell lane-head"><i class="bi ${ROLES[p.role].icon}"></i> ${esc(p.name)}</div>`;
    let totN=0, totMin=0;
    plan.days.forEach((d,di)=>{
      const acts=plan.activities.filter(a=>a.day===di&&(a.resp===p.id||a.exec===p.id));
      const mins=acts.reduce((s,a)=>{const [x,y]=actInterval(a);return s+(y-x);},0);
      totN+=acts.length; totMin+=mins;
      const hasConf=acts.some(a=>confByDay[di][a.id]);
      const lvl=Math.min(acts.length,4);
      const bg=acts.length?`background:rgba(249,115,22,${(0.06+lvl*0.07).toFixed(2)})`:'';
      const cur=di===editorDay?';outline:2px solid var(--orange-border);outline-offset:-2px':'';
      g+=`<div class="ov-cell load-cell" style="${bg}${cur};cursor:pointer" onclick="openSchedDay(${di})">${acts.length?`<b>${acts.length}</b>${hasConf?' <span style="color:var(--red)">⚠️</span>':''}<span class="lc-h">${fmtH(mins)}</span>`:'<span class="lc-empty">·</span>'}</div>`;
    });
    g+=`<div class="ov-cell load-total"><b>${totN}</b><div class="lc-h" style="color:var(--text3);font-size:11px">${fmtH(totMin)}</div></div>`;
  });
  g+=`</div></div>`;
  return `<div class="c-head"><div><div class="c-title">Загрузка по людям</div><div class="c-sub">Сколько активностей и часов у каждого по дням (ответственный + исполнитель). Темнее = больше нагрузка, ⚠️ = пересечение в этот день. Клик по ячейке — расписание дня.</div></div></div>${g}`;
}
function openSchedDay(i){ editorDay=i; view='schedule'; render(); }

/* ── печать / PDF всей смены ── */
function printShift(){
  const s=plan.shift;
  let html=`<h1>${esc(s.name)}</h1><div class="p-sub">${esc(s.place)} · ${esc(s.kids)} · ${plan.days.length} дней</div>`;
  plan.days.forEach((d,di)=>{
    html+=`<h2>День ${d.n} · ${esc(d.date)} — ${esc(d.title)}</h2>`;
    let rows=[];
    (plan.anchors[d.type]||[]).forEach(a=>rows.push({anchor:true,start:a[0],end:a[1],title:a[2]}));
    plan.activities.filter(a=>a.day===di).forEach(a=>rows.push({anchor:false,...a}));
    rows.sort((a,b)=>(a.start||'').localeCompare(b.start||''));
    html+=`<table><thead><tr><th style="width:70px">Время</th><th>Активность</th><th style="width:130px">Ответственный</th><th style="width:130px">Исполнитель</th></tr></thead><tbody>`;
    rows.forEach(r=>{
      if(r.anchor){ html+=`<tr class="p-anchor"><td>${r.start}${r.end?'–'+r.end:''}</td><td>${esc(r.title)} (шаблон)</td><td>—</td><td>—</td></tr>`; }
      else{ const rn=r.resp&&person(r.resp)?esc(person(r.resp).name):'—'; const en=r.exec&&person(r.exec)?esc(person(r.exec).name):'—';
        const pl=[r.place,(r.group&&r.group!=='Все')?r.group:''].filter(Boolean).join(', ');
        html+=`<tr><td>${r.start}${r.end?'–'+r.end:''}</td><td><b>${esc(r.title)}</b>${pl?' · '+esc(pl):''}</td><td>${rn}</td><td>${en}</td></tr>`; }
    });
    html+=`</tbody></table>`;
  });
  document.getElementById('printArea').innerHTML=html;
  window.print();
}

/* ============== СЕТКА ДНЯ (люди × время, блоки) ============== */
function renderGridDay(){
  if(editorDay>=plan.days.length)editorDay=plan.days.length-1; if(editorDay<0)editorDay=0;
  let chips=`<div class="day-chips">`;
  plan.days.forEach((d,i)=>{ chips+=`<div class="chip${i===editorDay?' active':''}" onclick="selDay(${i})"><span class="chip-n">День ${d.n}</span><span class="chip-d">${d.date}</span></div>`; });
  chips+=`</div>`;
  const d=plan.days[editorDay], dayActs=plan.activities.filter(a=>a.day===editorDay), conf=dayConflicts(editorDay);
  const people=plan.team.filter(p=>dayActs.some(a=>a.resp===p.id||a.exec===p.id));
  const head=`<div class="c-head"><div><div class="c-title">Сетка дня · День ${d.n} · ${d.date}</div><div class="c-sub">Кто чем занят по времени. Колонка — человек, блок — активность (показан и у ответственного, и у исполнителя). Пересечения — рядом/красным. Клик по блоку — редактирование.</div></div></div>`;
  if(!people.length) return head+chips+`<div style="text-align:center;color:var(--text3);padding:40px"><i class="bi bi-people" style="font-size:28px"></i><div style="margin-top:8px">На этот день никто не назначен</div></div>`;
  const anchors=plan.anchors[d.type]||[];
  let mins=[]; dayActs.forEach(a=>{const[s,e]=actInterval(a);mins.push(s,e);}); anchors.forEach(a=>{mins.push(toMin(a[0])); if(a[1])mins.push(toMin(a[1]));});
  let lo=mins.length?Math.min(...mins):480, hi=mins.length?Math.max(...mins):1320;
  lo=Math.floor(lo/60)*60; hi=Math.ceil(hi/60)*60; if(hi<=lo)hi=lo+60;
  const ppm=0.9, H=(hi-lo)*ppm;
  let hours=''; for(let m=lo;m<=hi;m+=60) hours+=`<div class="rg-hour" style="top:${(m-lo)*ppm}px">${toHHMM(m)}</div>`;
  let amarks=''; anchors.forEach(a=>{ const s=toMin(a[0]); amarks+=`<div class="rg-amark" style="top:${(s-lo)*ppm}px" title="${esc(a[2])}">${esc(a[2].split(',')[0])}</div>`; });
  let cols=`<div class="rg-col rg-timecol"><div class="rg-head"></div><div class="rg-track" style="height:${H}px">${hours}${amarks}</div></div>`;
  people.forEach(p=>{
    const acts=dayActs.filter(a=>a.resp===p.id||a.exec===p.id).slice().sort((a,b)=>toMin(a.start)-toMin(b.start));
    const lanes=[], lane={};
    acts.forEach(a=>{ const[s,e]=actInterval(a); let li=lanes.findIndex(end=>end<=s); if(li<0)li=lanes.length; lanes[li]=e; lane[a.id]=li; });
    const nL=Math.max(lanes.length,1);
    let blocks=''; acts.forEach(a=>{ const[s,e]=actInterval(a); const top=(s-lo)*ppm, h=Math.max((e-s)*ppm,20), w=100/nL, left=lane[a.id]*w, isExec=a.exec===p.id;
      const cls=conf[a.id]?'rg-conf':('t-'+a.type);
      blocks+=`<div class="rg-block ${cls}" style="top:${top}px;height:${h}px;left:calc(${left}% + 2px);width:calc(${w}% - 4px)" title="${esc(a.title)} · ${a.start}–${a.end||''} · ${isExec?'исполнитель':'ответственный'}${conf[a.id]?' · ⚠ '+esc(conf[a.id].join('; ')):''}" onclick="gotoEdit('${a.role}',${editorDay})"><b>${a.start}</b> ${esc(a.title)}</div>`;
    });
    cols+=`<div class="rg-col rg-pcol"><div class="rg-head">${avatar(p.id)} ${esc(p.name.split('·')[0].trim())}</div><div class="rg-track" style="height:${H}px">${blocks}</div></div>`;
  });
  return head+chips+`<div class="rg-scroll"><div class="rg-grid">${cols}</div></div>`;
}

/* ============== РАССЕЛЕНИЕ (комнаты × койки) ============== */
function kid(id){ return (plan.roster||[]).find(k=>k.id===id); }
function assignedKidSet(){ const s=new Set(); (plan.rooms||[]).forEach(r=>r.beds.forEach(b=>{if(b)s.add(b);})); return s; }
function roomGender(r){ const gs=new Set(r.beds.filter(Boolean).map(b=>{const k=kid(b);return k?k.gender:null;}).filter(g=>g===0||g===1)); return gs.size>1?'mix':(gs.size===1?[...gs][0]:''); }
function kidCard(k){ const g=k.gender===1?'m':k.gender===0?'f':''; const wish=(k.wish&&k.wish.length)?'<i class="bi bi-heart-fill kid-wish" title="Есть пожелания по соседям"></i>':''; return `<div class="kid ${g}" draggable="true" ondragstart="kidDragStart(event,'${k.id}')" ondragend="kidDragEnd(event)"><span class="kid-g" onclick="event.stopPropagation();toggleKidGender('${k.id}')" title="Пол — клик чтобы исправить">${k.gender===1?'М':k.gender===0?'Ж':'?'}</span><span class="kid-name" onclick="event.stopPropagation();openKidModal('${k.id}')" title="Карточка: пол и пожелания">${esc(k.name)}</span>${wish}<span class="kid-age">${k.age||'?'}</span></div>`; }
function renderRooms(){
  plan.rooms=plan.rooms||defaultRooms(); plan.roster=plan.roster||[];
  const asg=assignedKidSet();
  const unassigned=plan.roster.filter(k=>!asg.has(k.id));
  const total=plan.roster.length, placed=total-unassigned.length;
  const conflicts=plan.rooms.filter(r=>roomGender(r)==='mix').length;
  const pool=`<div class="rooms-pool" ondragover="poolOver(event)" ondragleave="poolLeave(event)" ondrop="poolDrop(event)">
    <div class="pool-head">Не расселены · ${unassigned.length}</div>
    <div class="pool-list">${unassigned.length?unassigned.map(k=>kidCard(k)).join(''):'<div class="pool-empty">Все расселены</div>'}</div>
    <div class="pool-actions"><button class="btn-primary" style="width:100%" onclick="loadRoster()"><i class="bi bi-cloud-download"></i> Загрузить из AlfaCRM</button><button class="btn-secondary" style="width:100%;margin-top:6px" onclick="addKid()"><i class="bi bi-person-plus"></i> Добавить вручную</button></div>
  </div>`;
  let cards='';
  plan.rooms.forEach(r=>{
    const occ=r.beds.filter(Boolean).length, rg=roomGender(r);
    const gtag=rg==='mix'?'<span class="rtag mix">⚠ смешан</span>':rg===1?'<span class="rtag m">М</span>':rg===0?'<span class="rtag f">Ж</span>':'';
    const rages=r.beds.filter(Boolean).map(b=>kid(b)).filter(k=>k&&k.age).map(k=>k.age);
    const spread=rages.length>1?(Math.max(...rages)-Math.min(...rages)):0;
    const agetag=rages.length?`<span class="rtag age${spread>AGE_SPREAD?' bad':''}" title="Возраст в комнате">${rages.length>1?Math.min(...rages)+'–'+Math.max(...rages):rages[0]}</span>`:'';
    let beds='';
    r.beds.forEach((b,i)=>{ const k=b?kid(b):null; beds+=`<div class="bed${k?' filled':''}" ondragover="bedOver(event)" ondragleave="bedLeave(event)" ondrop="bedDrop(event,'${r.id}',${i})">${k?kidCard(k):`<span class="bed-empty">койка ${i+1}</span>`}</div>`; });
    cards+=`<div class="room-card">
      <div class="room-head"><input class="room-name" value="${esc(r.name)}" onchange="setRoomField('${r.id}','name',this.value)"><span class="room-occ${occ>r.cap?' over':''}">${occ}/${r.cap}</span>${gtag}${agetag}<button class="link-btn" onclick="delRoom('${r.id}')" title="Удалить комнату"><i class="bi bi-trash3"></i></button></div>
      <div class="room-cns"><i class="bi bi-person-arms-up" style="color:var(--text3)"></i><select class="p-sel" style="flex:1;max-width:none" onchange="setRoomField('${r.id}','counselor',this.value)">${counselorOpts(r.counselor)}</select></div>
      <div class="beds">${beds}</div>
      <div class="room-foot"><button class="link-btn" onclick="setRoomCap('${r.id}',1)"><i class="bi bi-plus-lg"></i> койка</button>${r.cap>1?`<button class="link-btn" onclick="setRoomCap('${r.id}',-1)"><i class="bi bi-dash-lg"></i> койка</button>`:''}</div>
    </div>`;
  });
  const grid=`<div class="rooms-layout"><div class="rooms-grid">${cards}<button class="add-room" onclick="addRoom()"><i class="bi bi-plus-lg"></i> Добавить комнату</button></div>${pool}</div>`;
  const issues=buildIssues();
  const errs=issues.filter(i=>i.t==='err').length, warns=issues.filter(i=>i.t==='warn').length;
  const vIcon=t=>t==='err'?'<i class="bi bi-x-circle-fill" style="color:var(--red)"></i>':t==='warn'?'<i class="bi bi-exclamation-triangle-fill" style="color:var(--orange)"></i>':'<i class="bi bi-info-circle" style="color:var(--text3)"></i>';
  const panel=issues.length
    ? `<div class="valid-panel"><div class="vp-head"><i class="bi bi-clipboard-check"></i> Проверка${errs?` · <span style="color:var(--red)">${errs} ошиб.</span>`:''}${warns?` · <span style="color:var(--orange)">${warns} предупр.</span>`:''}</div><div class="vp-list">${issues.map(i=>`<div class="vp-item">${vIcon(i.t)} ${esc(i.m)}</div>`).join('')}</div></div>`
    : `<div class="valid-panel ok"><i class="bi bi-check-circle-fill" style="color:var(--green)"></i> Всё согласовано: пол, возраст, вожатые и пожелания.</div>`;
  const acts=`<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn-secondary" style="white-space:nowrap" onclick="autoAssign()"><i class="bi bi-magic"></i> Авто-расстановка</button><button class="btn-secondary" style="white-space:nowrap" onclick="printRooming()"><i class="bi bi-printer"></i> Печать</button></div>`;
  return `<div class="c-head"><div><div class="c-title">Расселение · ${esc(plan.shift.name)}</div><div class="c-sub">Перетащите детей в койки. Цвет/буква — пол (М синий / Ж розовый), клик по имени — карточка (пол + пожелания по соседям). ⚠ — смешанная комната. Расселено ${placed}/${total}${conflicts?` · смешанных: ${conflicts}`:''}.</div></div>${acts}</div>${panel}${grid}`;
}
function kidDragStart(e,id){ dragKid=id; try{e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',id);}catch(_){} }
function kidDragEnd(e){ document.querySelectorAll('.bed.over,.rooms-pool.over').forEach(x=>x.classList.remove('over')); }
function bedOver(e){ e.preventDefault(); e.currentTarget.classList.add('over'); }
function bedLeave(e){ e.currentTarget.classList.remove('over'); }
function bedDrop(e,rid,bi){ e.preventDefault(); e.currentTarget.classList.remove('over'); if(!dragKid)return; placeKid(rid,bi,dragKid); dragKid=null; }
function poolOver(e){ e.preventDefault(); e.currentTarget.classList.add('over'); }
function poolLeave(e){ e.currentTarget.classList.remove('over'); }
function poolDrop(e){ e.preventDefault(); e.currentTarget.classList.remove('over'); if(!dragKid)return; unassignKid(dragKid); dragKid=null; }
function clearKid(id){ plan.rooms.forEach(r=>{ r.beds=r.beds.map(b=>b===id?null:b); }); }
function placeKid(rid,bi,id){ clearKid(id); const r=plan.rooms.find(x=>x.id===rid); if(!r)return; r.beds[bi]=id; commit('Расселил(а): '+((kid(id)||{}).name||'?')+' → '+r.name); render(); }
function unassignKid(id){ const nm=(kid(id)||{}).name||'?'; clearKid(id); commit('Выселил(а): '+nm); render(); }
function toggleKidGender(id){ const k=kid(id); if(k){ k.gender = k.gender===1?0:(k.gender===0?1:1); commit(); render(); } }
function setRoomField(id,f,v){ const r=plan.rooms.find(x=>x.id===id); if(r){r[f]=v; commit(); render();} }
function setRoomCap(id,d){ const r=plan.rooms.find(x=>x.id===id); if(!r)return; if(d<0){ if(r.beds.length<=1)return; if(r.beds[r.beds.length-1]){alert('Сначала освободите последнюю койку');return;} r.beds.pop(); } else r.beds.push(null); r.cap=r.beds.length; commit(); render(); }
function addRoom(){ plan.rooms.push({id:nid('r'),name:'Новая комната',cap:4,beds:[null,null,null,null]}); commit(); render(); }
function delRoom(id){ const r=plan.rooms.find(x=>x.id===id); if(r&&r.beds.some(Boolean)&&!confirm('В комнате есть дети — удалить? Они станут не расселены.'))return; plan.rooms=plan.rooms.filter(x=>x.id!==id); commit(); render(); }
function addKid(){ const n=prompt('Имя ребёнка:'); if(!n||!n.trim())return; plan.roster.push({id:nid('k'),name:n.trim(),gender:null,age:null,alfaId:null}); commit(); render(); }
async function loadRoster(){
  const idx=store.shifts.findIndex(s=>s.id===store.activeId)+1;
  try{
    const r=await fetch('/api/shift-roster?shift='+idx,{cache:'no-store'}); const j=await r.json();
    if(!j.ok||!Array.isArray(j.kids)){ alert('AlfaCRM: '+(j.error||'нет данных')); return; }
    plan.roster=plan.roster||[];
    // Аддитивно: добавляем только новых по alfaId, не трогая внесённых вручную и правок (пол/пожелания)
    const have=new Set(plan.roster.filter(k=>k.alfaId!=null).map(k=>k.alfaId));
    let added=0;
    j.kids.forEach(c=>{ if(have.has(c.alfaId))return; plan.roster.push({id:'k'+c.alfaId,name:c.name,gender:c.gender,age:c.age,alfaId:c.alfaId}); added++; });
    render();
    await commitNow('Загрузил(а) детей из AlfaCRM: +'+added+' (всего '+plan.roster.length+')'); // немедленное сохранение, без гонки с обновлением
    alert(added?('Добавлено детей: '+added+' (всего в смене: '+plan.roster.length+')'):('Новых нет — все '+plan.roster.length+' уже в списке'));
  }catch(e){ alert('Не удалось загрузить из AlfaCRM (доступно на рабочей странице /staff/plan): '+e); }
}
function roomOf(kidId){ for(const r of plan.rooms){ if(r.beds.includes(kidId)) return r; } return null; }
function buildIssues(){
  const out=[], seen=new Set();
  plan.rooms.forEach(r=>{
    const occ=r.beds.filter(Boolean).length;
    if(occ>r.cap) out.push({t:'err',m:`${r.name}: перевес (${occ}/${r.cap})`});
    if(roomGender(r)==='mix') out.push({t:'err',m:`${r.name}: смешанная по полу`});
    const ages=r.beds.filter(Boolean).map(b=>kid(b)).filter(k=>k&&k.age).map(k=>k.age);
    if(ages.length>1 && (Math.max(...ages)-Math.min(...ages))>AGE_SPREAD) out.push({t:'warn',m:`${r.name}: возраст ${Math.min(...ages)}–${Math.max(...ages)} (большой разброс)`});
    if(!r.counselor) out.push({t:'warn',m:`${r.name}: не назначен вожатый`});
  });
  plan.roster.forEach(k=>{ (k.wish||[]).forEach(wid=>{ const w=kid(wid); if(!w)return; const key=[k.id,wid].sort().join('|'); if(seen.has(key))return; seen.add(key);
    const rk=roomOf(k.id), rw=roomOf(wid);
    if(rk&&rw&&rk.id!==rw.id) out.push({t:'warn',m:`Пожелание: ${k.name.split(' ')[0]} ↔ ${w.name.split(' ')[0]} — в разных комнатах`});
  }); });
  const un=plan.roster.filter(k=>!assignedKidSet().has(k.id)).length;
  if(un) out.push({t:'info',m:`Не расселены: ${un}`});
  return out;
}
function counselorOpts(sel){ return '<option value="">— вожатый —</option>'+plan.team.filter(p=>p.role==='counselor').map(p=>`<option value="${p.id}" ${sel===p.id?'selected':''}>${esc(p.name)}</option>`).join(''); }
function autoAssign(){
  if(!confirm('Авто-расстановка заполнит свободные койки с учётом пола, близкого возраста и пожеланий. Уже расселённых не трогаем. Продолжить?'))return;
  let pool=plan.roster.filter(k=>!assignedKidSet().has(k.id)).slice().sort((a,b)=>(a.gender||0)-(b.gender||0)||(a.age||0)-(b.age||0));
  const freeBeds=r=>r.beds.map((b,i)=>b?-1:i).filter(i=>i>=0);
  for(const k of pool){
    if(assignedKidSet().has(k.id))continue;
    let best=null,bestScore=-1;
    for(const r of plan.rooms){
      const fb=freeBeds(r); if(!fb.length)continue;
      const occ=r.beds.filter(Boolean).map(b=>kid(b)).filter(Boolean);
      const rg=roomGender(r);
      if(rg!==''&&rg!=='mix'&&k.gender!=null&&rg!==k.gender)continue;
      const ages=occ.map(x=>x.age).filter(Boolean);
      if(ages.length&&k.age&&(Math.max(...ages,k.age)-Math.min(...ages,k.age))>AGE_SPREAD)continue;
      let score=10;
      if(occ.some(x=>(k.wish||[]).includes(x.id)||(x.wish||[]).includes(k.id)))score+=100;
      if(rg===k.gender)score+=5;
      if(occ.length)score+=2;
      if(score>bestScore){bestScore=score;best=r;}
    }
    if(best){ const fb=freeBeds(best); best.beds[fb[0]]=k.id; }
  }
  commit('Авто-расстановка расселения'); render();
}
function printRooming(){
  let html=`<h1>Расселение · ${esc(plan.shift.name)}</h1><div class="p-sub">${esc(plan.shift.place)} · детей: ${plan.roster.length}</div>`;
  plan.rooms.forEach(r=>{
    const cns=r.counselor&&person(r.counselor)?esc(person(r.counselor).name):'—';
    html+=`<h2>${esc(r.name)} — вожатый: ${cns}</h2><table><thead><tr><th style="width:36px">#</th><th>Ребёнок</th><th style="width:46px">Пол</th><th style="width:64px">Возраст</th></tr></thead><tbody>`;
    r.beds.forEach((b,i)=>{ const k=b?kid(b):null; html+=`<tr><td>${i+1}</td><td>${k?esc(k.name):'—'}</td><td>${k?(k.gender===1?'М':k.gender===0?'Ж':'?'):''}</td><td>${k&&k.age?k.age:''}</td></tr>`; });
    html+=`</tbody></table>`;
  });
  const un=plan.roster.filter(k=>!assignedKidSet().has(k.id));
  if(un.length) html+=`<h2>Не расселены (${un.length})</h2><table><tbody>`+un.map(k=>`<tr><td>${esc(k.name)}</td><td style="width:46px">${k.gender===1?'М':k.gender===0?'Ж':''}</td><td style="width:64px">${k.age||''}</td></tr>`).join('')+`</tbody></table>`;
  document.getElementById('printArea').innerHTML=html; window.print();
}
let kidModalId=null;
function openKidModal(id){ kidModalId=id; const k=kid(id); if(!k)return;
  document.getElementById('km-title').textContent=k.name;
  document.getElementById('km-gender').innerHTML=`<button class="km-g${k.gender===1?' on':''}" onclick="kmSetGender(1)">М</button><button class="km-g f${k.gender===0?' on':''}" onclick="kmSetGender(0)">Ж</button>`;
  const others=plan.roster.filter(x=>x.id!==id);
  document.getElementById('km-wish').innerHTML=others.length?others.map(x=>`<label class="km-wish-item"><input type="checkbox" ${(k.wish||[]).includes(x.id)?'checked':''} onchange="kmToggleWish('${x.id}',this.checked)"> ${esc(x.name)}</label>`).join(''):'<div style="color:var(--text3);font-size:13px">Других детей пока нет</div>';
  document.getElementById('kidOverlay').classList.add('open');
}
function closeKidModal(){ document.getElementById('kidOverlay').classList.remove('open'); kidModalId=null; }
function kmSetGender(g){ const k=kid(kidModalId); if(k){k.gender=g; commit(); render(); openKidModal(kidModalId);} }
function kmToggleWish(wid,on){ const k=kid(kidModalId); if(!k)return; k.wish=k.wish||[]; if(on){if(!k.wish.includes(wid))k.wish.push(wid);} else k.wish=k.wish.filter(x=>x!==wid); commit(); render(); }

/* ============== OVERVIEW ============== */
function renderOverview(){
  const total=plan.activities.length;
  const assigned=plan.activities.filter(a=>a.resp).length;
  const allChk=plan.activities.reduce((s,a)=>s+a.checklist.length,0);
  const doneChk=plan.activities.reduce((s,a)=>s+a.checklist.filter(c=>c.done).length,0);
  const pa=total?Math.round(assigned/total*100):0, pc=allChk?Math.round(doneChk/allChk*100):0;
  let summary=`<div class="summary">
    <div class="sum-card"><div class="sum-label">Активностей в смене</div><div class="sum-val">${total}</div></div>
    <div class="sum-card"><div class="sum-label">Назначен ответственный</div><div class="sum-val">${assigned}<small>/${total}</small></div><div class="bar"><span style="width:${pa}%"></span></div></div>
    <div class="sum-card"><div class="sum-label">Готовность чек-листов</div><div class="sum-val">${pc}%</div><div class="bar green"><span style="width:${pc}%"></span></div></div>
    <div class="sum-card"><div class="sum-label">Команда смены</div><div class="sum-val">${plan.team.length}<small> чел.</small></div></div>
  </div>`;
  const cols=`160px repeat(${plan.days.length}, 210px)`;
  let g=`<div class="grid-wrap"><div class="ov-grid" style="grid-template-columns:${cols}">`;
  g+=`<div class="ov-cell corner"></div>`;
  plan.days.forEach((d,i)=>{ g+=`<div class="ov-cell day-head"><div class="ov-day-n">День ${d.n} <span class="chip-dot dot ${dayStatus(i)}"></span></div><div class="ov-day-date">${d.date}</div><div class="ov-day-type"><i class="bi bi-bookmark-fill" style="font-size:9px"></i> ${esc(d.title)}</div></div>`; });
  g+=`<div class="ov-cell lane-head mand-lane"><i class="bi bi-lock-fill" style="color:var(--text3)"></i> Обязательное</div>`;
  plan.days.forEach(d=>{ let cell=`<div class="ov-cell mand-lane">`; (plan.anchors[d.type]||[]).forEach(a=>{cell+=`<div class="mini locked"><div class="mini-time">${a[0]}${a[1]?'–'+a[1]:''}</div><div class="mini-title">${esc(a[2])}</div></div>`;}); g+=cell+`</div>`; });
  EDITOR_ROLES.forEach(r=>{
    const ed=r===currentRole;
    g+=`<div class="ov-cell lane-head"><i class="bi ${ROLES[r].icon}"></i> ${ROLES[r].label}${ed?' <span style="font-size:9px;color:var(--orange);font-weight:700;margin-left:auto">ВЫ</span>':''}</div>`;
    plan.days.forEach((d,i)=>{
      const acts=actsFor(i,r);
      let cell=`<div class="ov-cell${ed?' editable':''}"${ed?` onclick="openDay(${i})"`:''}>`;
      if(!acts.length){ cell+= ed?`<div class="ov-empty">+ добавить</div>`:`<div class="ov-empty">—</div>`; }
      else acts.forEach(a=>{ const cp=chkProgress(a);
        cell+=`<div class="mini t-${a.type}"><div class="mini-time">${a.start}${a.end?'–'+a.end:''}</div><div class="mini-title">${esc(a.title)}</div><div class="mini-foot">${a.group&&a.group!=='Все'?`<span class="grp-tag">${esc(a.group)}</span>`:''}${a.resp?avatar(a.resp):'<span class="chk-badge" style="color:var(--red)"><i class="bi bi-exclamation-circle"></i></span>'}${cp.t?`<span class="chk-badge${cp.d===cp.t?' done':''}"><i class="bi bi-check2-square"></i> ${cp.d}/${cp.t}</span>`:''}</div></div>`; });
      g+=cell+`</div>`;
    });
  });
  g+=`</div></div>`;
  return `<div class="c-head"><div><div class="c-title">Вся смена · ${plan.days.length} дней</div><div class="c-sub">Обзор всех дорожек. Ваша роль (<b style="color:var(--orange)">${ROLES[currentRole].label}</b>) подсвечена — кликните по ячейке, чтобы заполнить. Замок = обязательное расписание из шаблона.</div></div></div>${summary}${g}`;
}
function openDay(i){ editorDay=i; view='editor'; render(); }

/* ============== EDITOR ============== */
function renderEditor(){
  if(editorDay>=plan.days.length) editorDay=plan.days.length-1; if(editorDay<0) editorDay=0;
  let chips=`<div class="day-chips">`;
  plan.days.forEach((d,i)=>{ chips+=`<div class="chip${i===editorDay?' active':''}" onclick="selDay(${i})"><span class="chip-n">День ${d.n}</span><span class="chip-d">${d.date}</span></div>`; });
  chips+=`</div>`;
  const d=plan.days[editorDay];
  const bar=`<div class="ed-bar">
    <span class="ed-lane">Дорожка: <b><i class="bi ${ROLES[currentRole].icon}"></i> ${ROLES[currentRole].label}</b></span>
    <span class="seg"><button class="${filter==='all'?'active':''}" onclick="setFilter('all')">Всё</button><button class="${filter==='mandatory'?'active':''}" onclick="setFilter('mandatory')">Обязательное</button><button class="${filter==='extra'?'active':''}" onclick="setFilter('extra')">Доп.</button></span>
    ${currentRole==='teacher'?`<select class="fld" style="width:auto" onchange="setGroupFilter(this.value)"><option value="all"${groupFilter==='all'?' selected':''}>Все группы</option>${plan.groupsInfo.map(gi=>`<option value="${gi.id}"${groupFilter===gi.id?' selected':''}>${gi.id} (${gi.age})</option>`).join('')}</select>`:''}
    <button class="btn-add" onclick="openModal()"><i class="bi bi-plus-lg"></i> Добавить активность</button>
  </div>`;
  let items=[];
  if(filter!=='extra') (plan.anchors[d.type]||[]).forEach(a=>items.push({anchor:true,start:a[0],end:a[1],title:a[2]}));
  actsFor(editorDay,currentRole).forEach(a=>{ if((filter==='all'||filter===a.type) && (groupFilter==='all'||groupMatch(a.group,groupFilter))) items.push({anchor:false,...a}); });
  items.sort((a,b)=>(a.start||'').localeCompare(b.start||''));
  const anchorHtml=it=>`<div class="tl-item anchor"><div class="tl-time">${it.start}<small>${it.end||''}</small></div><div class="tl-line"></div><div class="tl-card anchor"><div class="card-top" style="cursor:default"><span class="card-tag tag-locked"><i class="bi bi-lock-fill"></i> шаблон</span><span class="card-name">${esc(it.title)}</span></div></div></div>`;
  let tl=`<div class="timeline">`;
  if(!items.length) tl+=`<div style="text-align:center;color:var(--text3);padding:40px 0"><i class="bi bi-calendar-x" style="font-size:28px"></i><div style="margin-top:8px">Пусто — добавьте первую активность</div></div>`;
  else {
    const eos=it=>toMin(it.end||it.start);
    for(let i=0;i<=items.length;i++){
      const lo=i>0?eos(items[i-1]):'', hi=i<items.length?toMin(items[i].start):'';
      tl+=`<div class="drop-zone" data-lo="${lo===null?'':lo}" data-hi="${hi===null?'':hi}" ondragover="dzOver(event)" ondragleave="dzLeave(event)" ondrop="dzDrop(event)"></div>`;
      if(i<items.length) tl+= items[i].anchor ? anchorHtml(items[i]) : renderActCard(items[i]);
    }
  }
  tl+=`</div>`;
  return `<div class="c-head"><div><div class="c-title">День ${d.n} · ${d.date}</div><div class="c-sub">${esc(d.title)} · обязательное расписание подтянуто из шаблона (замок). Параллельные уроки по группам идут одним временем — это нормально.</div></div></div>${chips}${bar}${tl}`;
}
function selDay(i){ editorDay=i; render(); }
function setFilter(f){ filter=f; render(); }
function setGroupFilter(g){ groupFilter=g; render(); }

/* ── drag-and-drop по времени ── */
function dragStart(e,id){ _dragId=id; try{e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',id);}catch(_){} const c=e.target.closest('.tl-card'); if(c)c.classList.add('dragging'); }
function dragEnd(e){ document.querySelectorAll('.tl-card.dragging').forEach(c=>c.classList.remove('dragging')); document.querySelectorAll('.drop-zone.over').forEach(z=>z.classList.remove('over')); }
function dzOver(e){ e.preventDefault(); try{e.dataTransfer.dropEffect='move';}catch(_){} e.currentTarget.classList.add('over'); }
function dzLeave(e){ e.currentTarget.classList.remove('over'); }
function dzDrop(e){ e.preventDefault(); e.currentTarget.classList.remove('over'); if(!_dragId)return;
  const lo=e.currentTarget.dataset.lo, hi=e.currentTarget.dataset.hi;
  moveActTime(_dragId, lo===''?null:+lo, hi===''?null:+hi); _dragId=null; }
function moveActTime(id,lo,hi){
  const a=plan.activities.find(x=>x.id===id); if(!a)return;
  const oldS=toMin(a.start), oldE=a.end?toMin(a.end):null; const dur=(oldE!=null&&oldE>oldS)?oldE-oldS:60;
  let ns;
  if(lo!=null&&hi!=null) ns = lo>=hi ? lo : round5((lo+hi)/2);
  else if(lo==null&&hi!=null) ns = Math.max(0, hi-dur);
  else if(lo!=null&&hi==null) ns = lo+15;
  else ns = 720;
  ns=round5(Math.max(0,ns));
  a.start=toHHMM(ns); a.end = a.end ? toHHMM(ns+dur) : '';
  commit(); render();
}

/* ============== УРОКИ ПО ГРУППАМ ============== */
function renderGroups(){
  const items=plan.activities.filter(a=> groupsScope==='all' ? (a.role==='teacher'||a.role==='counselor') : a.role===groupsScope);
  const cols=`170px repeat(${plan.days.length}, 200px)`;
  let g=`<div class="grid-wrap"><div class="ov-grid" style="grid-template-columns:${cols}">`;
  g+=`<div class="ov-cell corner"></div>`;
  plan.days.forEach(d=>{ g+=`<div class="ov-cell day-head"><div class="ov-day-n">День ${d.n}</div><div class="ov-day-date">${d.date}</div></div>`; });
  plan.groupsInfo.forEach(gi=>{
    g+=`<div class="ov-cell lane-head"><div><div style="display:flex;align-items:center;gap:7px"><i class="bi bi-mortarboard-fill"></i> ${gi.id}</div><div style="font-size:11px;color:var(--text3);font-weight:400;margin-top:2px">${gi.age} · ${esc(gi.course)}</div></div></div>`;
    plan.days.forEach((d,di)=>{
      const cell=items.filter(a=>a.day===di && groupMatch(a.group,gi.id)).sort((a,b)=>(a.start||'').localeCompare(b.start||''));
      let html=`<div class="ov-cell editable" onclick="gotoGroupDay(${di})">`;
      if(!cell.length) html+=`<div class="ov-empty">—</div>`;
      else cell.forEach(a=>{ const cp=chkProgress(a);
        html+=`<div class="mini t-${a.type}"><div class="mini-time">${a.start}${a.end?'–'+a.end:''}</div><div class="mini-title">${groupsScope==='all'?`<i class="bi ${ROLES[a.role].icon}" style="font-size:10px;color:var(--text3)"></i> `:''}${esc(a.title)}</div><div class="mini-foot">${a.resp?avatar(a.resp):'<span class="chk-badge" style="color:var(--red)"><i class="bi bi-exclamation-circle"></i></span>'}${cp.t?`<span class="chk-badge${cp.d===cp.t?' done':''}"><i class="bi bi-check2-square"></i> ${cp.d}/${cp.t}</span>`:''}</div></div>`; });
      g+=html+`</div>`;
    });
  });
  g+=`</div></div>`;
  const scopeBar=`<div class="ed-bar" style="margin-bottom:14px"><span class="ed-lane">Показать:</span><span class="seg">
    <button class="${groupsScope==='teacher'?'active':''}" onclick="setGroupsScope('teacher')">Уроки (преп.)</button>
    <button class="${groupsScope==='counselor'?'active':''}" onclick="setGroupsScope('counselor')">Вожатские</button>
    <button class="${groupsScope==='all'?'active':''}" onclick="setGroupsScope('all')">Все</button></span></div>`;
  const desc=groupsScope==='teacher'?'Уроки преподавателей по 5 группам. Урок «Все»/«Junior» виден в соответствующих подгруппах.'
    :groupsScope==='counselor'?'Вожатские активности по группам. Активность «Все» видна во всех подгруппах — поставьте конкретную группу в карточке, чтобы закрепить за подгруппой.'
    :'Уроки и вожатские активности вместе, разнесённые по 5 группам.';
  return `<div class="c-head"><div><div class="c-title">По группам</div><div class="c-sub">${desc} Клик по ячейке — в редактор дня.</div></div></div>${scopeBar}${g}`;
}
function setGroupsScope(s){ groupsScope=s; render(); }
function gotoGroupDay(i){ currentRole = groupsScope==='counselor'?'counselor':'teacher'; editorDay=i; view='editor'; render(); }

/* ============== ОТЧЁТ РОДИТЕЛЯМ ============== */
function renderReports(){
  plan.parentReports=plan.parentReports||[];
  const RST={draft:{l:'Черновик',c:'var(--text3)',bg:'var(--bg)'},ready:{l:'Готов',c:'var(--orange)',bg:'var(--orange-bg)'},published:{l:'Опубликован',c:'var(--green)',bg:'var(--green-bg)'}};
  let cards='';
  plan.parentReports.forEach(r=>{
    const d=plan.days[r.day]; if(!d)return;
    const st=RST[r.status]||RST.draft;
    const shotsDone=(r.shots||[]).filter((_,i)=>r.shotsDone&&r.shotsDone[i]).length;
    const shotRows=(r.shots||[]).map((s,i)=>`<div class="chk-row${r.shotsDone&&r.shotsDone[i]?' done':''}" onclick="toggleShot(${r.day},${i})"><input type="checkbox" ${r.shotsDone&&r.shotsDone[i]?'checked':''} onclick="event.stopPropagation()"><span>${esc(s)}</span></div>`).join('');
    cards+=`<div class="ck-card" style="margin-bottom:14px">
      <h4><i class="bi bi-megaphone-fill"></i> День ${d.n} · ${d.date}
        <span class="ck-prog" style="background:${st.bg};color:${st.c};padding:3px 10px;border-radius:20px;font-size:11.5px"><i class="bi bi-clock"></i> ${r.time} · ${st.l}</span></h4>
      <div class="row2">
        <div class="cb-section"><div class="cb-label">Цель по контенту</div><div class="cb-desc"><b>Фото:</b> ${esc(r.photos)} · <b>Видео:</b> ${esc(r.video)}</div></div>
      </div>
      <div class="cb-section"><div class="cb-label">Что снять (чек-лист)</div>${shotRows||'<div style="font-size:13px;color:var(--text3)">—</div>'}<div style="font-size:11.5px;color:var(--text3);margin-top:4px">${shotsDone}/${(r.shots||[]).length} кадров отмечено</div></div>
      <div class="cb-section"><div class="cb-label">Текст поста <span style="font-weight:400;text-transform:none;color:var(--text3)">(ориентир: ${esc(r.textTarget)})</span></div><textarea class="result-area" placeholder="Черновик поста для родительского чата..." onchange="setReportField(${r.day},'draft',this.value)">${esc(r.draft)}</textarea></div>
      <div class="cb-section"><div class="cb-label">Статус</div><div class="status-seg">
        <button class="s-planned ${r.status==='draft'?'active':''}" onclick="setReportStatus(${r.day},'draft')"><i class="bi bi-pencil"></i> Черновик</button>
        <button class="s-progress ${r.status==='ready'?'active':''}" onclick="setReportStatus(${r.day},'ready')"><i class="bi bi-check2"></i> Готов</button>
        <button class="s-done ${r.status==='published'?'active':''}" onclick="setReportStatus(${r.day},'published')"><i class="bi bi-send-fill"></i> Опубликован</button>
      </div></div>
    </div>`;
  });
  const pub=plan.parentReports.filter(r=>r.status==='published').length;
  return `<div class="c-head"><div><div class="c-title">Отчёт родителям</div><div class="c-sub">Ежедневный пост в родительский чат (обычно 20:30, после отбоя). Цель, чек-лист кадров и черновик текста по каждому дню. Опубликовано: ${pub}/${plan.parentReports.length}.</div></div></div>${cards}`;
}
function toggleShot(day,i){ const r=plan.parentReports.find(x=>x.day===day); r.shotsDone=r.shotsDone||[]; r.shotsDone[i]=!r.shotsDone[i]; commit(); render(); }
function setReportField(day,f,v){ plan.parentReports.find(x=>x.day===day)[f]=v; commit(); }
function setReportStatus(day,s){ plan.parentReports.find(x=>x.day===day).status=s; commit(); render(); }

function renderActCard(a){
  const cp=chkProgress(a), open=a._open?' open':'';
  const respHtml=a.resp?`<span class="resp-chip">${avatar(a.resp)} ${esc(person(a.resp).name.split('·')[0].trim())}</span>`:`<span class="resp-chip unassigned"><i class="bi bi-exclamation-circle"></i> назначить</span>`;
  const meta=[]; if(a.place) meta.push(`<span><i class="bi bi-geo-alt"></i> ${esc(a.place)}</span>`); if(a.group&&a.group!=='Все') meta.push(`<span><i class="bi bi-people"></i> ${esc(a.group)}</span>`);
  const chkRows=a.checklist.map((c,i)=>`<div class="chk-row${c.done?' done':''}" onclick="toggleChk('${a.id}',${i})"><input type="checkbox" ${c.done?'checked':''} onclick="event.stopPropagation()"><span>${esc(c.text)}</span></div>`).join('');
  const respOpts=plan.team.map(p=>`<option value="${p.id}" ${a.resp===p.id?'selected':''}>${esc(p.name)} · ${ROLES[p.role].label}</option>`).join('');
  const execOpts=plan.team.map(p=>`<option value="${p.id}" ${a.exec===p.id?'selected':''}>${esc(p.name)} · ${ROLES[p.role].label}</option>`).join('');
  const grpOpts=plan.groups.map(gg=>`<option value="${gg}" ${a.group===gg?'selected':''}>${gg}</option>`).join('');
  return `<div class="tl-item t-${a.type}"><div class="tl-time">${a.start}<small>${a.end||''}</small></div><div class="tl-line"></div>
    <div class="tl-card${open}">
      <div class="card-top" onclick="toggleCard('${a.id}')">
        <span class="drag-handle" draggable="true" ondragstart="dragStart(event,'${a.id}')" ondragend="dragEnd(event)" onclick="event.stopPropagation()" title="Перетащить по времени"><i class="bi bi-grip-vertical"></i></span>
        <span class="card-tag tag-${a.type}">${a.type==='mandatory'?'<i class="bi bi-pin-angle-fill"></i> обяз.':'<i class="bi bi-stars"></i> доп.'}</span>
        <div style="flex:1;min-width:0"><div class="card-name">${esc(a.title)}</div>${meta.length?`<div class="card-meta">${meta.join('')}</div>`:''}</div>
        ${respHtml}${cp.t?`<span class="chk-badge${cp.d===cp.t?' done':''}"><i class="bi bi-check2-square"></i> ${cp.d}/${cp.t}</span>`:''}
        <i class="bi bi-chevron-down card-chev"></i>
      </div>
      <div class="card-body">
        ${a.desc?`<div class="cb-section"><div class="cb-label">Содержание</div><div class="cb-desc">${esc(a.desc)}</div></div>`:''}
        <div class="row2">
          <div class="cb-section"><div class="cb-label">Ответственный</div><select class="fld" onchange="setResp('${a.id}',this.value)"><option value="">— не назначен —</option>${respOpts}</select></div>
          <div class="cb-section"><div class="cb-label">Исполнитель</div><select class="fld" onchange="setField('${a.id}','exec',this.value)"><option value="">— не назначен —</option>${execOpts}</select></div>
        </div>
        <div class="row2">
          <div class="cb-section"><div class="cb-label">Время</div><span style="display:flex;gap:6px"><input class="fld" type="time" value="${a.start}" onchange="setField('${a.id}','start',this.value)"><input class="fld" type="time" value="${a.end||''}" onchange="setField('${a.id}','end',this.value)"></span></div>
          <div class="cb-section"><div class="cb-label">Тип</div><select class="fld" onchange="setField('${a.id}','type',this.value)"><option value="mandatory" ${a.type==='mandatory'?'selected':''}>Обязательная</option><option value="extra" ${a.type==='extra'?'selected':''}>Доп. активность</option></select></div>
        </div>
        <div class="row2">
          <div class="cb-section"><div class="cb-label">Место</div><input class="fld" type="text" value="${esc(a.place)}" placeholder="Класс A / Поляна" onchange="setField('${a.id}','place',this.value)"></div>
          <div class="cb-section"><div class="cb-label">Группа</div><select class="fld" onchange="setField('${a.id}','group',this.value)">${grpOpts}</select></div>
        </div>
        <div class="cb-section"><div class="cb-label">Чек-лист подготовки</div>${chkRows||'<div style="font-size:13px;color:var(--text3)">Пунктов нет</div>'}
          <div class="chk-add"><input type="text" id="nc-${a.id}" placeholder="Новый пункт..." onkeydown="if(event.key==='Enter')addChk('${a.id}')"><button onclick="addChk('${a.id}')"><i class="bi bi-plus-lg"></i></button></div>
        </div>
        <div class="cb-section"><div class="cb-label">Статус</div>
          <div class="status-seg">
            <button class="s-planned ${a.status==='planned'?'active':''}" onclick="setStatus('${a.id}','planned')"><i class="bi bi-circle"></i> Запланировано</button>
            <button class="s-progress ${a.status==='progress'?'active':''}" onclick="setStatus('${a.id}','progress')"><i class="bi bi-play-circle"></i> В работе</button>
            <button class="s-done ${a.status==='done'?'active':''}" onclick="setStatus('${a.id}','done')"><i class="bi bi-check-circle-fill"></i> Выполнено</button>
          </div>
        </div>
        <div class="cb-section"><div class="cb-label">Результат / заметка по факту</div><textarea class="result-area" placeholder="Что получилось, что учесть в следующий раз..." onchange="setField('${a.id}','result',this.value)">${esc(a.result)}</textarea></div>
        <div class="card-actions"><button class="link-btn" onclick="copyActivity('${a.id}')" style="color:var(--text2)"><i class="bi bi-files"></i> Дублировать</button><button class="link-btn" onclick="delAct('${a.id}')"><i class="bi bi-trash3"></i> Удалить</button></div>
      </div>
    </div></div>`;
}
function toggleCard(id){ const a=plan.activities.find(x=>x.id===id); a._open=!a._open; render(); }
function toggleChk(id,i){ const a=plan.activities.find(x=>x.id===id); a.checklist[i].done=!a.checklist[i].done; a._open=true; commit(); render(); }
function addChk(id){ const inp=document.getElementById('nc-'+id); const v=inp.value.trim(); if(!v)return; const a=plan.activities.find(x=>x.id===id); a.checklist.push({text:v,done:false}); a._open=true; commit(); render(); }
function setResp(id,v){ plan.activities.find(x=>x.id===id).resp=v; commit(); render(); }
function setStatus(id,s){ const a=plan.activities.find(x=>x.id===id); a.status=s; a._open=true; commit('Статус: «'+a.title+'» → '+({planned:'запланировано',progress:'в работе',done:'выполнено'}[s]||s)); render(); }
function setField(id,f,v){ plan.activities.find(x=>x.id===id)[f]=v; commit(); if(f==='start'||f==='end'||f==='group') render(); }
function delAct(id){ if(!confirm('Удалить активность?'))return; plan.activities=plan.activities.filter(x=>x.id!==id); commit(); render(); }
function copyActivity(id){ const a=plan.activities.find(x=>x.id===id); if(!a)return; const c=clonePlan(a); c.id=nid('a'); c.title=a.title+' (копия)'; c.status='planned'; c.result=''; c.checklist=(c.checklist||[]).map(x=>({text:x.text,done:false})); c._open=true; plan.activities.push(c); commit(); render(); }

/* ============== CHECKLISTS (role-wide) ============== */
function renderChecklists(){
  const rc=plan.roleChecklists[currentRole]||{before:[],daily:[]};
  // store done-state for role checklists in plan.roleChecklistState
  plan.roleChecklistState=plan.roleChecklistState||{};
  const st=plan.roleChecklistState;
  const key=(kind,i)=>`${currentRole}:${kind}:${i}`;
  function block(kind,title,sub,icon,items){
    const done=items.filter((_,i)=>st[key(kind,i)]).length;
    let rows=items.map((t,i)=>`<div class="chk-row${st[key(kind,i)]?' done':''}" onclick="toggleRoleChk('${kind}',${i})"><input type="checkbox" ${st[key(kind,i)]?'checked':''} onclick="event.stopPropagation()"><span>${esc(t)}</span></div>`).join('');
    return `<div class="ck-card"><h4><i class="bi ${icon}"></i> ${title}<span class="ck-prog">${done}/${items.length}</span></h4><div class="ck-sub">${sub}</div>${rows}</div>`;
  }
  return `<div class="c-head"><div><div class="c-title">Чек-листы роли · ${ROLES[currentRole].label}</div><div class="c-sub">Подготовка до смены и ежедневный распорядок для вашей роли (из «боевого документа»). Отметки общие для роли.</div></div></div>
    <div class="ck-cols">${block('before','До смены (за неделю)','Сделать заранее, один раз','bi-box-seam',rc.before)}${block('daily','Ежедневно','Повторять каждый день смены','bi-arrow-repeat',rc.daily)}</div>`;
}
function toggleRoleChk(kind,i){ const k=`${currentRole}:${kind}:${i}`; plan.roleChecklistState=plan.roleChecklistState||{}; plan.roleChecklistState[k]=!plan.roleChecklistState[k]; commit(); render(); }

/* ============== TEAM ============== */
function renderTeam(){
  let html=`<div class="c-head"><div><div class="c-title">Команда смены</div><div class="c-sub">Заполните реальные имена вместо слотов — дальше выбираете людей из списка при назначении ответственных. Группы: ${plan.groupsInfo.map(g=>g.id+' ('+g.age+')').join(', ')}.</div></div></div>`;
  ALL_ROLES.forEach(r=>{
    const list=plan.team.filter(p=>p.role===r); if(!list.length)return;
    html+=`<div class="team-group"><h3><i class="bi ${ROLES[r].icon}"></i> ${ROLES[r].plural} · ${list.length}</h3><div class="team-cards">`;
    list.forEach(p=>{ const load=plan.activities.filter(a=>a.resp===p.id).length;
      html+=`<div class="person-card" style="flex-wrap:wrap;align-items:center;gap:8px">
        ${avatar(p.id,true)}
        <input class="pname" style="flex:1;min-width:90px" value="${esc(p.name)}" onchange="renamePerson('${p.id}',this.value)" placeholder="Имя и фамилия">
        <button class="link-btn" onclick="delPerson('${p.id}')" title="Удалить из команды"><i class="bi bi-trash3"></i></button>
        <div style="flex-basis:100%;display:flex;align-items:center;gap:8px;padding-left:49px">
          <span class="person-load">${load} ${plural(load,'активность','активности','активностей')}</span>
          <select class="p-sel" style="max-width:135px;margin-left:auto" onchange="setPersonGroup('${p.id}',this.value)" title="Группа"><option value="">— группа —</option>${plan.groups.filter(g=>g!=='Все').map(g=>`<option value="${g}" ${p.group===g?'selected':''}>${g}</option>`).join('')}</select>
        </div></div>`; });
    html+=`</div></div>`;
  });
  html+=`<div class="cb-label">Добавить человека</div><div class="add-person"><input type="text" id="np-name" placeholder="Имя и фамилия"><select id="np-role">${ALL_ROLES.map(r=>`<option value="${r}">${ROLES[r].label}</option>`).join('')}</select><button class="btn-primary" onclick="addPerson()"><i class="bi bi-person-plus"></i> Добавить</button></div>`;
  return html;
}
function plural(n,a,b,c){ const m=n%100,d=n%10; if(m>=11&&m<=14)return c; if(d===1)return a; if(d>=2&&d<=4)return b; return c; }
function renamePerson(id,v){ const p=person(id); if(v.trim()){p.name=v.trim(); commit(); render();} }
function setPersonGroup(id,v){ const p=person(id); if(p){p.group=v; commit(); render();} }
function delPerson(id){ if(!confirm('Удалить из команды? Назначения этого человека снимутся.'))return; plan.team=plan.team.filter(x=>x.id!==id); plan.activities.forEach(a=>{ if(a.resp===id)a.resp=''; if(a.exec===id)a.exec=''; }); commit(); render(); }
function addPerson(){ const n=document.getElementById('np-name').value.trim(); const r=document.getElementById('np-role').value; if(!n)return; plan.team.push({id:'p'+Date.now(),name:n,role:r,group:''}); commit(); render(); }

/* ============== ПАРАМЕТРЫ СМЕНЫ (длительность / дни) ============== */
function renderSettings(){
  const s=plan.shift;
  const shiftsCard=`<div class="ck-card" style="margin-bottom:18px">
    <h4><i class="bi bi-collection-fill"></i> Смены · ${store.shifts.length}</h4>
    <div class="ck-sub">Несколько смен в одном инструменте. Переключение — селектором вверху или кнопкой «открыть».</div>
    ${store.shifts.map(sh=>`<div class="person-card" style="gap:10px;flex-wrap:wrap;${sh.id===store.activeId?'border-color:var(--orange);background:var(--orange-bg)':''}">
      <span class="avatar" style="background:${sh.id===store.activeId?'var(--orange)':'var(--text3)'}"><i class="bi bi-${sh.id===store.activeId?'check-lg':'calendar3'}"></i></span>
      <input class="pname" value="${esc(sh.plan.shift.name)}" onchange="renameShift('${sh.id}',this.value)" style="flex:1;min-width:140px">
      <span class="person-load">${sh.plan.days.length} дн. · ${sh.plan.activities.length} актив.</span>
      ${sh.id===store.activeId?'<span class="grp-tag" style="color:var(--orange);background:var(--orange-bg)">активна</span>':`<button class="link-btn" onclick="switchShift('${sh.id}')" style="color:var(--blue)"><i class="bi bi-box-arrow-in-right"></i> открыть</button>`}
      <button class="link-btn" onclick="duplicateShift('${sh.id}')" style="color:var(--text2)" title="Дублировать смену"><i class="bi bi-files"></i></button>
      <button class="link-btn" onclick="deleteShift('${sh.id}')" title="Удалить смену"><i class="bi bi-trash3"></i></button>
    </div>`).join('')}
    <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">
      <button class="btn-primary" onclick="newShift()"><i class="bi bi-plus-lg"></i> Новая смена</button>
      <button class="btn-secondary" onclick="duplicateShift(store.activeId)"><i class="bi bi-files"></i> Дублировать текущую</button>
    </div>
  </div>`;
  const metaCard=`<div class="ck-card" style="margin-bottom:18px">
    <h4><i class="bi bi-info-circle"></i> Параметры смены</h4>
    <div class="row2">
      <div class="cb-section"><div class="cb-label">Название</div><input class="fld" value="${esc(s.name)}" onchange="setShiftField('name',this.value)"></div>
      <div class="cb-section"><div class="cb-label">Место</div><input class="fld" value="${esc(s.place)}" onchange="setShiftField('place',this.value)"></div>
    </div>
    <div class="row2">
      <div class="cb-section"><div class="cb-label">Участники</div><input class="fld" value="${esc(s.kids)}" onchange="setShiftField('kids',this.value)"></div>
      <div class="cb-section"><div class="cb-label">Длительность</div><div class="cb-desc"><b>${plan.days.length}</b> дней — регулируется списком ниже</div></div>
    </div>
  </div>`;
  const dayRows=plan.days.map((d,i)=>`<div class="person-card" style="gap:10px;flex-wrap:wrap">
    <span class="avatar" style="background:var(--orange)">${d.n}</span>
    <input class="fld" style="flex:1;min-width:110px" value="${esc(d.date)}" placeholder="напр. пт, 30 мая" onchange="setDayField(${i},'date',this.value)">
    <select class="fld" style="width:auto" onchange="setDayField(${i},'type',this.value)">${Object.keys(TYPE_LABEL).map(t=>`<option value="${t}" ${d.type===t?'selected':''}>${TYPE_LABEL[t]}</option>`).join('')}</select>
    <input class="fld" style="flex:2;min-width:150px" value="${esc(d.title)}" placeholder="Название дня" onchange="setDayField(${i},'title',this.value)">
    <button class="link-btn" onclick="duplicateDay(${i})" title="Дублировать день" style="color:var(--text2)"><i class="bi bi-files"></i></button>
    <button class="link-btn" onclick="deleteDay(${i})" title="Удалить день"><i class="bi bi-trash3"></i></button>
  </div>`).join('');
  return `<div class="c-head"><div><div class="c-title">Параметры смены</div><div class="c-sub">Длительность регулируется списком дней. Тип дня задаёт обязательное расписание (заезд / учебный / показ / выезд). Удаление дня убирает его активности; последующие дни сдвигаются.</div></div></div>
    ${shiftsCard}
    ${metaCard}
    <div class="ck-card" style="margin-bottom:18px"><h4><i class="bi bi-people-fill"></i> Дети смены · ${(plan.roster||[]).length}</h4><div class="ck-sub">Единый список детей смены (из AlfaCRM) — используется в расселении и перекличке. Загрузка добавляет только новых, не трогая уже внесённых и правок.</div><button class="btn-primary" onclick="loadRoster()"><i class="bi bi-cloud-download"></i> Загрузить детей из AlfaCRM</button></div>
    <div class="cb-label">Дни смены · ${plan.days.length}</div>
    <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:14px">${dayRows}</div>
    <button class="btn-primary" onclick="addDay()"><i class="bi bi-plus-lg"></i> Добавить день</button>`;
}
function setShiftField(f,v){ plan.shift[f]=v; commit(); render(); }
function setDayField(i,f,v){ plan.days[i][f]=v; commit(); render(); }
function addDay(){
  plan.days.push({n:plan.days.length+1, date:'', type:'study', title:'Учебный день'});
  plan.parentReports=plan.parentReports||[];
  plan.parentReports.push({day:plan.days.length-1, time:'20:30', photos:'10', video:'видео', textTarget:'Итоги дня', draft:'', status:'draft', shots:['Уроки в процессе','Активности']});
  commit(); render();
}
function duplicateDay(i){
  const src=plan.days[i], ni=plan.days.length;
  plan.days.push({n:ni+1, date:src.date, type:src.type, title:src.title+' (копия)'});
  plan.activities.filter(a=>a.day===i).forEach(a=>{ const c=clonePlan(a); c.id=nid('a'); c.day=ni; c.status='planned'; c.result=''; c.checklist=(c.checklist||[]).map(x=>({text:x.text,done:false})); plan.activities.push(c); });
  const pr=(plan.parentReports||[]).find(r=>r.day===i); if(pr){ const c=clonePlan(pr); c.day=ni; c.status='draft'; c.draft=''; c.shotsDone=[]; plan.parentReports.push(c); }
  commit(); render();
}
function deleteDay(i){
  if(plan.days.length<=1){ alert('Должен остаться хотя бы один день'); return; }
  const cnt=plan.activities.filter(a=>a.day===i).length;
  if(!confirm(`Удалить День ${plan.days[i].n}? Активностей будет удалено: ${cnt}. Последующие дни сдвинутся.`)) return;
  plan.activities=plan.activities.filter(a=>a.day!==i); plan.activities.forEach(a=>{ if(a.day>i)a.day-=1; });
  plan.parentReports=(plan.parentReports||[]).filter(r=>r.day!==i); plan.parentReports.forEach(r=>{ if(r.day>i)r.day-=1; });
  plan.days.splice(i,1); plan.days.forEach((d,idx)=>d.n=idx+1);
  if(editorDay>=plan.days.length) editorDay=plan.days.length-1;
  commit(); render();
}

/* ============== MODAL ============== */
function openModal(){
  modalChk=[''];
  document.getElementById('modalTitle').textContent='Новая активность · День '+plan.days[editorDay].n;
  document.getElementById('f-title').value=''; document.getElementById('f-desc').value=''; document.getElementById('f-place').value='';
  document.getElementById('f-start').value='14:00'; document.getElementById('f-end').value='15:00';
  document.querySelector('input[name="f-type"][value="mandatory"]').checked=true;
  document.getElementById('f-group').innerHTML=plan.groups.map(g=>`<option value="${g}">${g}</option>`).join('');
  const teamOpts='<option value="">— не назначен —</option>'+plan.team.map(p=>`<option value="${p.id}">${esc(p.name)} · ${ROLES[p.role].label}</option>`).join('');
  document.getElementById('f-resp').innerHTML=teamOpts;
  document.getElementById('f-exec').innerHTML=teamOpts;
  renderModalChk(); document.getElementById('overlay').classList.add('open');
}
function closeModal(){ document.getElementById('overlay').classList.remove('open'); }
function renderModalChk(){ document.getElementById('f-checklist').innerHTML=modalChk.map((c,i)=>`<div class="mc-row"><input type="text" value="${esc(c)}" placeholder="Пункт чек-листа" oninput="modalChk[${i}]=this.value"><button class="mc-del" onclick="modalChk.splice(${i},1);renderModalChk()"><i class="bi bi-x"></i></button></div>`).join(''); }
function addModalChk(){ modalChk.push(''); renderModalChk(); }
function saveActivity(){
  const title=document.getElementById('f-title').value.trim(); if(!title){alert('Введите название');return;}
  const type=document.querySelector('input[name="f-type"]:checked').value;
  const chk=modalChk.filter(c=>c.trim()).map(c=>({text:c.trim(),done:false}));
  plan.activities.push({id:nid('a'),day:editorDay,role:currentRole,start:document.getElementById('f-start').value||'12:00',end:document.getElementById('f-end').value||'',title,
    place:document.getElementById('f-place').value,group:document.getElementById('f-group').value,resp:document.getElementById('f-resp').value,exec:document.getElementById('f-exec').value,type,desc:document.getElementById('f-desc').value,checklist:chk,status:'planned',result:'',_open:true});
  commit(); closeModal(); render();
}

/* ============== BOOT ============== */
(async function(){
  const saved=await PERSIST.load();
  if(saved && Array.isArray(saved.shifts) && saved.shifts.length) store=saved;
  else if(saved && Array.isArray(saved.days)) store={shifts:[{id:'s1',plan:saved}],activeId:'s1'}; // миграция старого одиночного формата
  else store={shifts:[{id:'s1',plan:defaultPlan()}],activeId:'s1'};
  if(!store.activeId || !store.shifts.find(s=>s.id===store.activeId)) store.activeId=store.shifts[0].id;
  plan=activeShift().plan;
  try{ currentUser=JSON.parse(localStorage.getItem('ac_staff_user')||'null'); }catch(e){ currentUser=null; }
  if(currentUser&&currentUser.role) currentRole=currentUser.role;
  if(PERSIST.mode==='live') markSaved();
  render();
  if(!currentUser) setTimeout(openIdentity,400);
})();

// Expose global functions for HTML event handlers
Object.assign(window, {
  actInterval, activeShift, actsFor, addChk, addDay, addKid, addModalChk,
  addPerson, addRoom, assignedKidSet, autoAssign, avColor, avatar,
  bedDrop, bedLeave, bedOver, bucketOf, buildIssues, chkProgress,
  clearKid, clonePlan, closeIdentity, closeKidModal, closeModal,
  commit, commitNow, copyActivity, counselorOpts, dayConflicts, dayLoad,
  dayStatus, defaultPlan, defaultRooms, delAct, delPerson, delRoom,
  deleteDay, deleteShift, dragEnd, dragStart, duplicateDay, duplicateShift,
  dzDrop, dzLeave, dzOver, esc, fmtH, gotoEdit, gotoGroupDay, groupMatch,
  idPickRole, initials, kid, kidCard, kidDragEnd, kidDragStart, kmSetGender,
  kmToggleWish, loadRoster, logChange, markSaved, markSaving, moveActTime,
  newShift, nid, openDay, openIdentity, openKidModal, openModal, openSchedDay,
  person, personSelect, placeKid, plural, poolDrop, poolLeave, poolOver,
  printRooming, printShift, renamePerson, renameShift, render, renderActCard,
  renderChecklists, renderEditor, renderGridDay, renderGroups, renderIdRoles,
  renderLoad, renderLog, renderModalChk, renderOverview, renderReports,
  renderRooms, renderSchedule, renderSettings, renderTeam, roomGender,
  roomOf, round5, saveActivity, saveIdentity, selDay, setDayField, setField,
  setFilter, setGroupFilter, setGroupsScope, setPersonField, setPersonGroup,
  setReportField, setReportStatus, setResp, setRole, setRoomCap, setRoomField,
  setShiftField, setStatus, setView, switchShift, toHHMM, toMin,
  toggleCard, toggleChk, toggleKidGender, toggleRoleChk, toggleShot,
  unassignKid,
});
