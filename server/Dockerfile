FROM node:20-alpine

RUN apk add --no-cache ffmpeg python3 make g++

WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install

COPY . .
RUN yarn prisma generate
RUN yarn build

EXPOSE 3336

CMD ["yarn", "start:prod"]
