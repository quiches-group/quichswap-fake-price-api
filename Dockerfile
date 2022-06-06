FROM node:18.0.0-alpine

WORKDIR /app

COPY package.json .
COPY package-lock.json .
RUN npm install
COPY . .
RUN npm run build; exit 0

CMD ["npm", "run", "start:prod"]

EXPOSE 80
