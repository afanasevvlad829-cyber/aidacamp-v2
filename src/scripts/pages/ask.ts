// @ts-nocheck
import { YM_COUNTER } from '../../data/tracking';
import { getCurrentPrice, fmtPrice } from '../../data/dynamicPrices';

/* ── THEME ── */
function initTheme(){
  const saved=localStorage.getItem('ask-theme');
  const sys=window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme=saved||(sys?'dark':'light');
  document.documentElement.setAttribute('data-theme',theme);
  updateThemeIcon(theme);
}
function toggleTheme(){
  const cur=document.documentElement.getAttribute('data-theme')||'light';
  const next=cur==='dark'?'light':'dark';
  document.documentElement.setAttribute('data-theme',next);
  localStorage.setItem('ask-theme',next);
  updateThemeIcon(next);
}
function updateThemeIcon(theme){
  const icon=document.getElementById('themeIcon');
  if(icon) icon.className=theme==='dark'?'bi bi-sun-fill':'bi bi-moon-stars-fill';
}
initTheme();

/* ── ROTATING HEADLINE WORD ── */
(function(){
  const words=['лагерь','программу','безопасность','цены','смены','питание'];
  let wi=0;
  const el=document.getElementById('rotWord');
  if(!el)return;
  setInterval(()=>{
    wi=(wi+1)%words.length;
    el.style.transition='opacity .22s';
    el.style.opacity='0';
    setTimeout(()=>{
      el.textContent=words[wi];
      el.style.transition='opacity .32s';
      el.style.opacity='1';
    },240);
  },2800);
})();

/* ── BACKGROUND ANIMATION ── */
(()=>{
  const c=document.getElementById('stars'),ctx=c.getContext('2d');
  let stars=[],bubbles=[],shoot=null,t=0;

  function isDark(){return document.documentElement.getAttribute('data-theme')==='dark';}

  /* ─ DARK: twinkling stars ─ */
  function initStars(){
    stars=Array.from({length:260},()=>({
      x:Math.random()*c.width,
      y:Math.random()*c.height*.85,
      r:Math.random()<.08?Math.random()*.8+.9:Math.random()*.6+.15, // mostly tiny, few bigger
      base:Math.random()*.55+.08,  // base opacity
      sp:Math.random()*2+.5,       // twinkle speed
      ph:Math.random()*Math.PI*2,  // phase offset
      warm:Math.random()<.15,      // warm tint (yellowish)
      blue:Math.random()<.2,       // cool tint (blue-white)
      spark:Math.random()<.04,     // cross sparkle on bright stars
    }));
  }

  /* ─ LIGHT: floating bokeh bubbles ─ */
  function initBubbles(){
    bubbles=Array.from({length:55},()=>makeBubble(true));
  }
  function makeBubble(random){
    const w=c.width,h=c.height;
    return {
      x:Math.random()*w,
      y:random?Math.random()*h:h+20,
      r:Math.random()*18+6,
      o:Math.random()*.055+.018,
      sp:Math.random()*.18+.06,   // rise speed px/frame
      drift:Math.random()*.4-.2,  // horizontal drift
      ph:Math.random()*Math.PI*2,
      pulse:Math.random()*.6+.8,  // pulse speed
      orange:Math.random()<.25,   // orange tint
    };
  }

  /* ─ SHOOTING STAR ─ */
  function maybeShoot(){
    if(shoot||Math.random()>0.003)return;
    shoot={
      x:Math.random()*c.width*.6+c.width*.1,
      y:Math.random()*c.height*.3,
      len:Math.random()*90+60,
      angle:Math.PI/6+Math.random()*.3,
      prog:0,life:1
    };
  }
  function drawShoot(){
    if(!shoot)return;
    shoot.prog+=4;
    const{x,y,len,angle,prog}=shoot;
    const x2=x+Math.cos(angle)*prog,y2=y+Math.sin(angle)*prog;
    const tail=Math.max(0,prog-len);
    const x1=x+Math.cos(angle)*tail,y1=y+Math.sin(angle)*tail;
    const g=ctx.createLinearGradient(x1,y1,x2,y2);
    g.addColorStop(0,'rgba(255,255,255,0)');
    g.addColorStop(1,`rgba(255,255,255,${shoot.life*.9})`);
    ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);
    ctx.strokeStyle=g;ctx.lineWidth=1.5;ctx.stroke();
    shoot.life-=.025;
    if(shoot.life<=0)shoot=null;
  }

  /* ─ CROSS SPARKLE ─ */
  function drawSparkle(x,y,r,a){
    const arm=r*3.5;
    ctx.globalAlpha=a*.7;
    ctx.strokeStyle='rgba(255,255,255,1)';
    ctx.lineWidth=.6;
    ctx.beginPath();ctx.moveTo(x-arm,y);ctx.lineTo(x+arm,y);ctx.stroke();
    ctx.beginPath();ctx.moveTo(x,y-arm);ctx.lineTo(x,y+arm);ctx.stroke();
    // diagonal arms (dimmer)
    ctx.globalAlpha=a*.3;
    const d=arm*.6;
    ctx.beginPath();ctx.moveTo(x-d,y-d);ctx.lineTo(x+d,y+d);ctx.stroke();
    ctx.beginPath();ctx.moveTo(x+d,y-d);ctx.lineTo(x-d,y+d);ctx.stroke();
    ctx.globalAlpha=1;
  }

  const resize=()=>{
    c.width=innerWidth;c.height=innerHeight;
    initStars();initBubbles();
  };

  const draw=()=>{
    t++;
    ctx.clearRect(0,0,c.width,c.height);

    if(isDark()){
      /* ── DARK: stars ── */
      maybeShoot();
      stars.forEach(s=>{
        // multi-frequency twinkle: fast flicker + slow breath
        const fast=Math.sin(t*.04*s.sp+s.ph);
        const slow=Math.sin(t*.008*s.sp+s.ph*1.3);
        let a=(s.base+fast*.28+slow*.12);
        a=Math.max(0,Math.min(.95,a));

        // star color
        let rgb='255,255,255';
        if(s.warm)rgb='255,240,180';
        else if(s.blue)rgb='180,210,255';

        // glow for brighter stars
        if(s.r>.7&&a>.4){
          const g=ctx.createRadialGradient(s.x,s.y,0,s.x,s.y,s.r*4);
          g.addColorStop(0,`rgba(${rgb},${a*.35})`);
          g.addColorStop(1,'rgba(255,255,255,0)');
          ctx.beginPath();ctx.arc(s.x,s.y,s.r*4,0,Math.PI*2);
          ctx.fillStyle=g;ctx.fill();
        }

        // core dot
        ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,Math.PI*2);
        ctx.fillStyle=`rgba(${rgb},${a})`;ctx.fill();

        // sparkle cross on large bright stars
        if(s.spark&&s.r>.9&&a>.55)drawSparkle(s.x,s.y,s.r,a);
      });
      drawShoot();

    } else {
      /* ── LIGHT: bokeh bubbles ── */
      bubbles.forEach((b,i)=>{
        b.y-=b.sp;
        b.x+=b.drift;
        const pulse=Math.sin(t*.015*b.pulse+b.ph);
        const a=b.o*(0.7+pulse*.3);
        const r=b.r*(0.92+pulse*.08);

        // wrap around
        if(b.y<-30||(b.x<-40||b.x>c.width+40))bubbles[i]=makeBubble(false);

        // soft bokeh ring
        ctx.beginPath();ctx.arc(b.x,b.y,r,0,Math.PI*2);
        ctx.strokeStyle=b.orange?`rgba(236,124,0,${a*.9})`:`rgba(29,111,224,${a*.65})`;
        ctx.lineWidth=.8;ctx.stroke();

        // inner soft fill
        const g=ctx.createRadialGradient(b.x-r*.25,b.y-r*.25,0,b.x,b.y,r);
        const col=b.orange?`rgba(255,160,60,${a*.25})`:`rgba(100,160,255,${a*.2})`;
        g.addColorStop(0,col);g.addColorStop(1,'rgba(255,255,255,0)');
        ctx.beginPath();ctx.arc(b.x,b.y,r,0,Math.PI*2);
        ctx.fillStyle=g;ctx.fill();
      });
    }

    requestAnimationFrame(draw);
  };

  resize();addEventListener('resize',resize);requestAnimationFrame(draw);
})();

/* ── CAMP DATA ── */
const shift3Price=getCurrentPrice('shift-3'), shift4Price=getCurrentPrice('shift-4');
const SMENY=[
  {n:'Смена 1',dates:'30 мая — 8 июня',days:'10 дней',price:'85 900 ₽',available:false,occupied:23,total:35},
  {n:'Смена 2',dates:'10 — 23 июня',days:'14 дней',price:'99 000 ₽',available:false,popular:true,occupied:41,total:45},
  {n:'Смена 2.1',dates:'10 — 16 июня',days:'7 дней',price:'48 000 ₽',available:false,short:true,occupied:29,total:40},
  {n:'Смена 2.2',dates:'16 — 23 июня',days:'8 дней',price:'75 000 ₽',available:false,short:true,occupied:37,total:45},
  {n:'Смена 3',dates:'3 — 15 августа',days:'13 дней',price:shift3Price?fmtPrice(shift3Price):'89 400 ₽',available:true,occupied:40,total:45},
  {n:'Смена 4',dates:'17 — 26 августа',days:'10 дней',price:shift4Price?fmtPrice(shift4Price):'74 900 ₽',available:true,occupied:31,total:45},
];
const COURSES=[
  {icon:'keyboard',name:'Scratch',age:'8–10 лет',minAge:8,maxAge:10,
   campHook:'Сделает игру с персонажами и уровнями — покажет маме работающее приложение',
   result:'Первый код без страха'},
  {icon:'blocks',name:'Minecraft',age:'8–12 лет',minAge:8,maxAge:12,
   campHook:'Создаст автоматизированный мир или мини-игру — одноклассники оценят',
   result:'Хвастается в школе'},
  {icon:'code-slash',name:'Python',age:'10–16 лет',minAge:10,maxAge:16,
   campHook:'Напишет игру или веб-приложение — реальный проект, который можно показать',
   result:'Покажет друзьям в телефоне'},
  {icon:'globe',name:'JavaScript',age:'10–12 лет',minAge:10,maxAge:12,
   campHook:'Сделает живой сайт с интерфейсом — то, что открывается в браузере и реально работает',
   result:'Показывает сайт всем'},
  {icon:'laptop',name:'Java / ООП',age:'13–16 лет',minAge:13,maxAge:16,
   campHook:'Освоит настоящую архитектуру кода — то, что используют в серьёзных командах',
   result:'Уровень junior-разработчика'},
  {icon:'cpu',name:'AI-проекты',age:'8–16 лет',minAge:8,maxAge:16,
   campHook:'Научится использовать ИИ как инструмент разработчика — поймёт то, о чём все говорят',
   result:'Тема на 5 лет вперёд'},
];
const DAY=[
  {t:'08:30',txt:'<strong>Завтрак</strong>'},
  {t:'09:30',txt:'<strong>IT-блок 1</strong> — основное направление, 90 мин'},
  {t:'11:30',txt:'<strong>Перемена</strong> — спорт, игры на улице'},
  {t:'13:00',txt:'<strong>Обед</strong>'},
  {t:'14:00',txt:'<strong>Тихий час</strong> — кто хочет отдыхает'},
  {t:'15:30',txt:'<strong>IT-блок 2</strong> — работа над проектом, 90 мин'},
  {t:'17:30',txt:'<strong>Бассейн</strong> — через день'},
  {t:'19:00',txt:'<strong>Ужин</strong>'},
  {t:'20:00',txt:'<strong>Вечерняя программа</strong> — квесты, кино, мастерские'},
];
const COND=[
  {icon:'house-door',title:'Проживание',desc:'Корпуса по 2–4 человека, WiFi'},
  {icon:'cup-hot',title:'Питание',desc:'5 раз в день: завтрак, 2-й завтрак, обед, полдник, ужин. Аллергии учитываем'},
  {icon:'sun',title:'Бассейн',desc:'Через день, открытый'},
  {icon:'shield-check',title:'Охрана',desc:'24/7, видеокамеры — и фото в Telegram каждый день'},
  {icon:'heart-pulse-fill',title:'Медицина',desc:'Медсестра круглосуточно на территории'},
  {icon:'phone',title:'Связь',desc:'Фото в чат каждый день, звонки по расписанию'},
];

/* ── BLOCK RENDERERS ── */
function icon(name){return `<i class="bi bi-${name}" aria-hidden="true"></i>`}

function mkEl(tag, css, html){
  const e=document.createElement(tag);
  if(css) e.style.cssText=css;
  if(html!=null) e.innerHTML=html;
  return e;
}

