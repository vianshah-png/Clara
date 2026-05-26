# Clara AI — Backend Dockerfile (Dev-friendly)
FROM node:20-alpine

WORKDIR /app

# Copy package files and install deps
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

EXPOSE 3004

# Use --watch for hot-reload in dev
CMD ["node", "--watch", "server.js"]
