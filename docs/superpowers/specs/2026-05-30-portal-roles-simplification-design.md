# Упрощение модели прав портала — дизайн

**Дата:** 2026-05-30
**Статус:** решения утверждены владельцем. **Исполнять ПОСЛЕ пилота prizes** (см.
`2026-05-30-prizes-decomposition-design.md`). Здесь — только фиксация модели, чтобы не потерять.

## Проблема (текущее переусложнение)

- Роль проверяется в ~7 роутах разными наборами `ALLOWED_ROLES` (`['admin']`, `['admin','rukovoditel']`, `STAFF_ROLES`…).
- Разные роли видят разные представления/меню.
- Механика «Смотреть как» (view-as) с матрицей даунгрейда: `portal_view_as` cookie,
  `VIEW_AS_ALLOWED` в `middleware.ts`, переключатель в `PortalLayout.astro`, роут `api/portal/view-as.ts`.

## Целевая модель (утверждена)

**Уровни прав (3):** `admin` > `rukovoditel` > `staff`.
`staff` = преподаватель + вожатый (права идентичны; роли остаются как метки в UI и в БД,
но при проверке прав сворачиваются в один уровень). `student` — отдельный контур (`portal_kid`),
этой моделью не затрагивается.

**Способности (capabilities):**

| Capability | admin | rukovoditel | staff (teacher/vozhaty) |
|---|---|---|---|
| `MANAGE_USERS` (инвайты, setRole, merge, add-manual) | ✅ | ❌ | ❌ |
| `ASSIGN_RESPONSIBLES` (назначать/переназначать ответственных за мероприятия) | ✅ | ✅ | ❌ |
| Операционные модули (призы/экономика, штрафы, расселение, уроки, методички, медиа) | ✅ | ✅ | ✅ |
| Видеть всех и все данные (единое представление) | ✅ | ✅ | ✅ |
| Создать активность → автоматически стать её ответственным | ✅ | ✅ | ✅ |

**view-as — удаляется полностью.**

## План реализации (после prizes)

1. **`src/lib/portalPerms.ts`** — единый источник правды:
   ```ts
   export type Tier = 'admin' | 'rukovoditel' | 'staff';
   export type Capability = 'MANAGE_USERS' | 'ASSIGN_RESPONSIBLES';
   export function tierOf(role: string): Tier | null;   // teacher|vozhaty → 'staff'
   export function can(role: string, cap: Capability): boolean;
   export function isStaff(role: string): boolean;        // любой сотрудник (не student)
   ```
   Правила: `MANAGE_USERS` → admin; `ASSIGN_RESPONSIBLES` → admin|rukovoditel; операционный
   доступ → `isStaff`.

2. **Заменить ~7 локальных `ALLOWED_ROLES`** в `api/portal/*` на `can()`/`isStaff()`.
   Особое внимание: модули, которые сейчас admin+ruk (`economy.ts`, `prize-ops.ts`, `penalty.ts`,
   `rasselenie.ts`, `kids.ts`, `economy`/prizes-страницы) → открыть всем сотрудникам (`isStaff`),
   КРОМЕ действий управления людьми (остаются `MANAGE_USERS`).

3. **prizes/economy-страницы**: гейт `['admin','rukovoditel']` → `isStaff` (после пилота prizes
   это одна строка в `prizes.astro` + `economy`-роут).

4. **Ответственные за мероприятия**: при создании активности создатель пишется в
   `portal_event_responsible`; reassign — только `ASSIGN_RESPONSIBLES`. Сверить с
   `portalShiftPerms.ts` / `canEditEvent`.

5. **Удалить view-as**: роут `api/portal/view-as.ts`, cookie `portal_view_as`, `VIEW_AS_ALLOWED`
   и связанная ветка в `middleware.ts`, переключатель в `PortalLayout.astro` (строки ~25–41, 100).
   `Astro.locals.portalViewAs`/`portalRealRole` — вычистить, оставить только `portalRole`.

6. **Выровнять представления**: меню/навигация в `PortalLayout` и `portal/index.astro` —
   один набор пунктов для всех сотрудников (видимость по `isStaff`, спец-пункты по `can()`).

## Тесты

`portalPerms.test.ts` — таблица истинности `can()`/`tierOf()`/`isStaff()` для всех 5 ролей × capability.
После замены роутов — smoke: teacher открывает призы/штрафы (раньше редиректило), staff не может
инвайтить, ruk может переназначать ответственного.

## Риск

- Открытие модулей всем сотрудникам — продуктовое решение владельца (утв.). Откат тривиален
  (поменять `isStaff` назад на `can(MANAGE_*)`).
- Удаление view-as затрагивает middleware и layout — делать отдельным коммитом, smoke на всех ролях.
