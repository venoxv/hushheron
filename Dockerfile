FROM node:22-bookworm-slim AS builder

WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
ENV HUSHHERON_DATA_DIR=/data
COPY --from=builder /app /app
RUN mkdir /data && chown -R node:node /app /data
USER node
EXPOSE 3000
CMD ["npm", "run", "start"]
