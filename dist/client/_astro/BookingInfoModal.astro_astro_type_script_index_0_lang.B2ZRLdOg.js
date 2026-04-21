const u={"no-prepay":{title:"Бронь без предоплаты",body:`
        <p>Звонок менеджера — и мы фиксируем место <strong>на 72 часа</strong>.</p>
        <p>За это время вы получаете договор с ценой и условиями. Решаете без спешки.</p>
        <div class="rounded-[12px] bg-slate-50 px-4 py-3 mt-3">
          <p class="text-[13px] font-semibold uppercase tracking-wide text-slate-500">Оплата в 2 этапа</p>
          <ul class="mt-1.5 text-[14px] text-slate-700 space-y-1">
            <li>— 50% при бронировании</li>
            <li>— 50% за 3 недели до старта смены</li>
          </ul>
        </div>
      `,ctas:[{text:"Узнать о свободных местах",variant:"primary",action:"close-scroll-to-form"}]},contract:{title:"Договор и налоговый вычет",body:`
        <p>Договор на <strong>образовательные услуги</strong> по <strong>лицензии Минобрнауки</strong>.</p>
        <p>Это даёт право на налоговый вычет <strong>13% от стоимости путёвки</strong>.</p>
        <p>Все документы для вычета (договор, чек, копия лицензии) высылаем автоматически после оплаты.</p>
      `,ctas:[{text:"Калькулятор вычета 13%",variant:"primary",action:"link",url:"/nalogovyj-vychet/"}]},transfer:{title:"Трансфер из Москвы",body:`
        <p>Организованный автобус от <strong>компаний-партнёров</strong>.</p>
        <p><strong>2 500 ₽ в одну сторону</strong> (туда+обратно = 5 000 ₽).</p>
        <div class="rounded-[12px] bg-emerald-50/70 border border-emerald-100 px-4 py-3 mt-3">
          <p class="flex items-center gap-2 text-[14px] font-semibold text-slate-900">
            <i class="bi bi-geo-alt-fill text-emerald-700" aria-hidden="true"></i>
            Сбор: Производственная 4А
          </p>
          <p class="mt-1.5 text-[13px] text-slate-600 leading-[1.5]">
            Удобно приехать на машине или метро — автобус свободно размещается, парковки хватает.
          </p>
        </div>
        <p class="mt-3 text-[13px] text-slate-500 leading-[1.5]">
          <strong>Почему эта точка:</strong> автобус идёт в обход МКАД, без пробок. Дорога до лагеря — 40–60 минут.
        </p>
      `,ctas:[{text:"Открыть на Яндекс.Картах",variant:"secondary",action:"link",url:"https://yandex.ru/maps?whatshere%5Bzoom%5D=17&whatshere%5Bpoint%5D=37.388087,55.647305&si=t9er14d10me0wuccmt794ph9jg",external:!0}]}};function p(t){return t==="secondary"?"inline-flex items-center justify-center gap-2 rounded-[10px] border border-slate-200 bg-white px-4 py-2.5 text-[14px] font-semibold text-slate-800 hover:bg-slate-50 transition":"inline-flex items-center justify-center gap-2 rounded-[10px] bg-[#ec7c00] px-4 py-2.5 text-[14px] font-semibold text-[#1e2430] transition-all duration-200 hover:shadow-[0_4px_16px_rgba(249,115,22,0.35)] hover:-translate-y-[1px] active:translate-y-0"}function g(){const t=document.getElementById("bookingInfoModal");if(!t)return;const s=t.querySelector("#bookingInfoModalTitle"),l=t.querySelector("#bookingInfoModalBody"),i=t.querySelector("#bookingInfoModalCtas");if(!s||!l||!i)return;function x(a,c){const r=u[a];r&&(s.textContent=r.title,l.innerHTML=r.body,i.innerHTML="",r.ctas.forEach(o=>{if(o.action==="link"&&o.url){const e=document.createElement("a");e.href=o.url,e.className=p(o.variant??"primary"),e.textContent=o.text,o.external&&(e.target="_blank",e.rel="noopener"),i.appendChild(e)}else{const e=document.createElement("button");e.type="button",e.className=p(o.variant??"primary"),e.textContent=o.text,e.addEventListener("click",()=>{if(t.close(),o.action==="close-scroll-to-form"){const n=document.getElementById("hero-booking-block");n&&(n.style.maxHeight=n.scrollHeight+"px",n.style.opacity="1",n.style.pointerEvents="auto",n.style.paddingTop="16px",n.style.paddingBottom="24px");const d=document.querySelector('[data-form="booking_mobile"] [data-phone-input], [data-form="booking_desktop"] [data-phone-input]');d?.focus({preventScroll:!0}),d?.scrollIntoView({behavior:"smooth",block:"center"})}}),i.appendChild(e)}}),t.showModal(),window.acTrack?.("booking_info_open",{key:a,variant:c}))}document.addEventListener("click",a=>{const r=a.target?.closest("[data-booking-info-key]");if(!r)return;a.preventDefault();const o=r.getAttribute("data-booking-info-key")||"",n=r.closest("[data-form]")?.getAttribute("data-form")||"unknown";x(o,n)}),t.querySelector("[data-booking-info-close]")?.addEventListener("click",()=>t.close()),t.addEventListener("click",a=>{a.target===t&&t.close()})}document.addEventListener("astro:page-load",g);g();
