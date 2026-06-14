FROM node:22-alpine

WORKDIR /app

# Install dependencies first (leverages Docker cache)
COPY package*.json ./
RUN npm ci

# Copy application files
COPY . .

# Build the Astro SSR production bundles
RUN npm run build

# Configure runtime environment
ENV HOST=0.0.0.0
ENV PORT=3000
ENV NODE_ENV=production

EXPOSE 3000

# Run standalone Astro server entry point
CMD ["node", "./dist/server/entry.mjs"]