function blockSmeny(){
  const wrap=mkEl('div','width:100%;animation:blockIn .45s cubic-bezier(.16,1,.3,1) both,blockGlow .8s .2s ease-out both');
  const card=mkEl('div','background:#fff;border:1px solid rgba(13,27,42,.09);border-radius:20px;overflow:hidden;box-shadow:0 2px 16px rgba(13,27,42,.07)');

  // header
  const head=mkEl('div','padding:12px 16px;border-bottom:1px solid rgba(13,27,42,.07);display:flex;align-items:center;justify-content:space-between');
  head.innerHTML='<span style="font-size:13px;font-weight:600;color:rgba(13,27,42,.55);display:flex;align-items:center;gap:7px"><i class="bi bi-calendar-event" aria-hidden="true"></i>Смены лета 2026</span>'
    +'<span style="font-size:10px;font-weight:600;padding:3px 8px;border-radius:20px;background:rgba(236,124,0,.12);color:#ad5b00">Запись открыта</span>';
  card.appendChild(head);

  // 2-column grid
  const grid=mkEl('div','display:grid;grid-template-columns:1fr 1fr;gap:6px;padding:8px 8px 4px');

  SMENY.forEach((s,idx)=>{
    const free=s.total-s.occupied;
    const pct=Math.round(s.occupied/s.total*100);
    const isLast=free<=4;

    const sc=mkEl('div',
      'border-radius:12px;border:1px solid '+(s.popular?'rgba(236,124,0,.35)':isLast?'rgba(220,38,38,.2)':'rgba(13,27,42,.09)')
      +';background:'+(s.popular?'rgba(236,124,0,.04)':isLast?'rgba(220,38,38,.02)':'#f8fafb')
      +';padding:9px 10px 8px;transition:.18s;'+(s.available?'cursor:pointer':'opacity:.4;cursor:default')
      +';animation:smena-in .3s cubic-bezier(.16,1,.3,1) '+(idx*.05)+'s both;position:relative;overflow:hidden'
    );
    if(s.available) sc.onclick=openPopup;

    // popular/short badge
    if(s.popular){
      const pop=mkEl('div','display:inline-flex;align-items:center;gap:3px;background:#ec7c00;color:#fff;font-size:9px;font-weight:700;padding:1px 7px;border-radius:20px;margin-bottom:4px;width:fit-content');
      pop.innerHTML='<i class="bi bi-fire" aria-hidden="true"></i> Хит';
      sc.appendChild(pop);
    } else if(s.short){
      const sh=mkEl('div','display:inline-flex;align-items:center;gap:3px;background:rgba(29,111,224,.1);color:#1d6fe0;font-size:9px;font-weight:700;padding:1px 7px;border-radius:20px;margin-bottom:4px;width:fit-content');
      sh.textContent='Короткая';
      sc.appendChild(sh);
    } else {
      sc.appendChild(mkEl('div','height:16px;margin-bottom:4px')); // spacer
    }

    // name
    sc.appendChild(mkEl('div','font-size:16px;font-weight:800;color:#0d1a2b;line-height:1.2;margin-bottom:1px',s.n));
    // dates + days
    const datesEl=mkEl('div','font-size:14px;color:#4e6072;margin-bottom:6px;line-height:1.3');
    datesEl.innerHTML=s.dates+'<br>'+s.days;
    sc.appendChild(datesEl);

    // price
    if(s.available){
      sc.appendChild(mkEl('div','font-size:17px;font-weight:800;color:#ec7c00;letter-spacing:-.02em;margin-bottom:5px',s.price));
    } else {
      sc.appendChild(mkEl('div','font-size:10px;color:#dc2626;font-weight:600;margin-bottom:5px','мест нет'));
    }

    // progress bar
    if(s.available){
      const barWrap=mkEl('div','height:3px;border-radius:2px;background:rgba(13,27,42,.08);overflow:hidden;margin-bottom:3px;display:flex');
      const barTaken=mkEl('div','height:100%;background:rgba(13,27,42,.12);border-radius:2px 0 0 2px;width:0;transition:width 1s cubic-bezier(.16,1,.3,1)');
      const barFree=mkEl('div','height:100%;background:linear-gradient(90deg,'+(isLast?'#ef4444,#dc2626':'#22c55e,#16a34a')+');border-radius:0 2px 2px 0;width:0;transition:width 1s cubic-bezier(.16,1,.3,1)');
      barWrap.appendChild(barTaken);barWrap.appendChild(barFree);
      sc.appendChild(barWrap);

      const occRow=mkEl('div','display:flex;justify-content:space-between;font-size:11px');
      occRow.appendChild(mkEl('span','color:#7e9094',''+s.occupied+'/'+s.total));
      occRow.appendChild(mkEl('span',(isLast?'color:#dc2626':'color:#15803d')+';font-weight:700','свободно '+free));
      sc.appendChild(occRow);

      setTimeout(()=>{barTaken.style.width=pct+'%';barFree.style.width=(100-pct)+'%';},100+idx*50);
    }

    grid.appendChild(sc);
  });

  card.appendChild(grid);

  // CTA — иконка-кнопка бронирования (без текста)
  const ctaRow=mkEl('div','display:flex;align-items:center;gap:8px;padding:6px 8px 10px');
  const btn=mkEl('button','flex:1;padding:10px;background:linear-gradient(135deg,#ad5b00,#a34e00);border:none;border-radius:10px;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;box-shadow:0 3px 12px rgba(236,124,0,.3);transition:.18s;font-family:inherit;font-size:13px;font-weight:700');
  btn.innerHTML='<i class="bi bi-calendar-check" aria-hidden="true" style="font-size:18px"></i>';
  btn.title='Выбрать смену';
  btn.onmouseenter=()=>{btn.style.background='linear-gradient(135deg,#d96a00,#b85500)';btn.style.boxShadow='0 5px 18px rgba(236,124,0,.45)';};
  btn.onmouseleave=()=>{btn.style.background='linear-gradient(135deg,#ad5b00,#a34e00)';btn.style.boxShadow='0 3px 12px rgba(236,124,0,.3)';};
  btn.onclick=openPopup;
  ctaRow.appendChild(btn);
  card.appendChild(ctaRow);

  const foot=mkEl('div','padding:0 14px 10px;font-size:10px;color:rgba(13,27,42,.35);text-align:center','Налоговый вычет 13% · Место фиксируется на 48ч · <a href="/politika-vozvrata/" style="color:rgba(13,27,42,.5);text-decoration:underline">Гарантия возврата</a>');
  card.appendChild(foot);

  wrap.appendChild(card);
  return wrap;
}

// Цвета подобраны для WCAG AA на белом фоне (мин. 4.5:1)
const COURSE_PALETTE=[
  {color:'#1d6fe0',bg:'rgba(29,111,224,.07)',border:'rgba(29,111,224,.18)',shadow:'rgba(29,111,224,.1)',glow:'linear-gradient(135deg,rgba(29,111,224,.05),transparent)'},   // Python — blue 5.2:1
  {color:'#16a34a',bg:'rgba(22,163,74,.07)',border:'rgba(22,163,74,.18)',shadow:'rgba(22,163,74,.1)',glow:'linear-gradient(135deg,rgba(22,163,74,.05),transparent)'},       // Minecraft — green 4.5:1
  {color:'#be185d',bg:'rgba(190,24,93,.07)',border:'rgba(190,24,93,.18)',shadow:'rgba(190,24,93,.1)',glow:'linear-gradient(135deg,rgba(190,24,93,.05),transparent)'},       // Scratch — pink 5.3:1
  {color:'#6d28d9',bg:'rgba(109,40,217,.07)',border:'rgba(109,40,217,.18)',shadow:'rgba(109,40,217,.1)',glow:'linear-gradient(135deg,rgba(109,40,217,.05),transparent)'},   // Unity — purple 6.8:1
  {color:'#b91c1c',bg:'rgba(185,28,28,.07)',border:'rgba(185,28,28,.18)',shadow:'rgba(185,28,28,.1)',glow:'linear-gradient(135deg,rgba(185,28,28,.05),transparent)'},       // Cyber — red 5.2:1
  {color:'#b45309',bg:'rgba(180,83,9,.07)', border:'rgba(180,83,9,.18)', shadow:'rgba(180,83,9,.1)', glow:'linear-gradient(135deg,rgba(180,83,9,.05),transparent)'},        // AI — amber 5.1:1
];

function blockCourses(blockData){
  const age=blockData&&blockData.age?parseInt(blockData.age):null;
  const allWithIdx=COURSES.map((c,i)=>({...c,_pi:i}));
  const filtered=age?allWithIdx.filter(c=>age>=c.minAge&&age<=c.maxAge):allWithIdx;
  const label=filtered.length<COURSES.length
    ?(filtered.length+' подходит по возрасту')
    :(COURSES.length+' направлений');

  const wrap=mkEl('div','width:100%;animation:blockSlide .45s cubic-bezier(.16,1,.3,1) both,blockGlow .8s .2s ease-out both');
  const card=mkEl('div','background:#fff;border:1px solid rgba(13,27,42,.09);border-radius:20px;overflow:hidden;box-shadow:0 2px 16px rgba(13,27,42,.07)');

  // header
  const head=mkEl('div','padding:13px 18px;border-bottom:1px solid rgba(13,27,42,.07);display:flex;align-items:center;justify-content:space-between');
  head.innerHTML='<span style="font-size:13px;font-weight:600;color:rgba(13,27,42,.55);display:flex;align-items:center;gap:8px"><i class="bi bi-laptop" aria-hidden="true"></i>IT-направления в лагере</span>'
    +'<span style="font-size:10px;font-weight:600;padding:3px 9px;border-radius:20px;background:rgba(236,124,0,.12);color:#ad5b00">'+label+'</span>';
  card.appendChild(head);

  // grid
  const isSingle=filtered.length===1;
  const grid=mkEl('div','display:grid;grid-template-columns:'+(isSingle?'1fr':'1fr 1fr')+';gap:6px;padding:8px');
  grid.className='courses-grid-inner';

  filtered.forEach((c,idx)=>{
    const p=COURSE_PALETTE[c._pi]||COURSE_PALETTE[0];
    const tile=mkEl('div',
      'position:relative;border-radius:12px;padding:10px 12px;cursor:pointer;'
      +'border:1px solid '+p.border+';background:'+p.bg+';'
      +'display:flex;flex-direction:column;gap:6px;overflow:hidden;'
      +'animation:tile-in .3s cubic-bezier(.16,1,.3,1) '+(0.04+idx*0.05)+'s both;'
      +'transition:transform .2s,box-shadow .2s'
    );
    tile.onmouseenter=()=>{tile.style.transform='translateY(-2px)';tile.style.boxShadow='0 8px 20px '+p.shadow;};
    tile.onmouseleave=()=>{tile.style.transform='';tile.style.boxShadow='';};
    tile.onclick=()=>go('Расскажи подробнее про '+c.name);

    // icon + name row (compact: icon inline with name)
    const topRow=mkEl('div','display:flex;align-items:center;gap:8px');
    const iconBox=mkEl('div',
      'width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;'
      +'background:'+p.bg+';border:1px solid '+p.border
    );
    iconBox.innerHTML='<i class="bi bi-'+c.icon+'" aria-hidden="true" style="font-size:16px;color:'+p.color+'"></i>';
    const nameWrap=mkEl('div','flex:1;min-width:0');
    nameWrap.appendChild(mkEl('div','font-size:13px;font-weight:800;color:#0d1a2b;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis',c.name));
    const ageBadge=mkEl('div',
      'display:inline-block;margin-top:2px;font-size:10px;font-weight:700;'
      +'color:'+p.color+';background:'+p.bg+';padding:1px 7px;border-radius:20px',
      c.age
    );
    nameWrap.appendChild(ageBadge);
    topRow.appendChild(iconBox);
    topRow.appendChild(nameWrap);
    tile.appendChild(topRow);

    // hook (shorter, no result badge to save space)
    tile.appendChild(mkEl('div','font-size:11.5px;color:#4e6072;line-height:1.5',c.campHook));

    grid.appendChild(tile);
  });

  card.appendChild(grid);

  // "all courses" link
  if(filtered.length<COURSES.length){
    const more=mkEl('div',
      'padding:10px 18px 12px;font-size:12px;color:#7e9094;'
      +'text-align:center;cursor:pointer;border-top:1px solid rgba(13,27,42,.06);'
      +'display:flex;align-items:center;justify-content:center;gap:5px;transition:color .15s'
    );
    more.innerHTML='<i class="bi bi-grid" aria-hidden="true" style="font-size:11px"></i> Все '+COURSES.length+' направления';
    more.onmouseenter=()=>{more.style.color='#ec7c00';};
    more.onmouseleave=()=>{more.style.color='';};
    more.onclick=()=>go('Какие ещё есть направления?');
    card.appendChild(more);
  }

  wrap.appendChild(card);
  return wrap;
}

