FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
COPY client/package.json client/package.json
COPY server/package.json server/package.json
RUN npm install
COPY . .
RUN npm run build
ENV NODE_ENV=production
EXPOSE 4000
CMD ["npm", "--workspace", "server", "start"]
