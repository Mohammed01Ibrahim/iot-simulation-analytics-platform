FROM node:22.21.1-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY web ./web
COPY vite.config.js ./
RUN npm run build
FROM node:22.21.1-bookworm-slim
ENV NODE_ENV=production HOST=0.0.0.0
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY src ./src
COPY scripts ./scripts
COPY --from=build /app/dist ./dist
USER node
EXPOSE 4100
CMD ["node","src/server.js"]
