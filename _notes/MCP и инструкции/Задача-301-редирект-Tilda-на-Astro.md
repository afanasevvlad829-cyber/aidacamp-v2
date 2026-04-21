# Задача: 301 редирект старых Tilda-страниц на новые Astro-страницы

**Дата постановки:** 2026-04-19
**Приоритет:** ⭐⭐⭐ (High ROI, низкие усилия)
**Зона:** инфраструктура / DNS / Tilda / Cloudflare / nginx
**Исполнитель:** оркестратор или отдельный инфра-агент (не worker aidacamp-v2)

---

## 🎯 Проблема

По данным Google Search Console за последние 90 дней:

- **26 Tilda-URL** вида `aidacamp.ru/tpost/XXX-...` собирают **~4 200 impressions/квартал**
- **CTR = 0.15-0.6%** (критически низкий) — позиции 3-17 в Google, но почти никто не кликает
- Пользователи видят в выдаче **старый Tilda-контент** без CTA и без Позиционирования
- **Астро-версии** большинства статей уже существуют (переписали под Позиционирование + добавили CTA на LP), но Google их не показывает — они новые, а Tilda проиндексирована давно

**Потеря:** примерно **500-800 визитов/год** с плохих Tilda-страниц vs возможные **2 000-4 000 визитов/год** с тех же запросов если переключить Google на Astro.

---

## 📋 Полный маппинг Tilda → Astro

### ⭐ Топ-5 жирных (обязательно)

| От (Tilda) | К (Astro) | Imps/90д | Позиция Google |
|---|---|---|---|
| `/tpost/pvng3n7ol1-problemi-v-obschenii-podrostkov-kak-ih-p` | `/stati/problemy-v-obschenii-podrostkov/` | 878 | 17.4 |
| `/tpost/i1208avt81-nizkaya-samootsenka-u-rebenka-prichini-i` | `/stati/nizkaya-samootsenka-u-rebenka/` | 645 | 10.4 |
| `/tpost/i5mpjtzy51-soveti-dlya-roditelei-podrostok-ne-hoche` | `/stati/podrostok-ne-hochet-uchitsya/` | 557 | **5.5** |
| `/tpost/2m7evlurk1-kak-pomoch-podrostku-kotorii-nichego-ne` | `/stati/kak-pomoch-podrostku-kotoryj-nichego-ne-hochet/` | 510 | 13.2 |
| `/tpost/r51b8evel1-problema-zavisimosti-ot-sotsialnih-setei` | `/stati/zavisimost-ot-telefona-u-podrostkov/` | 312 | 7.9 |

### 🎯 Средние (желательно)

| От (Tilda) | К (Astro) | Imps/90д |
|---|---|---|
| `/stati/tpost/se7n9vvin1-kak-kompyuternie-igri-vliyayut-na-mozg-p` | `/stati/zavisimost-ot-kompyuternyh-igr/` | 280 |
| `/tpost/8h6j3e22g1-zavisimost-ot-telefona-u-detei-kak-borot` | `/stati/zavisimost-ot-telefona-u-podrostkov/` | 233 |
| `/tpost/tonh1ogp11-igrovaya-zavisimost-priznaki-posledstviy` | `/stati/igromaniya-u-detej/` | 205 |
| `/tpost/jhxf4cog71-luchshii-detskii-lager-v-podmoskove-otdi` | `/detskiy-lager-podmoskove/` | 201 |
| `/stati/tpost/ai1z0m7ni1-putevki-v-lager-dlya-detei-sotrudnikov-v` | `/dlya-kompaniy/` | 151 |
| `/tpost/01jmna9k31-puti-resheniya-zavisimosti-mladshih-shko` | `/stati/kak-izbavitsya-ot-zavisimosti-ot-igr/` | 83 |
| `/tpost/9dm6t69pj1-letnii-lager-graficheskii-dizain-dlya-po` | `/3d-modelirovanie-lager/` | 59 |
| `/tpost/og9xgkpn61-letnie-aktivnosti-dlya-detei-kuda-det-re` | `/stati/kuda-det-rebenka-letom/` | 53 |

