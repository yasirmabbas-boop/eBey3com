FROM node:20-slim

# Install OpenSSL for pg/database support
RUN apt-get update -y && apt-get install -y openssl

WORKDIR /app

# The "Magic" line you identified
ENV NODE_ENV=production

# Use npm ci for a cleaner, faster install in the cloud
COPY package*.json ./
RUN npm ci

# Copy sources and build the "Engine"
COPY . .
RUN npm run build

# Only prune if your app doesn't need devDependencies (like Vite) at runtime
# RUN npm prune --production

EXPOSE 8080
CMD ["node", "dist/index.js"]