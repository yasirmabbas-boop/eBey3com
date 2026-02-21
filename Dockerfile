FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
RUN npm prune --production
CMD ["node", "dist/index.js"]
