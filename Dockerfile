FROM oven/bun:latest

RUN apt-get update && apt-get install -y imagemagick && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY . .
EXPOSE 3000

CMD ["bun", "run", "server/index.ts"]