function blockDay(){
  const wrap=mkEl('div','width:100%;animation:blockFade .5s ease-out both');
  const card=mkEl('div','background:#fff;border:1px solid rgba(13,27,42,.09);border-radius:20px;overflow:hidden;box-shadow:0 2px 16px rgba(13,27,42,.07)');
  const head=mkEl('div','padding:13px 18px;border-bottom:1px solid rgba(13,27,42,.07)');
  head.innerHTML='<span style="font-size:13px;font-weight:600;color:rgba(13,27,42,.55);display:flex;align-items:center;gap:8px"><i class="bi bi-clock" aria-hidden="true"></i>Распорядок дня</span>';
  card.appendChild(head);
  const list=mkEl('div','padding:8px 0');
  DAY.forEach((r,idx)=>{
    const row=mkEl('div','padding:9px 18px;display:flex;gap:14px;align-items:flex-start'+(idx<DAY.length-1?';border-bottom:1px solid rgba(13,27,42,.06)':''));
    row.appendChild(mkEl('span','font-family:JetBrains Mono,monospace;font-size:12px;color:#ec7c00;min-width:46px;margin-top:2px;flex-shrink:0',r.t));
    const txt=mkEl('span','font-size:14px;color:#4e6072;line-height:1.55');
    txt.innerHTML=r.txt;
    row.appendChild(txt);
    list.appendChild(row);
  });
  card.appendChild(list);
  const foot=mkEl('div','padding:8px 14px 12px;font-size:11px;color:rgba(13,27,42,.35);text-align:center;border-top:1px solid rgba(13,27,42,.06)','Последние 2 дня — хакатон: командный проект + защита');
  card.appendChild(foot);
  wrap.appendChild(card);return wrap;
}

function blockCond(){
  const wrap=mkEl('div','width:100%;animation:blockSlide .45s cubic-bezier(.16,1,.3,1) both,blockGlow .8s .2s ease-out both');
  const card=mkEl('div','background:#fff;border:1px solid rgba(13,27,42,.09);border-radius:20px;overflow:hidden;box-shadow:0 2px 16px rgba(13,27,42,.07)');
  const head=mkEl('div','padding:13px 18px;border-bottom:1px solid rgba(13,27,42,.07)');
  head.innerHTML='<span style="font-size:13px;font-weight:600;color:rgba(13,27,42,.55);display:flex;align-items:center;gap:8px"><i class="bi bi-houses" aria-hidden="true"></i>Условия в лагере</span>';
  card.appendChild(head);
  const grid=mkEl('div','display:grid;grid-template-columns:1fr 1fr;gap:1px;background:rgba(13,27,42,.07)');
  COND.forEach(c=>{
    const cell=mkEl('div','background:#f8fafb;padding:14px 16px;display:flex;gap:10px;align-items:flex-start');
    const iconEl=mkEl('span','font-size:20px;flex-shrink:0;color:#ec7c00');
    iconEl.innerHTML='<i class="bi bi-'+c.icon+'" aria-hidden="true"></i>';
    const tw=mkEl('div','');
    tw.appendChild(mkEl('div','font-size:13px;font-weight:600;color:#0d1a2b;margin-bottom:3px',c.title));
    tw.appendChild(mkEl('div','font-size:11px;color:#4e6072;line-height:1.45',c.desc));
    cell.appendChild(iconEl);cell.appendChild(tw);grid.appendChild(cell);
  });
  card.appendChild(grid);wrap.appendChild(card);return wrap;
}

function blockLocation(){
  const wrap=mkEl('div','width:100%;animation:blockFade .5s ease-out both');
  const card=mkEl('div','background:#fff;border:1px solid rgba(13,27,42,.09);border-radius:20px;overflow:hidden;box-shadow:0 2px 16px rgba(13,27,42,.07)');
  const head=mkEl('div','padding:13px 18px;border-bottom:1px solid rgba(13,27,42,.07)');
  head.innerHTML='<span style="font-size:13px;font-weight:600;color:rgba(13,27,42,.55);display:flex;align-items:center;gap:8px"><i class="bi bi-geo-alt-fill" aria-hidden="true"></i>Как добраться</span>';
  card.appendChild(head);
  const body=mkEl('div','padding:16px 18px;display:flex;flex-direction:column;gap:12px');
  [{icon:'geo-alt-fill',label:'Адрес',val:'Санаторий Изумруд, Наро-Фоминский р-н'},{icon:'arrow-right',label:'От Москвы',val:'66 км по Киевскому шоссе, ~1 час'},{icon:'bus-front',label:'Трансфер',val:'Автобус от м. Солнцево — входит в цену'}].forEach(loc=>{
    const row=mkEl('div','display:flex;gap:12px;align-items:flex-start');
    const iconEl=mkEl('span','font-size:16px;flex-shrink:0;margin-top:2px;color:#ec7c00');
    iconEl.innerHTML='<i class="bi bi-'+loc.icon+'" aria-hidden="true"></i>';
    const tw=mkEl('div','');
    tw.appendChild(mkEl('div','font-size:12px;color:#7e9094;margin-bottom:2px',loc.label));
    tw.appendChild(mkEl('div','font-size:14px;font-weight:600;color:#0d1a2b',loc.val));
    row.appendChild(iconEl);row.appendChild(tw);body.appendChild(row);
  });
  card.appendChild(body);
  const mapBtn=mkEl('div','background:rgba(13,27,42,.04);border-radius:10px;height:90px;display:flex;align-items:center;justify-content:center;font-size:13px;color:#7e9094;cursor:pointer;transition:.15s;border:1px solid rgba(13,27,42,.08);margin:0 18px 14px;gap:8px');
  mapBtn.innerHTML='<i class="bi bi-map" aria-hidden="true"></i> 55.265643, 36.724185 → открыть в Яндекс.Картах';
  mapBtn.onmouseenter=()=>{mapBtn.style.background='rgba(13,27,42,.07)';mapBtn.style.color='#4e6072';};
  mapBtn.onmouseleave=()=>{mapBtn.style.background='rgba(13,27,42,.04)';mapBtn.style.color='#7e9094';};
  mapBtn.onclick=()=>window.open('https://yandex.ru/maps/?ll=36.724185,55.265643&z=14','_blank');
  card.appendChild(mapBtn);wrap.appendChild(card);return wrap;
}

function blockPrices(){
  const wrap=mkEl('div','width:100%;animation:blockPop .4s cubic-bezier(.16,1,.3,1) both,blockGlow .8s .2s ease-out both');
  const card=mkEl('div','background:#fff;border:1px solid rgba(13,27,42,.09);border-radius:20px;overflow:hidden;box-shadow:0 2px 16px rgba(13,27,42,.07)');
  const head=mkEl('div','padding:13px 18px;border-bottom:1px solid rgba(13,27,42,.07)');
  head.innerHTML='<span style="font-size:13px;font-weight:600;color:rgba(13,27,42,.55);display:flex;align-items:center;gap:8px"><i class="bi bi-tag" aria-hidden="true"></i>Стоимость смен</span>';
  card.appendChild(head);
  const tabs=[
    {label:'10 дней',price:'74 900 ₽',sub:'за смену · Смена 4 (август)',inc:['Всё включено (проживание, питание, IT, трансфер)','Хакатон в последние 2 дня','Сертификат по итогам'],cb:'Налоговый вычет 13% — вернёте до <strong>4 800 ₽</strong> через ФНС'},
    {label:'13 дней',price:'89 400 ₽',sub:'за смену · Смена 3 (август)',inc:['Полная программа — 13 дней','Всё включено + хакатон','Дети успевают подружиться по-настоящему'],cb:'Налоговый вычет 13% — вернёте до <strong>5 200 ₽</strong> через ФНС'},
  ];
  const tabRow=mkEl('div','display:flex;gap:1px;background:rgba(13,27,42,.07)');
  const bodies=[];
  tabs.forEach((tab,i)=>{
    const tabEl=mkEl('div','flex:1;padding:10px;text-align:center;font-size:13px;font-weight:600;cursor:pointer;transition:.15s;background:'+(i===0?'rgba(236,124,0,.08)':'#f8fafb')+';color:'+(i===0?'#ad5b00':'#7e9094'));
    tabEl.textContent=tab.label;
    const body=mkEl('div','padding:14px 18px;'+(i===0?'display:block':'display:none'));
    body.appendChild(mkEl('div','font-size:28px;font-weight:800;color:#0d1a2b;margin-bottom:4px',tab.price));
    body.appendChild(mkEl('div','font-size:13px;color:#4e6072',tab.sub));
    const items=mkEl('div','margin-top:12px;display:flex;flex-direction:column;gap:6px');
    tab.inc.forEach(s=>{const it=mkEl('div','font-size:13px;color:#4e6072;display:flex;gap:8px');it.innerHTML='<span style="color:var(--color-primary);flex-shrink:0">✓</span>'+s;items.appendChild(it);});
    body.appendChild(items);
    const cb=mkEl('div','background:rgba(34,197,94,.08);border:1px solid rgba(34,197,94,.2);border-radius:8px;padding:9px 12px;font-size:12px;color:#15803d;margin-top:12px;line-height:1.5');
    cb.innerHTML=tab.cb;body.appendChild(cb);
    tabEl.onclick=()=>{
      [...tabRow.children].forEach((t,j)=>{
        t.style.background=j===i?'rgba(236,124,0,.08)':'#f8fafb';
        t.style.color=j===i?'#ad5b00':'#7e9094';
      });
      bodies.forEach((b,j)=>{b.style.display=j===i?'block':'none';});
    };
    tabRow.appendChild(tabEl);bodies.push(body);
  });
  card.appendChild(tabRow);bodies.forEach(b=>card.appendChild(b));
  const btn=mkEl('button','margin:4px 12px 12px;padding:14px;background:linear-gradient(135deg,#ad5b00,#a34e00);border:none;border-radius:12px;font-family:inherit;font-size:16px;font-weight:700;color:#fff;cursor:pointer;width:calc(100% - 24px);display:block;box-shadow:0 4px 14px rgba(236,124,0,.35)','Выбрать и забронировать →');
  btn.onclick=openPopup;card.appendChild(btn);wrap.appendChild(card);return wrap;
}

function blockTaxCalculator(){
  // Смены: [название, цена, дней]
  const SHIFTS=[
    ['Смена 4 — 17–26 авг, 10 дней', 74900, 10],
    ['Смена 3 — 3–15 авг, 13 дней', 89400, 13],
    ['Смена 1 (завершена) — 30 мая–8 июн, 10 дней', 85900, 10],
    ['Смена 2 (завершена) — 10–23 июн, 14 дней', 99000, 14],
    ['Смена 2.1 (завершена) — 10–16 июн, 7 дней', 48000, 7],
    ['Смена 2.2 (завершена) — 16–23 июн, 8 дней', 75000, 8],
  ];
  const RESIDENTIAL_PER_DAY=3800;
  const EDU_LIMIT=110000;
  function calc(price,days){
    const res=RESIDENTIAL_PER_DAY*days;
    const edu=price-res;
    const base=Math.min(edu,EDU_LIMIT);
    return Math.round(base*0.13/100)*100;
  }
  const wrap=mkEl('div','width:100%;animation:blockPop .4s cubic-bezier(.16,1,.3,1) both,blockGlow .8s .2s ease-out both');
  const card=mkEl('div','background:#fff;border:1px solid rgba(13,27,42,.09);border-radius:20px;overflow:hidden;box-shadow:0 2px 16px rgba(13,27,42,.07)');
  // Header
  const head=mkEl('div','padding:13px 18px;border-bottom:1px solid rgba(13,27,42,.07);display:flex;align-items:center;gap:8px');
  head.innerHTML='<i class="bi bi-receipt" aria-hidden="true" style="font-size:15px;color:rgba(13,27,42,.45)"></i>'
    +'<span style="font-size:13px;font-weight:600;color:rgba(13,27,42,.55)">Налоговый вычет 13%</span>';
  card.appendChild(head);
  const body=mkEl('div','padding:14px 16px 16px;display:flex;flex-direction:column;gap:12px');
  // Selector
  const lbl=mkEl('label','font-size:13px;color:#4e6072;font-weight:500');
  lbl.textContent='Выберите смену:';
  body.appendChild(lbl);
  const sel=document.createElement('select');
  sel.style.cssText='width:100%;border:1px solid rgba(13,27,42,.15);border-radius:10px;padding:10px 12px;font-size:14px;font-family:inherit;color:#0d1a2b;background:#f9fafb;-webkit-appearance:none;cursor:pointer';
  SHIFTS.forEach(([name,price,days],i)=>{
    const opt=document.createElement('option');
    opt.value=i; opt.textContent=name;
    if(i===1) opt.selected=true;
    sel.appendChild(opt);
  });
  body.appendChild(sel);
  // Result card
  const resCard=mkEl('div','background:linear-gradient(135deg,rgba(236,124,0,.07),rgba(236,124,0,.03));border:1px solid rgba(236,124,0,.2);border-radius:12px;padding:12px 16px;display:flex;align-items:center;justify-content:space-between;gap:8px');
  const resLabel=mkEl('div','');
  resLabel.innerHTML='<div style="font-size:12px;color:#7e9094;margin-bottom:2px">Ориентировочный возврат</div>'
    +'<div style="font-size:11px;color:#9aaabb">через ФНС (НДФЛ 13%)</div>';
  const resNum=mkEl('div','font-size:28px;font-weight:800;color:#ad5b00;line-height:1;tabular-nums');
  function updateResult(){
    const i=parseInt(sel.value)||0;
    const [,price,days]=SHIFTS[i];
    const amount=calc(price,days);
    resNum.textContent='~'+amount.toLocaleString('ru-RU')+' ₽';
  }
  updateResult();
  sel.onchange=updateResult;
  resCard.appendChild(resLabel); resCard.appendChild(resNum);
  body.appendChild(resCard);
  // Note
  const note=mkEl('div','font-size:11px;color:#9aaabb;line-height:1.5');
  note.textContent='* Расчёт ориентировочный. Точная сумма зависит от вашего дохода и уже использованных вычетов в этом году. Лимит НК РФ — 110 000 ₽ на обучение.';
  body.appendChild(note);
  // CTA
  const btn=mkEl('button','padding:12px 16px;background:linear-gradient(135deg,#ad5b00,#a34e00);border:none;border-radius:12px;font-family:inherit;font-size:15px;font-weight:700;color:#fff;cursor:pointer;width:100%;display:block;box-shadow:0 4px 14px rgba(236,124,0,.3)','Забронировать и вернуть вычет →');
  btn.onclick=openPopup;
  body.appendChild(btn);
  card.appendChild(body);
  wrap.appendChild(card);
  return wrap;
}

