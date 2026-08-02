FROM node:20-alpine

RUN apk add --no-cache ffmpeg python3 make g++

WORKDIR /app

COPY package.json yarn.lock ./
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN yarn install

COPY . .
RUN yarn build

EXPOSE 3336

CMD ["sh", "-c", "npx prisma db push && yarn start:prod"]
