FROM node:10 as builder
WORKDIR /usr/src/app
COPY ./package*.json ./
RUN npm install --only=production

FROM node:10
WORKDIR /usr/src/app
COPY --from=builder /usr/src/app .
COPY ./src/ ./src
CMD [ "node", "./src/index.js" ]