/* ── NEW VISUAL BLOCKS ── */

function blockOccupancyChart(){
  const wrap=mkEl('div','width:100%;animation:blockIn .45s cubic-bezier(.16,1,.3,1) both,blockGlow .8s .2s ease-out both');
  const card=mkEl('div','background:#fff;border:1px solid rgba(13,27,42,.09);border-radius:20px;overflow:hidden;box-shadow:0 2px 16px rgba(13,27,42,.07)');
  const head=mkEl('div','padding:13px 18px;border-bottom:1px solid rgba(13,27,42,.07);display:flex;align-items:center;justify-content:space-between');
  head.innerHTML='<span style="font-size:13px;font-weight:600;color:rgba(13,27,42,.55);display:flex;align-items:center;gap:8px"><i class="bi bi-bar-chart-fill" aria-hidden="true" style="color:rgba(13,27,42,.55)"></i>Наполненность смен</span>'
    +'<span style="font-size:10px;font-weight:600;padding:3px 9px;border-radius:20px;background:rgba(34,197,94,.15);color:#15803d">Актуально</span>';
  card.appendChild(head);
  const body=mkEl('div','padding:14px 16px 8px;display:flex;flex-direction:column;gap:14px');
  SMENY.forEach((s,idx)=>{
    const pct=Math.round(s.occupied/s.total*100);
    const free=s.total-s.occupied;
    const isRed=pct>=90,isYel=pct>=65&&!isRed;
    const clr=isRed?'#f87171':isYel?'#fbbf24':'#4ade80';
    const bg=isRed?'rgba(248,113,113,.12)':isYel?'rgba(251,191,36,.12)':'rgba(34,197,94,.12)';
    const grad=isRed?'linear-gradient(90deg,#f87171,#ef4444)':isYel?'linear-gradient(90deg,#fbbf24,#f59e0b)':'linear-gradient(90deg,#4ade80,#22c55e)';
    const row=mkEl('div','');
    const top=mkEl('div','display:flex;justify-content:space-between;align-items:center;margin-bottom:6px');
    const nm=mkEl('div','');
    nm.appendChild(mkEl('span','font-size:14px;font-weight:700;color:#0d1a2b',s.n));
    nm.appendChild(mkEl('span','font-size:12px;color:#7e9094;margin-left:8px',s.dates));
    top.appendChild(nm);
    top.appendChild(mkEl('span','font-size:11px;font-weight:700;padding:3px 9px;border-radius:20px;background:'+bg+';color:'+clr,s.available?free+' свободно':'Завершена'));
    row.appendChild(top);
    const barWrap=mkEl('div','height:10px;border-radius:5px;background:rgba(13,27,42,.07);overflow:hidden;margin-bottom:4px');
    const fill=mkEl('div','height:100%;border-radius:5px;width:0;transition:width 1.1s '+(0.08+idx*.12)+'s cubic-bezier(.34,1.56,.64,1);background:'+grad);
    barWrap.appendChild(fill);row.appendChild(barWrap);
    const sub=mkEl('div','display:flex;justify-content:space-between;font-size:11px;color:#9aaabb');
    sub.appendChild(mkEl('span','','занято '+s.occupied+' из '+s.total));
    sub.appendChild(mkEl('span','',pct+'%'));
    row.appendChild(sub);body.appendChild(row);
    setTimeout(()=>{fill.style.width=pct+'%';},100+idx*60);
  });
  card.appendChild(body);
  const btn=mkEl('button','margin:8px 12px 12px;padding:14px;background:linear-gradient(135deg,#ad5b00,#a34e00);border:none;border-radius:12px;font-family:inherit;font-size:16px;font-weight:700;color:#fff;cursor:pointer;width:calc(100% - 24px);display:block;box-shadow:0 4px 14px rgba(236,124,0,.35)','Занять место сейчас →');
  btn.onclick=openPopup;card.appendChild(btn);wrap.appendChild(card);return wrap;
}

function blockPhotoCarousel(){
  const wrap=mkEl('div','width:100%;animation:blockFade .5s ease-out both');
  const card=mkEl('div','background:#fff;border:1px solid rgba(13,27,42,.09);border-radius:20px;overflow:hidden;box-shadow:0 2px 16px rgba(13,27,42,.07)');
  const head=mkEl('div','padding:13px 18px;border-bottom:1px solid rgba(13,27,42,.07);display:flex;align-items:center;justify-content:space-between');
  head.innerHTML='<span style="font-size:13px;font-weight:600;color:rgba(13,27,42,.55);display:flex;align-items:center;gap:8px"><i class="bi bi-camera-fill" aria-hidden="true"></i>Фото с прошлых смен</span>'
    +'<span style="font-size:10px;font-weight:600;padding:3px 9px;border-radius:20px;background:rgba(96,165,250,.15);color:#2563eb">Лето 2025</span>';
  card.appendChild(head);
  const scenes=[
    {label:'IT-занятие',sub:'Python и Scratch — пишем настоящий код',bg:'linear-gradient(135deg,#1e3a5f 0%,#0f2040 100%)',icon:'laptop'},
    {label:'Бассейн через день',sub:'После занятий — открытый бассейн',bg:'linear-gradient(135deg,#0a3a2e 0%,#051a14 100%)',icon:'droplet'},
    {label:'Финальный хакатон',sub:'Командная защита проектов + дипломы',bg:'linear-gradient(135deg,#3a1e00 0%,#1a0d00 100%)',icon:'trophy-fill'},
    {label:'Вечерняя программа',sub:'Квесты, кино, мастер-классы — каждый день',bg:'linear-gradient(135deg,#2a1a50 0%,#110b25 100%)',icon:'star-fill'},
    {label:'Проживание',sub:'Корпуса по 2–4 чел., WiFi, своя комната',bg:'linear-gradient(135deg,#1a2e1a 0%,#0a150a 100%)',icon:'house-door'},
  ];
  let cur=0;
  const viewport=mkEl('div','overflow:hidden;position:relative');
  const track=mkEl('div','display:flex;transition:transform .45s cubic-bezier(.16,1,.3,1)');
  scenes.forEach(sc=>{
    const slide=mkEl('div','min-width:100%;height:160px;background:'+sc.bg+';display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;flex-shrink:0');
    const ic=mkEl('div','font-size:34px;opacity:.65');
    ic.innerHTML='<i class="bi bi-'+sc.icon+'" aria-hidden="true" style="color:var(--color-primary)"></i>';
    slide.appendChild(ic);
    slide.appendChild(mkEl('div','font-size:15px;font-weight:800;color:#fff',sc.label));
    slide.appendChild(mkEl('div','font-size:12px;color:rgba(255,255,255,.5)',sc.sub));
    track.appendChild(slide);
  });
  viewport.appendChild(track);card.appendChild(viewport);
  const nav=mkEl('div','display:flex;align-items:center;justify-content:center;gap:12px;padding:10px 16px');
  const prevBtn=mkEl('button','width:30px;height:30px;border-radius:50%;background:rgba(13,27,42,.05);border:1px solid rgba(13,27,42,.12);color:rgba(13,27,42,.5);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:12px');
  prevBtn.innerHTML='<i class="bi bi-chevron-left" aria-hidden="true"></i>';
  const dots=mkEl('div','display:flex;gap:6px;align-items:center');
  const dotEls=scenes.map((_,i)=>{
    const d=mkEl('div',(i===0?'width:16px':'width:6px')+';height:6px;border-radius:3px;background:'+(i===0?'#ec7c00':'rgba(13,27,42,.15)')+';transition:all .3s');
    dots.appendChild(d);return d;
  });
  const nextBtn=mkEl('button','width:30px;height:30px;border-radius:50%;background:rgba(13,27,42,.05);border:1px solid rgba(13,27,42,.12);color:rgba(13,27,42,.5);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:12px');
  nextBtn.innerHTML='<i class="bi bi-chevron-right" aria-hidden="true"></i>';
  function goTo(idx){
    cur=(idx+scenes.length)%scenes.length;
    track.style.transform='translateX(-'+cur*100+'%)';
    dotEls.forEach((d,i)=>{d.style.width=i===cur?'16px':'6px';d.style.background=i===cur?'#ec7c00':'rgba(13,27,42,.15)';});
  }
  prevBtn.onclick=()=>goTo(cur-1);nextBtn.onclick=()=>goTo(cur+1);
  let auto=setInterval(()=>goTo(cur+1),3500);
  viewport.onmouseenter=()=>clearInterval(auto);
  viewport.onmouseleave=()=>{auto=setInterval(()=>goTo(cur+1),3500);};
  nav.appendChild(prevBtn);nav.appendChild(dots);nav.appendChild(nextBtn);
  card.appendChild(nav);
  card.appendChild(mkEl('div','padding:0 16px 12px;font-size:11px;color:rgba(13,27,42,.35);text-align:center','9000+ фото в архиве · ежедневно публикуем в Telegram-канале смены'));
  wrap.appendChild(card);return wrap;
}

// Вертикальные видео (9:16, снятые на телефон)
const VERTICAL_VIDS=new Set(['naDfzrei9duApz3AnaencH','tJAaAnvCYYJ5vRz7uyUepj','eTmCgZHcwhcWQQs3HLCz1S','s1SCYKqLx6C94fMRumitHF','wSsd3WTG8RWRFwg2usdpJC','wUhdcJ5RmsxpxKGu7DhtZH','g2S7xxtEUP4S2E3WXYFNqZ','2ULnxEqqC4ssLNYCh5YPvo']);
// Подписи к видео
const VIDEO_SUBS={'qmLxu2S7uaS44CKkhoV1Jj':'Основатель Дарья Афанасьева — о программе лагеря','tJAaAnvCYYJ5vRz7uyUepj':'Что меняется за неделю — рассказывает Дарья','naDfzrei9duApz3AnaencH':'Первые дни в лагере: от «не хочу» до «хочу ещё»','eTmCgZHcwhcWQQs3HLCz1S':'Как дети сами отказываются от телефона за 3 дня','s1SCYKqLx6C94fMRumitHF':'Внутренняя экономика лагеря: зарабатывают и тратят','wSsd3WTG8RWRFwg2usdpJC':'Внутренние монеты и мотивация — как это работает','wUhdcJ5RmsxpxKGu7DhtZH':'Обзор лагеря: территория, корпуса, жизнь смены','g2S7xxtEUP4S2E3WXYFNqZ':'Проект участника — своя ферма на Scratch/Python','2ULnxEqqC4ssLNYCh5YPvo':'Проект участника — программирование дронов','iFCF2uprpHLxx9VgJ1M7SP':'Проект участника — игра на Unity'};

