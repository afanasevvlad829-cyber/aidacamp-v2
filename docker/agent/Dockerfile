# Изолированный образ для dev-агента (запускается одноразово, под non-root).
# Безопасность: внутри только инструменты + код, клонируемый из Forgejo (свой
# git.aidaplus.ru) в рантайме. Никаких прод-секретов/файлов не запекается.
# claude bypass работает (non-root).
#
# С 08.09.2026 репо на Forgejo (GitHub-аккаунт заблокирован) — gh заменён на
# tea (официальный CLI Gitea/Forgejo). У tea нет apt-репозитория, ставим
# статическим бинарём с релизов gitea.com (тот же путь, что gh раньше через
# свой apt-репо, просто без пакетного менеджера).
FROM node:22-bookworm-slim

# Инструменты: git (worktree/commit), tea (PR), ca-certs, curl (установка tea),
# python3 — нужен для scripts/check-banned-words.sh (guard в npm run build).
# Без него guard падал и агенты ломали проверку, портируя её на node.
RUN apt-get update && apt-get install -y --no-install-recommends \
      git openssh-client ca-certificates curl jq python3 \
  && rm -rf /var/lib/apt/lists/* \
  && TEA_ARCH=$(dpkg --print-architecture) \
  && TEA_VERSION=$(curl -fsSL https://gitea.com/api/v1/repos/gitea/tea/releases/latest | jq -r .tag_name | sed 's/^v//') \
  && curl -fsSL "https://gitea.com/gitea/tea/releases/download/v${TEA_VERSION}/tea-${TEA_VERSION}-linux-${TEA_ARCH}" \
      -o /usr/local/bin/tea \
  && chmod +x /usr/local/bin/tea \
  && tea --version

# claude-code той же версии, что на сервере
RUN npm install -g @anthropic-ai/claude-code@2.1.167

# Используем штатного non-root юзера node (UID 1000) из базового образа —
# claude блокирует bypass под root, под node работает; node = слой изоляции.
COPY run-task.sh /home/node/run-task.sh
RUN chmod +x /home/node/run-task.sh && chown -R node:node /home/node \
    && mkdir -p /work && chown node:node /work

USER node
WORKDIR /work
ENV HOME=/home/node
ENTRYPOINT ["/home/node/run-task.sh"]
