FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY server/package.json server/package-lock.json ./server/
RUN cd server && npm ci

COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV PORT=2486
EXPOSE 2486

CMD ["node", "server/index.js"]
