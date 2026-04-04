FROM node:23.9.0-alpine

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY src ./src

CMD ["npm", "start"]