### 📄 Хвост (по желанию)

| От (Tilda) | К (Astro) | Imps/90д |
|---|---|---|
| `/tpost/fu18rpf3f1-igrovaya-zavisimost-u-detei-kak-spravits` | `/stati/igromaniya-u-detej/` | 42 |
| `/tpost/zdi1tsf1o1-zavisimost-ot-kompyuternih-igr-u-podrost` | `/stati/zavisimost-ot-kompyuternyh-igr/` | 39 |
| `/tpost/5f3mfy2b71-letnii-lager-dlya-detei-ot-6-do-15-let` | `/detskiy-lager/` | 31 |
| `/tpost/rtypf41iy1-detskii-lager-mainkraft-letnii-otdih-dly` | `/minecraft-lager/` | 30 |
| `/tpost/vds0e300u1-zavisimost-ot-gadzhetov-prichini-priznak` | `/stati/zavisimost-ot-telefona-u-podrostkov/` | 26 |
| `/tpost/5pt411r9r1-detskii-lager-podmoskove-leto-2025-otdih` | `/detskiy-lager-podmoskove/` | 23 |
| `/stati/tpost/rfsocy9b51-razbirayu-negativnie-otzivi-pro-lagerya` | `/` (главная — блок отзывов) | 16 |
| `/tpost/3r1yvj6531-chto-delat-esli-podrostok-ne-hochet-uchi` | `/stati/podrostok-ne-hochet-uchitsya/` | 15 |
| `/tpost/yv7id2d0b1-detskii-lager-na-leto-2025-dlya-vashih-d` | `/lager-na-leto-2026/` | 15 |
| `/tpost/20sdh5b1y1-lager-mainkraft-igrovie-kanikuli-dlya-de` | `/minecraft-lager/` | 12 |
| `/tpost/abbc4u2fa1-lager-v-podmoskove-na-leto-2025-tseni-br` | `/lager-na-leto-2026/` | 7 |
| `/tpost/x4uc9ngha1-detskii-lager-v-podmoskove-otdih-dlya-de` | `/detskiy-lager-podmoskove/` | 5 |
| `/tpost/r27684nhy1-pobedi-zavisimost-ot-igr-soveti-i-strate` | `/stati/kak-izbavitsya-ot-zavisimosti-ot-igr/` | 2 |

**Итого: 26 редиректов.**

---

## 🔧 Где делать редирект — нужно проверить

Тут важно понять архитектуру сайта сейчас. Доменa `aidacamp.ru` есть `/tpost/*` URL — откуда они отдаются?

### Вариант A: Tilda отдаёт `/tpost/*` через проксирование

Если в настройках DNS `aidacamp.ru` стоит CNAME на Tilda (`*.tilda.ru`), и только определённые пути перехвачены через Astro (на сервере `159.194.223.55`) — то старый Tilda-контент всё ещё доступен.

**Проверка:** `curl -I https://aidacamp.ru/tpost/i5mpjtzy51-... 2>&1 | head -10` — смотрим заголовки. Если `server: tildacdn.com` или подобный — Tilda. Если `nginx/Node.js` — наш сервер.

### Вариант B: Редирект на уровне nginx/Cloudflare

Если весь трафик aidacamp.ru идёт через наш nginx на сервере `159.194.223.55`, и `/tpost/*` отдаёт 404 или просто не существует — тогда просто добавить 301 правила в nginx config.

### Вариант C: Редирект внутри Tilda

Если Tilda-страницы публикуются через их панель — в Tilda UI есть **Настройки проекта → Редиректы** (или `Settings → SEO → 301 Redirects`), можно добавить сразу все 26 пар.

---

## 🛠 Как выполнить — по вариантам

### Вариант A/B (через nginx на сервере)

На сервере `159.194.223.55` найти nginx-конфиг сайта:

