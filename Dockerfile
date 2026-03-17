FROM node:23.9.0-alpine

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY src ./src

EXPOSE 80

CMD ["npm", "start"]
