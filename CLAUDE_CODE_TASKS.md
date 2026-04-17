# Задачи Claude Code — 16 апреля 2026

## СРОЧНО: Обновить H1-подмены в Hero.astro

Файл: `src/components/Hero.astro` → объект `variants`

### Изменить существующие ключи:

```js
edu: {
  title: 'Лето без телефона — возможно',
  subtitle: 'Дети создают IT-проекты и живут в реальном мире. Смены от 2 недель.'
},
books: {
  title: 'Лето с пользой — это реально',
  subtitle: 'Дети учатся программировать и делают настоящие проекты. Без телефонов. 66 км.'
},
result: {
  title: 'Уехал геймером — вернулся разработчиком',
  subtitle: 'Опыт сложных задач, ошибок и решений. Ребёнок уезжает с ощущением: я справляюсь сам.'
},
parents: {
  title: 'Две недели без «мама, скучно»',
  subtitle: 'Ребёнок в IT-лагере: проекты, команда, бассейн. Без телефонов. 66 км от Москвы.'
},
```

### Деплой: dev → проверить → prod
```bash
./scripts/deploy.sh dev
# проверить: https://dev.aidacamp.ru/?utm_content=edu
# проверить: https://dev.aidacamp.ru/?utm_content=books
# проверить: https://dev.aidacamp.ru/?utm_content=result
# проверить: https://dev.aidacamp.ru/?utm_content=parents
./scripts/deploy.sh prod
```

---

## Обновить тексты объявлений Директ (если SSH недоступен через Claude)

```python
import json, urllib.request
TOKEN = # из /opt/etl/.env → DIRECT_TOKEN

ads = [
    {'Id': 17678933177, 'TextAd': {'Title': 'Уехал геймером — вернулся разработчиком', 'Text': 'Дети создают IT-проекты и живут в реальном мире. Смены от 2 недель.', 'Title2': 'Лагерь 66 км от Москвы', 'Href': 'https://aidacamp.ru/'}},
    {'Id': 17678933182, 'TextAd': {'Title': 'Лето без телефона — возможно', 'Text': 'Дети создают IT-проекты и живут в реальном мире. Смены от 2 недель.', 'Title2': 'Лагерь 66 км от Москвы', 'Href': 'https://aidacamp.ru/'}},
    {'Id': 17678933183, 'TextAd': {'Title': 'Лето с пользой — это реально', 'Text': 'Дети учатся программировать и делают настоящие проекты. Без телефонов. 66 км.', 'Title2': 'Лагерь для детей 8–14 лет', 'Href': 'https://aidacamp.ru/'}},
]
payload = json.dumps({'method': 'update', 'params': {'Ads': ads}})
req = urllib.request.Request('https://api.direct.yandex.com/json/v5/ads', data=payload.encode(),
    headers={'Authorization': f'Bearer {TOKEN}', 'Client-Login': 'kv145', 'Content-Type': 'application/json'})
print(json.loads(urllib.request.urlopen(req, timeout=15).read()))
```

## Добавить корректировки ставок РСЯ (708698819)

```python
import json, urllib.request
TOKEN = # из /opt/etl/.env → DIRECT_TOKEN

mods = [
    {'CampaignId': 708698819, 'DesktopAdjustment': {'BidModifier': 125}},           # +25% десктоп
    {'CampaignId': 708698819, 'DemographicsAdjustments': [{'Gender':'GENDER_FEMALE','Age':'AGE_35_44','BidModifier':130}]},  # +30% женщины 35-44
    {'CampaignId': 708698819, 'DemographicsAdjustments': [{'Gender':'GENDER_FEMALE','Age':'AGE_45_54','BidModifier':120}]},  # +20% женщины 45-54
    {'CampaignId': 708698819, 'MobileAdjustment': {'BidModifier': 70}},              # -30% мобайл
]
for m in mods:
    payload = json.dumps({'method': 'add', 'params': {'BidModifiers': [m]}})
    req = urllib.request.Request('https://api.direct.yandex.com/json/v5/bidmodifiers', data=payload.encode(),
        headers={'Authorization': f'Bearer {TOKEN}', 'Client-Login': 'kv145', 'Content-Type': 'application/json'})
    r = json.loads(urllib.request.urlopen(req, timeout=15).read())
    print(r)
```

## Выключить объявление 17678933179

```python
payload = json.dumps({'method': 'suspend', 'params': {'SelectionCriteria': {'Ids': [17678933179]}}})
req = urllib.request.Request('https://api.direct.yandex.com/json/v5/ads', data=payload.encode(),
    headers={'Authorization': f'Bearer {TOKEN}', 'Client-Login': 'kv145', 'Content-Type': 'application/json'})
print(json.loads(urllib.request.urlopen(req, timeout=15).read()))
```
