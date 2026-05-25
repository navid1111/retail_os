FROM node:22-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS build

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json tsconfig.json ./
COPY . .
RUN npm run build

RUN npm prune --omit=dev

FROM node:22-alpine AS runtime

ENV NODE_ENV=production

WORKDIR /app

RUN addgroup -S nodejs && adduser -S nodejs -G nodejs

COPY --from=build --chown=nodejs:nodejs /app/package.json ./package.json
COPY --from=build --chown=nodejs:nodejs /app/package-lock.json ./package-lock.json
COPY --from=build --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=nodejs:nodejs /app/dist ./dist

USER nodejs

EXPOSE 5000

CMD ["node", "dist/server.js"]
