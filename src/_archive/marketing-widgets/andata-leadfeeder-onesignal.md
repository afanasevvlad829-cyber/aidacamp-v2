# Отключённые виджеты — Andata TM, Leadfeeder, OneSignal

Убраны из `src/layouts/Base.astro` (решение владельца, 26.07.2026) — на сайте
из сторонней аналитики оставлены только Яндекс.Метрика и Clarity. Код ниже не
удалён насовсем — если понадобится вернуть один из виджетов, скопируй нужный
блок обратно в `Base.astro` внутрь `loadStage2()` (секция "Stage 2 scripts").

## Leadfeeder (B2B-идентификация посетителя по IP/компании)

```js
(function(ss,ex){
  window.ldfdr=window.ldfdr||function(){(ldfdr._q=ldfdr._q||[]).push([].slice.call(arguments));};
  (function(d,s){var fs=d.getElementsByTagName(s)[0];function ce(src){var cs=d.createElement(s);cs.src=src;cs.async=1;fs.parentNode.insertBefore(cs,fs);}
  ce('https://sc.lfeeder.com/lftracker_v1_'+ss+(ex?'_'+ex:'')+'.js');})(document,'script');
})('YEgkB8lbGVx4ep3Z');
```

## Andata Tag Manager

```js
(function(d,id){
  if(d.getElementById(id)) return;
  var s=d.createElement('script'); s.id=id; s.async=1;
  s.src='https://tagmanager.andata.ru/api/v1/container/9c0aaeb2-3b5c-4f86-aebd-786c79f7314b/published/code.js';
  var f=d.getElementsByTagName('script')[0]; f.parentNode.insertBefore(s,f);
})(document,'andata-tm');
```

## OneSignal (веб-пуш подписки, было помечено в коде как «тест»)

```js
if (!__isBot && !__isDevHost) {
  (function(d){
    var s = d.createElement('script');
    s.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
    s.defer = true;
    d.head.appendChild(s);
  })(document);
  window.OneSignalDeferred = window.OneSignalDeferred || [];
  OneSignalDeferred.push(async function (OneSignal) {
    await OneSignal.init({ appId: '61a5f4f0-28a5-4967-94fe-559a9e55a2d0' });
  });
}
```

ID для справки: Leadfeeder `YEgkB8lbGVx4ep3Z`, Andata контейнер
`9c0aaeb2-3b5c-4f86-aebd-786c79f7314b`, OneSignal appId
`61a5f4f0-28a5-4967-94fe-559a9e55a2d0`.
