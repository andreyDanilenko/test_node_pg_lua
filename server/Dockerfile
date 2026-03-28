FROM node:24-alpine

WORKDIR /app

RUN apk update && apk upgrade --no-cache

COPY package*.json ./

RUN npm ci --only=production --no-audit --no-fund

# Копируем исходники
COPY . .

RUN npm run build

RUN npm prune --production && \
    rm -rf src/ node_modules/.cache

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs && \
    chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 3000

CMD ["node", "dist/server.js"]
