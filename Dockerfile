FROM node:20-alpine

# Install build dependencies for sharp
RUN apk add --no-cache python3 make g++ vips-dev

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --production && npm cache clean --force

COPY src/ ./src/

EXPOSE 3100

CMD ["node", "src/index.js"]
