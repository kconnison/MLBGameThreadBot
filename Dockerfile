FROM node:18-alpine
RUN apk add --no-cache tzdata

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci

COPY . .
CMD ["npm", "run", "start"]