# PageSpeed

## Скор: 69 → 82 (мобиль)

## Сделано
- AVIF конвертация всех изображений
- Hero: loading=eager fetchpriority=high
- Cache-Control 1-year immutable
- width/height у img в 6 компонентах

## Осталось — даст +10–15 баллов

### VideoFacade.astro (приоритет)
Kinescope грузится eagerly. Решение:
- Показываем AVIF poster
- Плеер только по клику

### Cookies баннер
bottom:0 → top:0 на мобиле (перекрывает CTA)