```bash
ls /etc/nginx/sites-enabled/
grep -r 'aidacamp' /etc/nginx/
```

Добавить в `server { ... }` блок:

```nginx
# 301 редиректы со старых Tilda-URL на Astro — 19.04.2026
location ~ ^/tpost/pvng3n7ol1 { return 301 /stati/problemy-v-obschenii-podrostkov/; }
location ~ ^/tpost/i1208avt81 { return 301 /stati/nizkaya-samootsenka-u-rebenka/; }
location ~ ^/tpost/i5mpjtzy51 { return 301 /stati/podrostok-ne-hochet-uchitsya/; }
location ~ ^/tpost/2m7evlurk1 { return 301 /stati/kak-pomoch-podrostku-kotoryj-nichego-ne-hochet/; }
location ~ ^/tpost/r51b8evel1 { return 301 /stati/zavisimost-ot-telefona-u-podrostkov/; }
location ~ ^/stati/tpost/se7n9vvin1 { return 301 /stati/zavisimost-ot-kompyuternyh-igr/; }
location ~ ^/tpost/8h6j3e22g1 { return 301 /stati/zavisimost-ot-telefona-u-podrostkov/; }
location ~ ^/tpost/tonh1ogp11 { return 301 /stati/igromaniya-u-detej/; }
location ~ ^/tpost/jhxf4cog71 { return 301 /detskiy-lager-podmoskove/; }
location ~ ^/stati/tpost/ai1z0m7ni1 { return 301 /dlya-kompaniy/; }
location ~ ^/tpost/01jmna9k31 { return 301 /stati/kak-izbavitsya-ot-zavisimosti-ot-igr/; }
location ~ ^/tpost/9dm6t69pj1 { return 301 /3d-modelirovanie-lager/; }
location ~ ^/tpost/og9xgkpn61 { return 301 /stati/kuda-det-rebenka-letom/; }
location ~ ^/tpost/fu18rpf3f1 { return 301 /stati/igromaniya-u-detej/; }
location ~ ^/tpost/zdi1tsf1o1 { return 301 /stati/zavisimost-ot-kompyuternyh-igr/; }
location ~ ^/tpost/5f3mfy2b71 { return 301 /detskiy-lager/; }
location ~ ^/tpost/rtypf41iy1 { return 301 /minecraft-lager/; }
location ~ ^/tpost/vds0e300u1 { return 301 /stati/zavisimost-ot-telefona-u-podrostkov/; }
location ~ ^/tpost/5pt411r9r1 { return 301 /detskiy-lager-podmoskove/; }
location ~ ^/stati/tpost/rfsocy9b51 { return 301 /; }
location ~ ^/tpost/3r1yvj6531 { return 301 /stati/podrostok-ne-hochet-uchitsya/; }
location ~ ^/tpost/yv7id2d0b1 { return 301 /lager-na-leto-2026/; }
location ~ ^/tpost/20sdh5b1y1 { return 301 /minecraft-lager/; }
location ~ ^/tpost/abbc4u2fa1 { return 301 /lager-na-leto-2026/; }
location ~ ^/tpost/x4uc9ngha1 { return 301 /detskiy-lager-podmoskove/; }
location ~ ^/tpost/r27684nhy1 { return 301 /stati/kak-izbavitsya-ot-zavisimosti-ot-igr/; }

# Catch-all для остальных /tpost/* — на главную (чтобы ничего не отдавало 404)
location /tpost/ { return 301 /; }
```

Затем:

```bash
nginx -t  # проверка синтаксиса
systemctl reload nginx
```

### Вариант C (через Tilda UI)

1. Войти в tilda.cc, открыть проект aidacamp.ru
2. **Настройки проекта → SEO → 301 редиректы**
3. Добавить 26 пар из таблицы выше
4. Опубликовать проект

---

## ✅ Проверка после внедрения

```bash
# Должны вернуть 301 + Location на новый URL
curl -I https://aidacamp.ru/tpost/i5mpjtzy51-soveti-dlya-roditelei-podrostok-ne-hoche

# Ожидаемый ответ:
# HTTP/2 301
# location: /stati/podrostok-ne-hochet-uchitsya/
```

