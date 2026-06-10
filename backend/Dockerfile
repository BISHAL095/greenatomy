FROM node:20-bookworm-slim

WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY prisma ./prisma
COPY prisma.config.js ./

RUN npm ci \
  && DATABASE_URL="postgresql://user:pass@localhost:5432/greenatomy" npx prisma generate \
  && npm prune --omit=dev

COPY config ./config
COPY controllers ./controllers
COPY lib ./lib
COPY middlewares ./middlewares
COPY routes ./routes
COPY services ./services
COPY utils ./utils
COPY validators ./validators
COPY index.js ./

USER node
EXPOSE 8000
CMD ["node", "index.js"]
