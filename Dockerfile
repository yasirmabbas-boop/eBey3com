FROM node:20-slim

# Install OpenSSL for pg/database support
RUN apt-get update -y && apt-get install -y openssl

WORKDIR /app

# Install all deps (including devDependencies) needed for build (tsx, vite, esbuild, etc.)
COPY package*.json ./
RUN npm ci

# Copy sources and build
COPY . .
RUN npm run build

# Remove devDependencies to reduce image size
RUN npm prune --production

# Production runtime
ENV NODE_ENV=production

EXPOSE 8080
CMD ["node", "dist/index.js"]