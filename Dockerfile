FROM node:22-alpine

WORKDIR /app

COPY package.json ./
RUN npm install

COPY server/package.json ./server/package.json
RUN cd server && npm install

COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV PORT=2486
EXPOSE 2486

CMD ["node", "server/index.js"]