function blockVideoPlayer(blockData){
  const vid=(blockData&&blockData.video_id)||'qmLxu2S7uaS44CKkhoV1Jj';
  const title=(blockData&&blockData.title)||'О лагере за 2 минуты';
  const isVertical=VERTICAL_VIDS.has(vid);
  const subtitle=VIDEO_SUBS[vid]||'АйДаКемп — видео из жизни лагеря';
  const wrap=mkEl('div','width:100%;animation:blockFade .5s ease-out both');
  const card=mkEl('div','background:#fff;border:1px solid rgba(13,27,42,.09);border-radius:20px;overflow:hidden;box-shadow:0 2px 16px rgba(13,27,42,.07)');
  const head=mkEl('div','padding:13px 18px;border-bottom:1px solid rgba(13,27,42,.07);display:flex;align-items:center;justify-content:space-between');
  head.innerHTML='<span style="font-size:13px;font-weight:600;color:rgba(13,27,42,.55);display:flex;align-items:center;gap:8px"><i class="bi bi-camera-video-fill" aria-hidden="true"></i>'+title+'</span>'
    +'<span style="font-size:10px;font-weight:600;padding:3px 9px;border-radius:20px;background:rgba(248,113,113,.12);color:#dc2626">Видео</span>';
  card.appendChild(head);

  // Контейнер: для вертикальных — центрируем и ограничиваем ширину
  const posterWrap=mkEl('div',isVertical?'display:flex;justify-content:center;background:#0d1a2b;padding:0':'');
  const posterCss=isVertical
    ? 'cursor:pointer;overflow:hidden;background:linear-gradient(135deg,#1a2a3a,#0d1a2b);width:min(280px,100%);aspect-ratio:9/16;position:relative'
    : 'cursor:pointer;overflow:hidden;background:linear-gradient(135deg,#e8edf4,#dee5ef)';
  const poster=mkEl('div',posterCss);
  const pi=mkEl('div','width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px'+(isVertical?';min-height:300px':''));
  if(!isVertical)pi.style.height='200px';
  const pb=mkEl('div','width:62px;height:62px;border-radius:50%;background:rgba(236,124,0,.9);display:flex;align-items:center;justify-content:center;box-shadow:0 0 32px rgba(236,124,0,.4);transition:.2s');
  pb.innerHTML='<i class="bi bi-play-fill" aria-hidden="true" style="font-size:26px;color:#fff;margin-left:3px"></i>';
  const hintColor=isVertical?'rgba(255,255,255,.6)':'#4e6072';
  pi.appendChild(pb);pi.appendChild(mkEl('div','font-size:13px;color:'+hintColor,'Нажмите для воспроизведения'));
  poster.appendChild(pi);
  poster.onmouseenter=()=>{pb.style.transform='scale(1.08)';pb.style.background='rgba(236,124,0,1)';};
  poster.onmouseleave=()=>{pb.style.transform='';pb.style.background='rgba(236,124,0,.9)';};
  poster.onclick=()=>{
    poster.innerHTML='';
    const iframe=document.createElement('iframe');
    iframe.src='https://kinescope.io/embed/'+vid;
    if(isVertical){
      iframe.style.cssText='width:100%;height:100%;border:none;display:block;position:absolute;top:0;left:0';
      poster.style.position='relative';
    } else {
      iframe.style.cssText='width:100%;height:260px;border:none;display:block';
    }
    iframe.allow='autoplay;fullscreen';iframe.setAttribute('allowfullscreen','');
    poster.appendChild(iframe);
    poster.style.cursor='default';poster.onmouseenter=null;poster.onmouseleave=null;poster.onclick=null;
  };
  posterWrap.appendChild(poster);
  card.appendChild(posterWrap);
  card.appendChild(mkEl('div','padding:8px 16px 12px;font-size:11px;color:rgba(13,27,42,.35);text-align:center',subtitle));
  wrap.appendChild(card);return wrap;
}

function blockGallery(blockData){
  const photos=(blockData&&blockData.photos)||[];
  if(!photos.length)return null;
  const wrap=mkEl('div','width:100%;animation:blockFade .5s ease-out both');
  const card=mkEl('div','background:#fff;border:1px solid rgba(13,27,42,.09);border-radius:20px;overflow:hidden;box-shadow:0 2px 16px rgba(13,27,42,.07)');
  const head=mkEl('div','padding:13px 18px;border-bottom:1px solid rgba(13,27,42,.07);display:flex;align-items:center;gap:8px');
  head.innerHTML='<i class="bi bi-camera-fill" aria-hidden="true" style="color:rgba(13,27,42,.4);font-size:13px"></i>'
    +'<span style="font-size:13px;font-weight:600;color:rgba(13,27,42,.55)">Фото из лагеря</span>';
  card.appendChild(head);
  const grid=mkEl('div','display:grid;grid-template-columns:repeat('+Math.min(photos.length,3)+',1fr);gap:2px');
  photos.forEach(p=>{
    const img=document.createElement('img');
    img.src=p.url;
    img.alt=p.caption||'';
    img.title=p.caption||'';
    img.loading='lazy';
    img.style.cssText='width:100%;height:130px;object-fit:cover;display:block;cursor:pointer;transition:opacity .2s';
    img.onmouseenter=()=>{img.style.opacity='.85';};
    img.onmouseleave=()=>{img.style.opacity='1';};
    img.onclick=()=>{ openLb(p.url, p.caption); };
    grid.appendChild(img);
  });
  card.appendChild(grid);
  wrap.appendChild(card);return wrap;
}

function blockYoutubeComment(){
  const wrap=mkEl('div','width:100%;animation:blockFade .6s ease-out both');
  // Карточка стилизована под YouTube-комментарий
  const card=mkEl('div',`
    background:var(--surface-1);
    border:1px solid var(--border);
    border-radius:16px;
    overflow:hidden;
    box-shadow:0 2px 16px rgba(13,27,42,.06);
    position:relative;
  `);

  // Шапка — «Комментарий на YouTube»
  const head=mkEl('div',`
    padding:10px 14px 8px;
    border-bottom:1px solid var(--border-soft);
    display:flex;align-items:center;gap:7px;
  `);
  head.innerHTML=`
    <svg width="14" height="14" viewBox="0 0 24 24" fill="#ff0000" style="flex-shrink:0">
      <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1C24 15.9 24 12 24 12s0-3.9-.5-5.8z"/>
      <polygon points="9.6,15.6 15.8,12 9.6,8.4" fill="white"/>
    </svg>
    <span style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.04em">Комментарий с YouTube</span>
  `;
  card.appendChild(head);

  // Тело комментария
  const body=mkEl('div','padding:14px 14px 12px;display:flex;gap:10px;align-items:flex-start');

  // Аватар
  const avatar=mkEl('div',`
    width:32px;height:32px;border-radius:50%;
    background:linear-gradient(135deg,#d93025,#b91c1c);
    display:flex;align-items:center;justify-content:center;
    font-size:14px;font-weight:700;color:#fff;
    flex-shrink:0;font-family:Arial,sans-serif;
  `);
  avatar.textContent='A';
  body.appendChild(avatar);

  const right=mkEl('div','flex:1;min-width:0');

  // Имя + дата
  const meta=mkEl('div','display:flex;align-items:baseline;gap:7px;margin-bottom:4px');
  const name=mkEl('span','font-size:12px;font-weight:700;color:var(--text-secondary)');
  name.textContent='@AntonPatrakov';
  const date=mkEl('span','font-size:11px;color:var(--text-muted)');
  date.textContent='2 месяца назад';
  meta.appendChild(name);
  meta.appendChild(date);
  right.appendChild(meta);

  // Текст комментария
  const text=mkEl('div',`
    font-size:14px;line-height:1.5;
    color:var(--text-primary);
    font-style:italic;
    margin-bottom:10px;
  `);
  text.textContent='"мне 21, херачу на заводе, но всё равно хочу к вам в лагерь"';
  right.appendChild(text);

  // Лайки
  const likes=mkEl('div','display:flex;align-items:center;gap:4px;margin-bottom:10px');
  likes.innerHTML=`
    <i class="bi bi-hand-thumbs-up-fill" aria-hidden="true" style="font-size:12px;color:var(--text-muted)"></i>
    <span style="font-size:12px;color:var(--text-muted)">1</span>
  `;
  right.appendChild(likes);

  // Кнопка посмотреть видео
  const btn=document.createElement('a');
  btn.href='https://youtube.com/shorts/nw2xsVt31JU';
  btn.target='_blank';
  btn.rel='noopener noreferrer';
  btn.style.cssText=`
    display:inline-flex;align-items:center;gap:6px;
    font-size:12px;font-weight:600;
    color:#ff0000;
    text-decoration:none;
    padding:5px 10px;
    border:1px solid rgba(255,0,0,.25);
    border-radius:20px;
    background:rgba(255,0,0,.04);
    transition:background .15s, border-color .15s;
  `;
  btn.innerHTML=`
    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1C24 15.9 24 12 24 12s0-3.9-.5-5.8z"/>
      <polygon points="9.6,15.6 15.8,12 9.6,8.4" fill="white"/>
    </svg>
    Посмотреть ролик
  `;
  btn.onmouseenter=()=>{ btn.style.background='rgba(255,0,0,.09)'; btn.style.borderColor='rgba(255,0,0,.4)'; };
  btn.onmouseleave=()=>{ btn.style.background='rgba(255,0,0,.04)'; btn.style.borderColor='rgba(255,0,0,.25)'; };
  right.appendChild(btn);

  body.appendChild(right);
  card.appendChild(body);
  wrap.appendChild(card);
  return wrap;
}

function blockPricingBreakdown(){
  const wrap=mkEl('div','width:100%;animation:blockPop .4s cubic-bezier(.16,1,.3,1) both,blockGlow .8s .2s ease-out both');
  const card=mkEl('div','background:#fff;border:1px solid rgba(13,27,42,.09);border-radius:20px;overflow:hidden;box-shadow:0 2px 16px rgba(13,27,42,.07)');
  const head=mkEl('div','padding:13px 18px;border-bottom:1px solid rgba(13,27,42,.07);display:flex;align-items:center;justify-content:space-between');
  head.innerHTML='<span style="font-size:13px;font-weight:600;color:rgba(13,27,42,.55);display:flex;align-items:center;gap:8px"><i class="bi bi-coin" aria-hidden="true"></i>Реальная стоимость</span>'
    +'<span style="font-size:10px;font-weight:600;padding:3px 9px;border-radius:20px;background:rgba(34,197,94,.15);color:#15803d">Можно сэкономить</span>';
  card.appendChild(head);
  const body=mkEl('div','padding:18px 20px;display:flex;flex-direction:column;gap:0');
  const priceEl=mkEl('div','font-size:40px;font-weight:800;color:#0d1a2b;letter-spacing:-.03em;margin-bottom:4px;transition:all .5s','99 000 ₽');
  body.appendChild(priceEl);
  body.appendChild(mkEl('div','font-size:13px;color:#4e6072;margin-bottom:20px','августовские смены · всё включено'));
  const steps=[
    {icon:'mortarboard',label:'Налоговый вычет 13% (через ФНС)',amount:'-5 200 ₽',color:'#1d6fe0',delay:600},
  ];
  const rowEls=steps.map(s=>{
    const row=mkEl('div','display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border-radius:10px;background:rgba(13,27,42,.03);border:1px solid rgba(13,27,42,.07);margin-bottom:8px;opacity:0;transform:translateY(8px);transition:all .4s');
    const left=mkEl('div','display:flex;align-items:center;gap:10px');
    const ic=mkEl('div','width:32px;height:32px;border-radius:8px;background:rgba(13,27,42,.05);display:flex;align-items:center;justify-content:center;color:'+s.color);
    ic.innerHTML='<i class="bi bi-'+s.icon+'" aria-hidden="true" style="font-size:14px"></i>';
    left.appendChild(ic);left.appendChild(mkEl('span','font-size:13px;color:#4e6072',s.label));
    row.appendChild(left);row.appendChild(mkEl('span','font-size:14px;font-weight:700;color:'+s.color,s.amount));
    body.appendChild(row);return row;
  });
  const divider=mkEl('div','height:1px;background:rgba(13,27,42,.08);margin:10px 0;opacity:0;transition:opacity .4s');
  body.appendChild(divider);
  const fin=mkEl('div','display:flex;align-items:center;justify-content:space-between;opacity:0;transition:all .5s');
  fin.appendChild(mkEl('span','font-size:14px;font-weight:600;color:#4e6072','Итого с вычетом'));
  fin.appendChild(mkEl('span','font-size:26px;font-weight:800;color:#16a34a;letter-spacing:-.02em','82 650 ₽'));
  body.appendChild(fin);
  card.appendChild(body);
  card.appendChild(mkEl('div','padding:0 20px 14px;font-size:11px;color:rgba(13,27,42,.35);line-height:1.6','* Налоговый вычет 13% — декларация 3-НДФЛ за обучение (образовательная часть путёвки выделяется в договоре отдельно). Возврат на счёт в течение 3–4 месяцев.'));
  const btn=mkEl('button','margin:0 12px 12px;padding:14px;background:linear-gradient(135deg,#ad5b00,#a34e00);border:none;border-radius:12px;font-family:inherit;font-size:16px;font-weight:700;color:#fff;cursor:pointer;width:calc(100% - 24px);display:block;box-shadow:0 4px 14px rgba(236,124,0,.35)','Забронировать →');
  btn.onclick=openPopup;card.appendChild(btn);
  wrap.appendChild(card);
  setTimeout(()=>{rowEls[0].style.opacity='1';rowEls[0].style.transform='none';},600);
  setTimeout(()=>{divider.style.opacity='1';fin.style.opacity='1';priceEl.style.color='rgba(13,27,42,.25)';priceEl.style.textDecoration='line-through';priceEl.style.fontSize='26px';},1200);
  return wrap;
}

