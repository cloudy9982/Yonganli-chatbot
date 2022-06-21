FROM node:14-alpine

WORKDIR /usr/src/app
COPY . ./
RUN npm install
RUN npm run build

FROM node:14-alpine

COPY package*.json ./
RUN npm install --only=production
COPY --from=0 /usr/src/app/dist .

CMD ["node", "index.js"]
