FROM node:10 as builder
WORKDIR /usr/src/app
COPY ./package*.json ./.npmrc ./
RUN npm install --only=production

FROM node:10
WORKDIR /usr/src/app
COPY --from=builder /usr/src/app/package.json ./
COPY --from=builder /usr/src/app/node_modules/ ./node_modules/
COPY ./src/ ./src
CMD [ "node", "./src/index.js" ]