function blockHackathon(){
  const wrap=mkEl('div','width:100%;animation:blockIn .45s cubic-bezier(.16,1,.3,1) both,blockGlow .8s .2s ease-out both');
  const card=mkEl('div','background:#fff;border:1px solid rgba(13,27,42,.09);border-radius:20px;overflow:hidden;box-shadow:0 2px 16px rgba(13,27,42,.07)');
  const head=mkEl('div','padding:13px 18px;border-bottom:1px solid rgba(13,27,42,.07);display:flex;align-items:center;justify-content:space-between');
  head.innerHTML='<span style="font-size:13px;font-weight:600;color:rgba(13,27,42,.55);display:flex;align-items:center;gap:8px"><i class="bi bi-trophy-fill" aria-hidden="true"></i>Финальный хакатон</span>'
    +'<span style="font-size:10px;font-weight:600;padding:3px 9px;border-radius:20px;background:rgba(251,191,36,.15);color:#b45309">Последние 2 дня</span>';
  card.appendChild(head);
  const stages=[
    {icon:'lightbulb',color:'#60a5fa',day:'День 1 · Утро',title:'Питч идей',desc:'Каждая команда из 3–5 чел. представляет идею. Тема — на выбор из треков смены'},
    {icon:'code-slash',color:'#a78bfa',day:'День 1 · День',title:'Кодинг-спринт',desc:'8 часов на разработку. Менторы помогают, но решения — только командные'},
    {icon:'display',color:'#fbbf24',day:'День 2 · Утро',title:'Защита проектов',desc:'3 минуты + вопросы жюри. Оценивают идею, реализацию и питч'},
    {icon:'trophy-fill',color:'#f472b6',day:'День 2 · Вечер',title:'Закрытие и награждение',desc:'Дипломы, мерч победителям, фото. Обещаем слёзы расставания'},
  ];
  const tl=mkEl('div','padding:16px 18px;display:flex;flex-direction:column;gap:0;position:relative');
  const line=mkEl('div','position:absolute;left:33px;top:32px;bottom:32px;width:2px;background:rgba(13,27,42,.1);border-radius:2px');
  tl.appendChild(line);
  stages.forEach((s,i)=>{
    const row=mkEl('div','display:flex;gap:14px;align-items:flex-start;margin-bottom:18px;opacity:0;transform:translateX(-8px);transition:all .4s '+(i*.15)+'s');
    const dot=mkEl('div','width:30px;height:30px;border-radius:50%;background:rgba(255,255,255,.05);border:2px solid '+s.color+';display:flex;align-items:center;justify-content:center;flex-shrink:0;position:relative;z-index:1');
    dot.innerHTML='<i class="bi bi-'+s.icon+'" aria-hidden="true" style="font-size:13px;color:'+s.color+'"></i>';
    const content=mkEl('div','flex:1;padding-top:3px');
    content.appendChild(mkEl('div','font-size:10px;font-weight:700;color:rgba(13,27,42,.4);text-transform:uppercase;letter-spacing:.07em;margin-bottom:3px',s.day));
    content.appendChild(mkEl('div','font-size:15px;font-weight:800;color:#0d1a2b;margin-bottom:4px',s.title));
    content.appendChild(mkEl('div','font-size:13px;color:#4e6072;line-height:1.55',s.desc));
    row.appendChild(dot);row.appendChild(content);tl.appendChild(row);
    setTimeout(()=>{row.style.opacity='1';row.style.transform='none';},150+i*200);
  });
  card.appendChild(tl);
  card.appendChild(mkEl('div','padding:0 18px 14px;font-size:11px;color:rgba(13,27,42,.35);text-align:center;border-top:1px solid rgba(13,27,42,.06);padding-top:10px','Победители получают мерч АйДаКемп · публикацию проекта в Telegram-канале'));
  wrap.appendChild(card);return wrap;
}

/* ── SESSION TRACKING (localStorage для ретаргетинга) ── */
const SESSION_KEY='ask_session';
function trackSession(update={}){
  try{
    const s=JSON.parse(localStorage.getItem(SESSION_KEY)||'{}');
    const now=Date.now();
    const merged={
      first_visit: s.first_visit||now,
      last_visit: now,
      visit_count: (s.visit_count||0)+(update._new_visit?1:0),
      msg_count: (s.msg_count||0)+(update._msg?1:0),
      age_mentioned: update.age||s.age_mentioned||null,
      topics: [...new Set([...(s.topics||[]),...(update.topics||[])])],
      blocks_shown: [...new Set([...(s.blocks_shown||[]),...(update.blocks_shown||[])])],
      contact_requested: update.contact_requested||s.contact_requested||false,
      booked: update.booked||s.booked||false,
    };
    delete merged._new_visit; delete merged._msg;
    localStorage.setItem(SESSION_KEY, JSON.stringify(merged));
    // Отдаём данные в dataLayer для ретаргетинга
    if(window.dataLayer) window.dataLayer.push({event:'ask_session_update',...merged});
  } catch(e){}
}
trackSession({_new_visit:true});

/* ── STATE ── */
let busy=false,active=false;
let aiState='idle'; // idle | think | speak
const history=[];
let contactOffered=false;
const sessionId=crypto.randomUUID();
const shownBlockTypes=new Set(); // не показывать один тип блока дважды

/* ── SHIFT SELECT ── */
function buildShiftSelect(){
  const sel=document.getElementById('popShift');
  if(!sel)return;
  SMENY.filter(s=>s.available).forEach(s=>{
    const opt=document.createElement('option');
    opt.value=s.n;
    opt.textContent=s.n+' — '+s.dates+' · '+s.price;
    sel.appendChild(opt);
  });
}
buildShiftSelect();

/* ── UI HELPERS ── */
function addEl(el){
  const box=document.getElementById('msgs');
  box.appendChild(el);
  // Double RAF: wait for layout to compute before scrolling
  requestAnimationFrame(()=>requestAnimationFrame(()=>{box.scrollTop=box.scrollHeight;}));
}

/* ── LIGHTBOX ── */
function openLb(url, caption){
  const lb=document.getElementById('lb');
  const img=document.getElementById('lbImg');
  const cap=document.getElementById('lbCaption');
  img.src=url; img.alt=caption||'';
  cap.textContent=caption||'';
  lb.classList.add('open');
  document.addEventListener('keydown',lbKey);
}
function closeLb(){
  document.getElementById('lb').classList.remove('open');
  document.removeEventListener('keydown',lbKey);
}
function lbKey(e){ if(e.key==='Escape') closeLb(); }

function autoGrow(el){
  el.style.height='auto';
  el.style.height=Math.min(el.scrollHeight,140)+'px';
  // При росте textarea прокручиваем сообщения вниз, чтобы последнее не уезжало
  const msgs=document.getElementById('msgs');
  if(msgs) requestAnimationFrame(()=>{ msgs.scrollTop=msgs.scrollHeight; });
}

