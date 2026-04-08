## 1. Что снято в baseline
Снят полный baseline snapshot pack для 4 режимов и special zones из текущего принятого состояния `dist/index.html`.

## 2. По каким режимам снято
- Desktop Full
- Desktop Compact
- Mobile Full
- Mobile Compact

## 3. Какие special zones включены
- hero seam
- booking overlap
- compact modal anchored to hero
- video block
- team block
- contacts/socials
- map button
- footer/legal block

## 4. Где baseline хранится
Основное хранилище baseline:
- `artifacts/baseline/desktop-full/*`
- `artifacts/baseline/desktop-compact/*`
- `artifacts/baseline/mobile-full/*`
- `artifacts/baseline/mobile-compact/*`
- `artifacts/baseline/special-zones/*`

## 5. Как использовать baseline в следующих патчах
- Использовать baseline как визуальный эталон.
- В новых patch-пакетах добавлять `after` скрины только изменённых зон.
- `before` класть опционально и только по затронутым зонам.
- При необходимости добавлять короткий comparison note относительно baseline.

## 6. Что baseline не обновляется без явного подтверждения
Baseline не переснимается автоматически.
Любое обновление baseline возможно только после явного ручного подтверждения.
