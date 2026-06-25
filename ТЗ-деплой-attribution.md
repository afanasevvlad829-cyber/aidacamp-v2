# ТЗ: Деплой attribution.aidacamp.ru

## Цель
Развернуть веб-сервис атрибуции клиентов АйДаКемп на сервере 159.194.223.55.
179 записей (105 клиентов + 74 лида) с проверенными источниками привлечения.

## Файлы для деплоя
Все файлы лежат в ~/Downloads/ (скачать из Claude outputs):
- seed-inline.js (48KB) — создаёт таблицу PostgreSQL + 179 записей (данные внутри)
- server.js — Express-сервер :3847, два роута: / (таблица) и /:id (карточка)
- update-crm.js — расставляет [АТРИБУЦИЯ] ссылки в примечаниях AlfaCRM
- deploy.sh — systemd + nginx + SSL одной командой
- package.json — зависимости (express + pg)

## Сервер
- IP: 159.194.223.55
- SSH: ssh -i ~/.ssh/aidacamp_prod root@159.194.223.55
- PostgreSQL: БД aidacamp_stats, user aidacamp
- Рабочая директория: /opt/aidacamp-attribution/ (создать)

## Шаги

### 1. Скопировать файлы
```
mkdir -p /opt/aidacamp-attribution
scp seed-inline.js server.js update-crm.js deploy.sh package.json root@159.194.223.55:/opt/aidacamp-attribution/
```

### 2. На сервере
```
cd /opt/aidacamp-attribution
npm install --production
node seed-inline.js          # Table OK + Inserted: 179/179
```

### 3. Systemd
```
cat > /etc/systemd/system/attribution.service << 'EOF'
[Unit]
Description=AidaCamp Attribution Server
After=network.target postgresql.service
[Service]
Type=simple
WorkingDirectory=/opt/aidacamp-attribution
ExecStart=/usr/bin/node server.js
Restart=on-failure
Environment=PORT=3847
[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload && systemctl enable attribution && systemctl restart attribution
```

### 4. Nginx
```
cat > /etc/nginx/sites-available/attribution << 'EOF'
server {
    listen 80;
    server_name attribution.aidacamp.ru;
    location / {
        proxy_pass http://127.0.0.1:3847;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
EOF
ln -sf /etc/nginx/sites-available/attribution /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

### 5. DNS A-запись
attribution.aidacamp.ru -> 159.194.223.55

### 6. SSL
```
certbot --nginx -d attribution.aidacamp.ru --non-interactive --agree-tos -m hello@codims.ru
```

### 7. Обновить CRM
```
ALFA_EMAIL=pbalgoritmika@gmail.com ALFA_KEY=8db19d5a-837e-11e9-9333-0cc47a6ca50e ATTR_HOST=attribution.aidacamp.ru node update-crm.js
```
Добавит в каждую карточку: [АТРИБУЦИЯ] Источник (100%) | https://attribution.aidacamp.ru/XXXX
AlfaCRM API: host codim.s20.online, branch=5, заголовок X-ALFACRM-TOKEN.

## Чеклист приёмки
- [ ] https://attribution.aidacamp.ru/ — 179 записей
- [ ] https://attribution.aidacamp.ru/5022 — Озеров (Директ 100%)
- [ ] https://attribution.aidacamp.ru/?type=client&source=Директ — 2 записи
- [ ] systemctl is-active attribution = active
- [ ] SSL: curl -sI https://attribution.aidacamp.ru | head = HTTP/2 200
- [ ] В AlfaCRM #5022 есть [АТРИБУЦИЯ] Яндекс Директ
