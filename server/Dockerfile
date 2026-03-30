FROM node:24-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:24-alpine
WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

COPY --from=builder /app/dist ./dist
COPY migrations/ ./migrations/


COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs && \
    chown -R nodejs:nodejs /app
USER nodejs

EXPOSE 3000
ENTRYPOINT ["docker-entrypoint.sh"]
