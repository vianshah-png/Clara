# Clara AI — Frontend Dockerfile (Dev-friendly)
FROM node:20-alpine

WORKDIR /app

# Copy package files and install deps
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

EXPOSE 3000

# Run Next.js dev server
CMD ["npm", "run", "dev"]
