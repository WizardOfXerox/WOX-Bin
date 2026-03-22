# FFmpeg + Node for WOX-Bin conversion worker. Build from repo root:
#   docker build -f workers/convert/Dockerfile -t woxbin-convert-worker .
FROM node:20-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ENV NODE_ENV=production

CMD ["npx", "tsx", "workers/convert/run.ts"]