function autoLink(html){
  // Convert bare URLs (not already inside <a href=...>) to clickable links
  return html.replace(/(?<!href=["']|">)(https?:\/\/[^\s<>"']+)/g,
    '<a href="$1" target="_blank" rel="noopener" style="color:var(--ord);text-decoration:underline;text-underline-offset:2px;word-break:break-all">$1</a>');
}

function addMsg(role,html,onDone){
  if(!active){
    active=true;
    document.getElementById('intro').classList.add('gone');
    document.getElementById('msgs').classList.add('show');
  }
  const d=document.createElement('div');
  d.className=role==='user'?'msg-user':'msg-text';
  if(role==='user'){d.innerHTML=html;addEl(d);return;}
  html=autoLink(html);

  // Parse HTML into segments for typewriter
  function parseSegs(src){
    const segs=[];let buf='',j=0;
    while(j<src.length){
      if(src[j]==='<'){
        if(buf){segs.push({t:'txt',v:buf});buf='';}
        let tag='';
        while(j<src.length&&src[j]!=='>'){tag+=src[j++];}
        tag+='>'; j++;
        segs.push({t:'tag',v:tag});
      } else { buf+=src[j++]; }
    }
    if(buf)segs.push({t:'txt',v:buf});
    return segs;
  }

  // Step 1: render full text invisibly to establish final bubble width
  d.innerHTML=html;
  d.style.opacity='0';
  d.style.pointerEvents='none';
  addEl(d);

  // Step 2: after browser layout — lock width AND height, clear, show dots
  requestAnimationFrame(()=>{
    const lockedW=d.offsetWidth;
    const lockedH=d.offsetHeight;
    d.style.minWidth=lockedW+'px';
    d.style.minHeight=lockedH+'px';
    d.style.opacity='';
    d.style.pointerEvents='';
    d.innerHTML='';

    // Dots inside bubble
    const dotsDiv=document.createElement('div');
    dotsDiv.style.cssText='display:flex;gap:5px;align-items:center;padding:2px 0;transition:opacity .18s';
    dotsDiv.innerHTML='<span class="td"></span><span class="td"></span><span class="td"></span>';
    d.appendChild(dotsDiv);

    // Step 3: after short dots pause — typewriter
    const DOTS_MS=550;
    setTimeout(()=>{
      dotsDiv.style.opacity='0';
      setTimeout(()=>{
        dotsDiv.remove();
        d.innerHTML='';
        const segments=parseSegs(html);
        d.classList.add('typing-cursor');
        let si=0,ci=0,built='';
        const SPEED=18;
        function tick(){
          if(si>=segments.length){
            d.classList.remove('typing-cursor');
            setTimeout(()=>{d.scrollIntoView({behavior:'smooth',block:'nearest'});},60);
            if(onDone)onDone(d);
            return;
          }
          const seg=segments[si];
          if(seg.t==='tag'){built+=seg.v;si++;ci=0;d.innerHTML=built+'​';requestAnimationFrame(tick);return;}
          if(ci<seg.v.length){
            built+=seg.v[ci++];
            d.innerHTML=built+'​';
            const _box=document.getElementById('msgs');
            if(_box)_box.scrollTop=_box.scrollHeight;
            setTimeout(tick,SPEED);
          } else { si++;ci=0;setTimeout(tick,0); }
        }
        tick();
      },180);
    },DOTS_MS);
  });
  return d;
}

function addChips(items){
  const row=document.createElement('div');
  row.style.cssText='align-self:flex-start;display:flex;gap:8px;flex-wrap:wrap;animation:up .3s .1s cubic-bezier(.16,1,.3,1) both;padding:2px 0 4px';
  items.forEach(item=>{
    const b=document.createElement('button');
    const isCTA=item.action==='book';
    const isSoft=item.action==='contact_request';
    if(isCTA){
      b.className='chip-cta-icon';
      b.style.cssText='width:42px;height:42px;padding:0;border:none;border-radius:50%;background:linear-gradient(135deg,#ad5b00,#a34e00);cursor:pointer;transition:.18s;box-shadow:0 4px 18px rgba(236,124,0,.4);display:flex;align-items:center;justify-content:center;flex-shrink:0';
    } else if(isSoft){
      b.className='chip chip-soft';
    } else {
      b.className='chip';
    }
    if(isCTA){
      b.innerHTML='<i class="bi bi-calendar-check" aria-hidden="true" style="font-size:20px"></i>';
      b.title=item.label||'Забронировать';
    } else {
      b.textContent=item.label;
    }
    b.onmouseenter=()=>{
      if(isCTA){b.style.background='linear-gradient(135deg,#d96a00,#b85500)';b.style.boxShadow='0 6px 22px rgba(236,124,0,.5)';b.style.transform='translateY(-2px)';}
      else if(isSoft){b.style.transform='translateY(-2px)';}
      else{b.style.transform='translateY(-2px)';}
    };
    b.onmouseleave=()=>{
      if(isCTA){b.style.background='linear-gradient(135deg,#ad5b00,#a34e00)';b.style.boxShadow='0 4px 18px rgba(236,124,0,.4)';}
      b.style.transform='';
    };
    if(isCTA) b.onclick=()=>{trackSession({booked:true});openPopup()};
    else if(isSoft) b.onclick=()=>{row.remove();showContactCard()};
    else if(item.action==='link'&&item.url) b.onclick=()=>{window.open(item.url,'_blank','noopener')};
    else b.onclick=()=>{row.remove();go(item.query||item.label)};
    row.appendChild(b);
  });
  addEl(row);
}

function showContactCard(){
  trackSession({contact_requested:true});
  if(typeof ym!=='undefined') ym(YM_COUNTER,'reachGoal','ask_contact_intent');

  // Step 1 — bot asks for contact
  addMsg('ai','Хорошо! Оставьте телефон, почту или Telegram — Дарья напишет сама в рабочее время, без звонков.',()=>{
    // Step 2 — show inline contact input widget
    const wrap=document.createElement('div');
    wrap.style.cssText='align-self:flex-start;width:100%;max-width:420px;animation:up .3s cubic-bezier(.16,1,.3,1) both';

    const card=document.createElement('div');
    card.style.cssText='background:#fff;border:1.5px solid rgba(13,27,42,.12);border-radius:16px;padding:16px 18px;box-shadow:0 2px 14px rgba(13,27,42,.08)';

    const label=document.createElement('div');
    label.style.cssText='font-size:12px;font-weight:600;color:rgba(13,27,42,.4);text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px';
    label.textContent='Как с вами связаться';

    const row=document.createElement('div');
    row.style.cssText='display:flex;gap:8px;align-items:flex-start';

    const inp=document.createElement('input');
    inp.type='text';
    inp.placeholder='+7 999 000-00-00 / почта / @telegram';
    inp.style.cssText='flex:1;padding:11px 14px;border:1.5px solid rgba(13,27,42,.12);border-radius:10px;font-family:Manrope,sans-serif;font-size:15px;color:#0d1a2b;outline:none;background:#f8fafc;transition:.2s;min-width:0';
    inp.addEventListener('focus',()=>{inp.style.borderColor='rgba(236,124,0,.5)';inp.style.background='#fff';});
    inp.addEventListener('blur',()=>{inp.style.borderColor='rgba(13,27,42,.12)';inp.style.background='#f8fafc';});

    const errEl=document.createElement('div');
    errEl.style.cssText='font-size:12px;color:#dc2626;margin-top:6px;display:none';

    const btn=document.createElement('button');
    btn.style.cssText='padding:11px 18px;background:linear-gradient(135deg,#ad5b00,#a34e00);border:none;border-radius:10px;font-family:Manrope,sans-serif;font-size:14px;font-weight:700;color:#fff;cursor:pointer;transition:.15s;flex-shrink:0;white-space:nowrap';
    btn.textContent='Передать';
    btn.onclick=()=>submitContact(inp,errEl,wrap);

    inp.addEventListener('keydown',(e)=>{if(e.key==='Enter'){e.preventDefault();submitContact(inp,errEl,wrap);}});

    const hint=document.createElement('div');
    hint.style.cssText='font-size:11px;color:rgba(13,27,42,.35);margin-top:8px';
    hint.textContent='Телефон, email или @username — на ваш выбор';

    row.appendChild(inp);row.appendChild(btn);
    card.appendChild(label);card.appendChild(row);card.appendChild(errEl);card.appendChild(hint);
    wrap.appendChild(card);
    addEl(wrap);
    setTimeout(()=>inp.focus(),300);
  });
}

function validateContact(v){
  const s=v.trim();
  if(!s) return null;
  // Phone: 7/8 + 10 digits, or +7 + 10 digits
  if(/^(\+7|7|8)\d{10}$/.test(s.replace(/[\s\-\(\)]/g,''))) return {type:'phone',value:s};
  // Email
  if(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) return {type:'email',value:s};
  // Telegram: @username or t.me/username
  if(/^@[a-zA-Z0-9_]{3,}$/.test(s)||/^(https?:\/\/)?(t\.me|telegram\.me)\/[a-zA-Z0-9_]{3,}/.test(s)) return {type:'telegram',value:s};
  return null;
}

async function submitContact(inp,errEl,wrap){
  const parsed=validateContact(inp.value);
  if(!parsed){
    errEl.textContent='Не похоже на телефон, почту или Telegram. Попробуйте ещё раз.';
    errEl.style.display='block';
    inp.style.borderColor='rgba(220,38,38,.5)';
    setTimeout(()=>inp.focus(),50);
    return;
  }
  // Disable UI
  inp.disabled=true;
  const btn=wrap.querySelector('button');
  if(btn){btn.disabled=true;btn.textContent='Отправляю...';}
  errEl.style.display='none';

  // Build context from history
  const ctx=history.slice(-6).map(m=>(m.role==='user'?'Мама: ':'Бот: ')+m.content.replace(/<[^>]+>/g,' ').slice(0,120)).join('\n');

  try{
    const res=await fetch('/api/contact-send',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({contact:parsed.value,contact_type:parsed.type,context:ctx}),
    });
    if(!res.ok) throw new Error('server error');
  } catch(e){
    // Fail silently — still show success to user
  }

  // Remove the form
  wrap.remove();

  // Bot confirmation
  const label={phone:'телефон',email:'почту',telegram:'Telegram'}[parsed.type]||'контакт';
  addMsg('ai','Передала Дарье '+label+' — <strong>'+parsed.value+'</strong>.<br>Напишет в рабочее время (11:00–20:00 МСК), без звонков.');
  trackSession({contact_requested:true});
  if(typeof ym!=='undefined') ym(YM_COUNTER,'reachGoal','ask_contact_sent');
}

function showTyping(){
  const t=document.getElementById('typing');
  const box=document.getElementById('msgs');
  if(!active){active=true;document.getElementById('intro').classList.add('gone');document.getElementById('msgs').classList.add('show')}
  box.after(t);t.classList.add('show');box.scrollTop=box.scrollHeight;
}

function hideTyping(){
  document.getElementById('typing').classList.remove('show');
}

function renderBlock(blockType,blockData){
  switch(blockType){
    case 'smeny': return blockSmeny();
    case 'courses': return blockCourses(blockData);
    case 'day_schedule': return blockDay();
    case 'conditions': return blockCond();
    case 'prices': return blockPrices();
    case 'location': return blockLocation();
    case 'occupancy_chart': return blockOccupancyChart();
    case 'photo_carousel': return blockPhotoCarousel(blockData);
    case 'video_player': return blockVideoPlayer(blockData);
    case 'gallery': return blockGallery(blockData);
    case 'youtube_comment': return blockYoutubeComment();
    case 'pricing_breakdown': return blockPricingBreakdown();
    case 'hackathon': return blockHackathon();
    case 'tax_calculator': return blockTaxCalculator();
    default: return null;
  }
}

/* ── AI REQUEST ── */
async function go(txt){
  if(busy)return;
  busy=true;
  aiState='think';
  document.getElementById('sendBtn').disabled=true;
  addMsg('user',txt);
  showTyping();

  // Fire Metrika goal
  if(typeof ym!=='undefined'&&history.length===0){
    ym(YM_COUNTER,'reachGoal','ai_chat_start');
  }

  history.push({role:'user',content:txt});
  trackSession({_msg:true});
  updateProgress();

  // Определяем возраст из текста пользователя
  const ageMatch=txt.match(/\b(\d{1,2})\s*лет/i);
  if(ageMatch) trackSession({age:parseInt(ageMatch[1])});

  try{
    // 28-second timeout — Anthropic API can be slow on complex queries
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),28000);
    const res=await fetch('/api/ask',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({message:txt,history:history.slice(0,-1),sessionId}),
      signal:controller.signal
    });
    clearTimeout(timer);
    const data=await res.json();
    hideTyping();
    aiState='speak';

    if(data.state==='error'||!data.text){
      addMsg('ai',data.text||'Что-то пошло не так. Попробуйте ещё раз.');
    } else {
      // Сохраняем в историю сразу — не ждём анимации
      const blockNote=data.block_type?` [показан блок: ${data.block_type}]`:'';
      history.push({role:'assistant',content:data.text+blockNote});
      if(history.length>20)history.splice(0,2);

      // Папа-детектор: показываем бейдж «Хороший папа» один раз
      if(data.badge==='dad' && getBadgeType()!=='dad'){
        setTimeout(()=>triggerDadBadge(), 800);
      }
      if(data.block_data&&data.block_data.age) trackSession({age:data.block_data.age});

      // Показываем блок — но не повторяем тип блока, уже показанный ранее
      const blockAllowed=data.block_type&&!shownBlockTypes.has(data.block_type);

      // Последовательный показ: текст печатается → блок появляется → чипсы
      addMsg('ai',data.text,(aiEl)=>{
        if(blockAllowed){
          // После окончания печати — небольшая пауза, потом блок
          setTimeout(()=>{
            const block=renderBlock(data.block_type,data.block_data);
            if(block){
              addEl(block);
              shownBlockTypes.add(data.block_type);
              // Скроллим к тексту чтобы пользователь видел начало ответа
              aiEl&&aiEl.scrollIntoView({behavior:'smooth',block:'start'});
              trackSession({blocks_shown:[data.block_type],topics:[data.block_type]});
              if(typeof ym!=='undefined'){
                ym(YM_COUNTER,'reachGoal','ai_block_shown',{block_type:data.block_type});
              }
              // Чипсы — после того как блок успел появиться (≈ длительность анимации)
              setTimeout(()=>{if(data.chips&&data.chips.length)addChips(data.chips);},480);
            } else {
              if(data.chips&&data.chips.length)addChips(data.chips);
            }
          },150);
        } else {
          // Нет блока — чипсы сразу после завершения текста
          setTimeout(()=>{
            if(data.chips&&data.chips.length)addChips(data.chips);
            aiEl&&aiEl.scrollIntoView({behavior:'smooth',block:'nearest'});
          },80);
        }
      });
    }
  } catch(e){
    hideTyping();
    console.error('[ask] fetch error:', e?.name, e?.message);
    addMsg('ai','Что-то подвисло — напишите напрямую: <a href="https://wa.me/79688086455" target="_blank" rel="noopener" style="color:var(--ord);font-weight:600">WhatsApp</a> или <a href="https://t.me/Progaschool" target="_blank" rel="noopener" style="color:var(--ord);font-weight:600">Telegram</a>.');
    busy=false;
    document.getElementById('sendBtn').disabled=false;
  }

  setTimeout(()=>{aiState='idle'},2000);
  busy=false;
  document.getElementById('sendBtn').disabled=false;
  document.getElementById('inp').focus();
}

function send(){
  const inp=document.getElementById('inp');
  const v=inp.value.trim();
  if(!v||busy)return;
  inp.value='';
  inp.style.height='auto'; // reset textarea height
  go(v);
}

/* ── POPUP ── */
function openPopup(){
  document.getElementById('overlay').classList.add('open');
  document.body.style.overflow='hidden';
  setTimeout(()=>document.getElementById('popPhone').focus(),300);
  if(typeof ym!=='undefined'){
    ym(YM_COUNTER,'reachGoal','ai_chat_complete');
  }
}
function closePopup(){
  document.getElementById('overlay').classList.remove('open');
  document.body.style.overflow='';
}
function pa(btn){
  btn.closest('.par').querySelectorAll('.pab').forEach(b=>b.classList.remove('on'));
  btn.classList.add('on');
}

async function submitBooking(){
  const phoneEl=document.getElementById('popPhone');
  const phone=phoneEl.value.trim();
  const hintPhone=document.getElementById('popHintPhone');
  const hintConsent=document.getElementById('popHintConsent');
  const consentPolicy=document.getElementById('popConsentPolicy');
  const consent=document.getElementById('popConsent');
  const phoneOk=phone&&phone.replace(/\D/g,'').length===11;
  const consentsOk=consentPolicy?.checked&&consent?.checked;
  if(hintPhone)hintPhone.style.display=phoneOk?'none':'block';
  if(hintConsent)hintConsent.style.display=consentsOk?'none':'block';
  if(!phoneOk){phoneEl.focus();phoneEl.scrollIntoView({behavior:'smooth',block:'center'});return;}
  if(!consentsOk){consentPolicy.scrollIntoView({behavior:'smooth',block:'center'});return;}
  const shift=document.getElementById('popShift').value;
  const age=document.querySelector('.pab.on')?.textContent||'';
  const btn=document.getElementById('popSubmit');
  btn.disabled=true;btn.textContent='Отправляем...';

  try{
    await fetch('/api/lead',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({phone,shift,age,source:'ask-chat',sessionId,landing_url:location.href,page_title:document.title})
    });
    if(typeof ym!=='undefined'){
      ym(YM_COUNTER,'reachGoal','ai_form_submit');
    }
    btn.textContent='Заявка отправлена!';
    setTimeout(closePopup,1500);
  } catch(e){
    btn.disabled=false;btn.textContent='Забронировать →';
  }
}

/* ── PHONE MASK + auto-hide hints ── */
document.getElementById('popPhone').addEventListener('input',function(){
  let v=this.value.replace(/\D/g,'');
  if(v.startsWith('8')&&v.length>1)v='7'+v.slice(1);
  if(!v.startsWith('7')&&v.length>0)v='7'+v;
  v=v.slice(0,11);
  let r='+7';
  if(v.length>1)r+=' ('+v.slice(1,4);
  if(v.length>=4)r+=') '+v.slice(4,7);
  if(v.length>=7)r+='-'+v.slice(7,9);
  if(v.length>=9)r+='-'+v.slice(9,11);
  this.value=r;
  if(v.length===11){const h=document.getElementById('popHintPhone');if(h)h.style.display='none';}
});
['popConsent','popConsentPolicy'].forEach(id=>{
  const el=document.getElementById(id);
  if(!el)return;
  el.addEventListener('change',()=>{
    const a=document.getElementById('popConsent'),b=document.getElementById('popConsentPolicy');
    if(a?.checked&&b?.checked){const h=document.getElementById('popHintConsent');if(h)h.style.display='none';}
  });
});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closePopup()});

