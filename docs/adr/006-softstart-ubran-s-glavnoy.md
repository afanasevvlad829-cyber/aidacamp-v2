# ADR-006. SoftStart убран с главной как дубль CTA

Дата: 2026-05-02 (design audit), зафиксировано 2026-07-17 · Статус: принято
Источник: комментарий в `src/pages/index.astro` (строка ~24): «SoftStart removed (дубль CTA, см. design audit 2026-05-02)»; рядом аналогичные пометки: BookingBar removed, SummerCta removed, ShiftOccupancy removed.

## Контекст
На главной накопилось несколько блоков с одинаковым призывом к брони — конверсионный
путь размывался дублями CTA.

## Решение
Компонент SoftStart с главной убран как дубль CTA (design audit 2026-05-02).
Тем же аудитом убраны SummerCta (дубль sticky CTA) и BookingBar (бронь — только
в модалке смены, per design system Section 18).

## Следствия
- Не возвращать SoftStart/SummerCta/BookingBar на главную без пересмотра
  design audit.
- Точки брони на главной: модалка смены + StickyCta.