Прогнать 5 топовых URL минимум.

---

## 📣 После редиректов — дать сигнал Google и Яндексу

### Google Search Console
1. Открыть GSC → `sc-domain:aidacamp.ru`
2. **Sitemap → Submit** свежий `sitemap.xml` (чтобы Google обратил внимание на новые `/stati/*` URL)
3. По каждому topу Astro-URL сделать **URL Inspection → Request Indexing**:
   - `/stati/problemy-v-obschenii-podrostkov/`
   - `/stati/nizkaya-samootsenka-u-rebenka/`
   - `/stati/kak-pomoch-podrostku-kotoryj-nichego-ne-hochet/`

### Яндекс.Вебмастер
1. Войти в webmaster.yandex.ru → aidacamp.ru
2. **Переобход страниц** — добавить те же Astro-URL (лимит 20/сутки)
3. **Индексирование → Переезд сайта (если используется смена CMS)** — не нужен если сам домен не меняется

---

## 🎁 Бонус: IndexNow (ускоренная индексация Яндекс + Bing)

Yandex поддерживает IndexNow — мгновенная нотификация о новых URL. Можно скриптом на сервере:

```bash
KEY="YOUR_INDEX_NOW_KEY"
for url in \
    "https://aidacamp.ru/stati/problemy-v-obschenii-podrostkov/" \
    "https://aidacamp.ru/stati/nizkaya-samootsenka-u-rebenka/" \
    "https://aidacamp.ru/stati/kak-pomoch-podrostku-kotoryj-nichego-ne-hochet/" \
; do
  curl -X POST "https://api.indexnow.org/indexnow?url=${url}&key=${KEY}"
done
```

Ключ получается на indexnow.org за 1 минуту, файл ключа кладётся в `public/<key>.txt`.

---

## 📊 Ожидаемый эффект

Через 2-6 недель после внедрения редиректов:

| Метрика | До | После |
|---|---|---|
| Google impressions с перенесённых URL | 4 200/кв | 4 200/кв (сохраняются) |
| CTR | 0.3% | **5-10%** (новые Astro с правильными title + CTA) |
| Клики/квартал | ~12 | **200-400** |
| Визитов в год | 50 | **800-1 600** |
| Лиды (CR 1.5%, close 15%) | 0-1 | **10-20 продаж × 65к = 650к-1.3М ₽** |

---

## 🔍 Где искать информацию о стеке сайта

Если неясно куда именно делать редиректы, проверить:

```bash
# 1. Как отдаётся /tpost/ сейчас?
curl -I https://aidacamp.ru/tpost/i5mpjtzy51-soveti-dlya-roditelei-podrostok-ne-hoche

# 2. На сервере — что обслуживает aidacamp.ru?
ssh root@159.194.223.55 "nginx -T 2>/dev/null | grep -A 20 'server_name.*aidacamp'"

# 3. DNS-проверка
dig aidacamp.ru A +short
dig aidacamp.ru CNAME +short
```

---

## 🔗 Связанные задачи

- **Остался Tilda-контент который НЕ перенесён на Astro:**
  - `/tpost/jhxf4cog71-luchshii-detskii-lager-v-podmoskove-otdi` (201 imps) — есть дубликат `/detskiy-lager-podmoskove/`, но контент другой
  - `/tpost/r51b8evel1-problema-zavisimosti-ot-sotsialnih-setei` (312 imps) — прямой пары нет, редиректим на близкую тему
  - Если хочется качественнее — отдельная задача: создать Astro-статью «Зависимость от социальных сетей у подростков»

- **После удаления Tilda-страниц:** удалить их из sitemap.xml (или в Tilda, или в нашем Astro sitemap plugin — зависит от архитектуры).

---

**Запись в `.claude/TASKS.md` — см. запись от 2026-04-19 «SEO: 301-редирект Tilda»**
