FROM node:22-alpine AS base

WORKDIR /app

COPY package*.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/mobile/package.json apps/mobile/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN npm ci

COPY . .

RUN npm run db:generate
RUN npm --workspace @ai-salon/api run build

EXPOSE 4000

CMD ["npm", "--workspace", "@ai-salon/api", "run", "start:prod"]
