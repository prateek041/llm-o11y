FROM oven/bun:1.2
WORKDIR /usr/src/app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
EXPOSE 9090
CMD ["bun", "run", "src/server.ts"]
