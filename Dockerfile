FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4173
ENV HOST=0.0.0.0
ENV BOARD_DB=/app/data/board.db
COPY --from=builder /app/package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
COPY server.js ./server.js
# create writable volume for board file
VOLUME ["/app/data"]
EXPOSE 4173
CMD ["node", "server.js"]
