FROM node:22.21.1-bookworm-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY src ./src
COPY tests ./tests
RUN mkdir -p docs/evidence
CMD ["sh","-c","npm test && npm run test:integration"]