/* ── ORBIT AVATAR ── */
function makeOrbitCanvas(canvas,size){
  const ctx=canvas.getContext('2d');
  const cx=size/2,cy=size/2,R=size/2-1;
  let t=0;
  const N=size>40?12:8;
  const pts=Array.from({length:N},(_,i)=>({
    a:(i/N)*Math.PI*2,
    orb:(size>40?(8+(i%3)*10):(5+(i%3)*7))*(size/60),
    sz:(1+(i%3)*.6)*(size/36),
    sp:.35+(i%4)*.15,
  }));
  function draw(){
    const cs=getComputedStyle(document.documentElement);
    // Logo background always dark navy — brand style
    const surfaceColor='#0a1628';
    const particleColor=cs.getPropertyValue('--orbit-particle').trim()||'#9a4f00';
    const ringColor=cs.getPropertyValue('--orbit-ring').trim()||'rgba(196,95,0,.35)';
    ctx.clearRect(0,0,size,size);
    ctx.beginPath();ctx.arc(cx,cy,R,0,Math.PI*2);
    ctx.fillStyle=surfaceColor;ctx.fill();
    ctx.strokeStyle=`rgba(236,124,0,${aiState==='think'?.5:.25})`;
    ctx.lineWidth=1;ctx.stroke();
    const sp=aiState==='think'?3.5:aiState==='speak'?2:1;
    [(size>40?8:5),(size>40?18:12),(size>40?28:19)].forEach(r=>{
      ctx.beginPath();ctx.arc(cx,cy,r*(size/60),0,Math.PI*2);
      ctx.strokeStyle=ringColor;
      ctx.lineWidth=.5;ctx.stroke();
    });
    pts.forEach(p=>{
      p.a+=p.sp*.045*sp;
      for(let j=4;j>=0;j--){
        const ta=p.a-p.sp*.045*sp*j*2.2;
        const tx=cx+Math.cos(ta)*p.orb,ty=cy+Math.sin(ta)*p.orb;
        const a=aiState==='think'?.85:aiState==='speak'?.65:.45;
        ctx.beginPath();ctx.arc(tx,ty,Math.max(.3,p.sz*(1-j*.18)),0,Math.PI*2);
        ctx.fillStyle=particleColor;ctx.globalAlpha=a*(1-j*.22);ctx.fill();ctx.globalAlpha=1;
      }
      const px=cx+Math.cos(p.a)*p.orb,py=cy+Math.sin(p.a)*p.orb;
      ctx.beginPath();ctx.arc(px,py,p.sz,0,Math.PI*2);
      ctx.fillStyle=particleColor;ctx.fill();
    });
    const pulse=.5+Math.sin(t*(aiState==='think'?4:aiState==='speak'?2.5:1.5))*.5;
    const cr=(4+pulse*3)*(size/36);
    const g=ctx.createRadialGradient(cx,cy,0,cx,cy,cr);
    g.addColorStop(0,'rgba(255,230,130,1)');
    g.addColorStop(.5,'rgba(236,124,0,.9)');
    g.addColorStop(1,'rgba(236,124,0,0)');
    ctx.beginPath();ctx.arc(cx,cy,cr,0,Math.PI*2);ctx.fillStyle=g;ctx.fill();
    if(aiState==='think'||aiState==='speak'){
      const pr=R*(.6+Math.sin(t*3)*.15);
      ctx.beginPath();ctx.arc(cx,cy,pr,0,Math.PI*2);
      ctx.strokeStyle=`rgba(236,124,0,${.1+Math.sin(t*3)*.1})`;ctx.lineWidth=1;ctx.stroke();
    }
    t+=0.04;
    requestAnimationFrame(draw);
  }
  draw();
}

makeOrbitCanvas(document.getElementById('logoCanvas'),34);
makeOrbitCanvas(document.getElementById('heroCanvas'),60);

/* ── VOICE INPUT ── */
let recognition = null;
let isRecording = false;

(function initMic(){
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const btn = document.getElementById('micBtn');
  if(!SpeechRecognition){ btn && (btn.style.display='none'); return; }

  recognition = new SpeechRecognition();
  recognition.lang = 'ru-RU';
  recognition.interimResults = true;
  recognition.continuous = false;

  recognition.onresult = (e) => {
    const transcript = Array.from(e.results).map(r=>r[0].transcript).join('');
    document.getElementById('inp').value = transcript;
    if(e.results[e.results.length-1].isFinal){
      stopMic();
      send();
    }
  };

  recognition.onerror = () => stopMic();
  recognition.onend = () => stopMic();
})();

function toggleMic(){
  if(!recognition) return;
  isRecording ? stopMic() : startMic();
}

function startMic(){
  isRecording = true;
  document.getElementById('micBtn').classList.add('recording');
  document.getElementById('micIcon').className = 'bi bi-mic-fill';
  document.getElementById('inp').placeholder = 'Слушаю...';
  recognition.start();
}

function stopMic(){
  isRecording = false;
  document.getElementById('micBtn').classList.remove('recording');
  document.getElementById('micIcon').className = 'bi bi-mic';
  document.getElementById('inp').placeholder = 'Спросите про лагерь...';
  try{ recognition.stop(); } catch(e){}
}

/* ── DIALOG PROGRESS ── */
let userMsgCount = 0;
const PROGRESS_MAX = 7;

/* ── АЧИВКА — PERSISTENT BADGE ── */
const BADGE_KEY = 'ac_parent_badge';
const BADGE_DISMISSED = 'ac_parent_badge_dismissed';
let achivkaShown = false;
let badgeType = null; // 'mom' | 'dad'

function getBadgeType(){ return localStorage.getItem(BADGE_KEY); }
function setBadgeType(t){ localStorage.setItem(BADGE_KEY, t); badgeType = t; }
function isBadgeDismissed(){ return localStorage.getItem(BADGE_DISMISSED) === '1'; }

function renderAchivka(type, animate){
  const el = document.getElementById('achivka');
  const txt = document.getElementById('achivkaText');
  const sub = document.getElementById('achivkaSub');
  const icon = el.querySelector('.achivka-icon');
  if(!el) return;
  if(type === 'dad'){
    el.classList.add('dad');
    if(txt) txt.textContent = 'Хороший папа';
    if(sub) sub.textContent = 'Разобрался и задал правильные вопросы';
    if(icon){ icon.className='bi bi-patch-check-fill achivka-icon'; }
  } else {
    el.classList.remove('dad');
    if(txt) txt.textContent = 'Хорошая мама';
    if(sub) sub.textContent = 'Вы задали все правильные вопросы';
    if(icon){ icon.className='bi bi-patch-check-fill achivka-icon'; }
  }
  if(animate){
    el.classList.add('show');
    // Не скрываем автоматически — бейдж остаётся до закрытия
  }
}

function closeAchivka(){
  const el = document.getElementById('achivka');
  if(el) el.classList.remove('show');
  localStorage.setItem(BADGE_DISMISSED, '1');
}

function triggerMomBadge(){
  if(achivkaShown || isBadgeDismissed()) return;
  achivkaShown = true;
  setBadgeType('mom');
  renderAchivka('mom', true);
}

function triggerDadBadge(){
  setBadgeType('dad');
  achivkaShown = true;
  renderAchivka('dad', true);
  localStorage.removeItem(BADGE_DISMISSED); // Папа = новое событие, показываем снова
}

// Инициализация при загрузке — восстановить бейдж если был
(function initAchivka(){
  const saved = getBadgeType();
  if(saved && !isBadgeDismissed()){
    achivkaShown = true;
    renderAchivka(saved, true);
  }
})();

function updateProgress(){
  userMsgCount++;
  const pct = Math.min(userMsgCount / PROGRESS_MAX * 100, 100);
  const bar = document.getElementById('dialogBar');
  if(bar) bar.style.width = pct + '%';

  // Share row появляется после 3 сообщений
  if(userMsgCount >= 3){
    const row = document.getElementById('shareRow');
    if(row) row.classList.add('show');
  }

  // Ачивка "Хорошая мама" после 5 вопросов — один раз
  if(userMsgCount === 5 && !achivkaShown){
    triggerMomBadge();
  }
}

/* ── SHARE TO WHATSAPP ── */
function getShareText(){
  const msgs = document.querySelectorAll('.msg-text');
  let lines = [];
  msgs.forEach(m => {
    const t = m.innerText.replace(/\s+/g,' ').trim().slice(0,120);
    if(t && lines.length < 3) lines.push('— ' + t);
  });
  return 'Смотри, нашла IT-лагерь для детей — АйДаКемп:\n\n'
    + lines.join('\n\n')
    + '\n\nЧат-помощник: https://aidacamp.ru/ask/';
}

function showShareChooser(){
  document.getElementById('shareChooser').classList.add('open');
}

function closeShareChooser(){
  document.getElementById('shareChooser').classList.remove('open');
}

function shareToWhatsApp(){
  const text = getShareText();
  closeShareChooser();
  window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank');
}

function shareToTelegram(){
  const text = getShareText();
  closeShareChooser();
  const url = 'https://aidacamp.ru/ask/';
  window.open('https://t.me/share/url?url=' + encodeURIComponent(url) + '&text=' + encodeURIComponent(text), '_blank');
}

/* ── QR "ОТКРЫТЬ НА ТЕЛЕФОНЕ" ── */
function showQR(){
  // Кодируем последние 6 сообщений диалога в URL для открытия на телефоне
  let url = location.origin + '/ask/';
  try{
    const h = history.slice(-6).map(m=>({r:m.role==='user'?'u':'a',c:m.content.replace(/<[^>]+>/g,'').trim().slice(0,250)}));
    if(h.length > 0){
      const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(h))));
      url += '?c=' + encoded;
    }
  }catch(e){ /* ignore */ }
  document.getElementById('qrImg').src =
    'https://api.qrserver.com/v1/create-qr-code/?size=200x200&color=0d1b2a&data=' + encodeURIComponent(url);
  document.getElementById('qrModal').classList.add('open');
}
function closeQR(){
  document.getElementById('qrModal').classList.remove('open');
}

// QR кнопка — только на десктопе
(function(){
  if(window.innerWidth > 800 && !/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)){
    const btn = document.getElementById('qrBtn');
    if(btn) btn.style.display = 'inline-flex';
  }
})();

// ── ВОССТАНОВЛЕНИЕ ДИАЛОГА С ДРУГОГО УСТРОЙСТВА (?c=...) ──
(function(){
  const sp = new URLSearchParams(location.search);
  const conv = sp.get('c');
  if(!conv) return;
  try{
    const items = JSON.parse(decodeURIComponent(escape(atob(conv))));
    if(!Array.isArray(items) || items.length === 0) return;
    // Восстанавливаем историю и рендерим сообщения
    items.forEach(m => {
      const role = m.r === 'u' ? 'user' : 'assistant';
      history.push({role, content: m.c});
      addMsg(m.r === 'u' ? 'user' : 'ai', m.c.replace(/\n/g,'<br>'));
      if(m.r === 'u') userMsgCount++;
    });
    // Подсказка "продолжение диалога"
    setTimeout(()=>{
      const note = document.createElement('div');
      note.style.cssText='text-align:center;font-size:12px;color:var(--text-muted);padding:12px 0 4px;opacity:.6';
      note.textContent = '↑ диалог восстановлен · продолжайте задавать вопросы';
      const spacer = document.getElementById('msgs-spacer');
      if(spacer) spacer.after(note);
      // Показать share row если нужно
      if(userMsgCount >= 3){
        const row = document.getElementById('shareRow');
        if(row) row.classList.add('show');
      }
    }, 200);
    // Убираем ?c= из URL чтобы не мешало при шаринге
    history.replaceState({},'','/ask/');
  }catch(e){ console.warn('[ask] conv restore error:', e); }
})();

// Expose global functions for HTML event handlers
Object.assign(window, {
  addChips, addEl, addMsg, autoGrow, autoLink,
  blockCond, blockCourses, blockDay, blockGallery, blockHackathon,
  blockLocation, blockOccupancyChart, blockPhotoCarousel, blockPrices,
  blockPricingBreakdown, blockSmeny, blockTaxCalculator, blockVideoPlayer,
  blockYoutubeComment, buildShiftSelect, closeAchivka, closeLb, closePopup,
  closeQR, closeShareChooser, go, makeOrbitCanvas, openLb, openPopup, pa,
  send, shareToTelegram, shareToWhatsApp, showQR, showShareChooser,
  submitBooking, toggleMic, toggleTheme, trackSession,
});
