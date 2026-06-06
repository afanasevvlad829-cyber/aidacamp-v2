# Изолированный образ для dev-агента (запускается одноразово, под non-root).
# Безопасность: внутри только инструменты + код, клонируемый из GitHub в рантайме.
# Никаких прод-секретов/файлов не запекается. claude bypass работает (non-root).
FROM node:22-bookworm-slim

# Инструменты: git (worktree/commit), gh (PR), ca-certs, curl (установка gh)
RUN apt-get update && apt-get install -y --no-install-recommends \
      git openssh-client ca-certificates curl jq \
  && curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg \
      -o /usr/share/keyrings/githubcli-archive-keyring.gpg \
  && echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" \
      > /etc/apt/sources.list.d/github-cli.list \
  && apt-get update && apt-get install -y --no-install-recommends gh \
  && rm -rf /var/lib/apt/lists/*

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
