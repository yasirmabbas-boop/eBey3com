FROM node:22-slim

# Install OpenSSL for pg/database support
RUN apt-get update -y && apt-get install -y openssl

WORKDIR /app

# Install all deps (including devDependencies) needed for build (tsx, vite, esbuild, etc.)
# NODE_ENV=production would cause npm ci to skip devDeps; ensure dev deps are installed
COPY package*.json ./
RUN npm ci --include=dev

# Copy sources and build
COPY . .
RUN npm run build

# Remove devDependencies to reduce image size
RUN npm prune --production

# Production runtime
ENV NODE_ENV=production

EXPOSE 8080
CMD ["node", "dist/index.js"]