# Restic-снапшот прод-данных

Читай перед правкой, которую нельзя откатить через git: миграции, массовое удаление/перезапись файлов, `images/gallery`, `.env`, БД.

```
ssh aidacamp '/opt/restic-snapshot.sh'     # или run(service="ssh", command="/opt/restic-snapshot.sh")
```

- Репозиторий: `rclone:yadisk:aidacamp-snapshots/restic` (Яндекс.Диск, вне сервера). Пароль — `/root/.restic-pass`.
- Автоматически: `restic-snapshot.timer` на сервере, раз в ночь (раньше был в `deploy.sh`, убран 2026-07-26). Поэтому перед своей правкой снимай свежий вручную: ночной может быть старым.
- Ротация: 3 суточных (`--keep-daily 3`). Шифрование restic.
- Откат файла: `restic -r rclone:yadisk:aidacamp-snapshots/restic --password-file /root/.restic-pass restore latest --target /tmp/restore --include <путь>`.
- Откат самой выкатки (код) — не restic, а `./scripts/rollback.sh prod`.
