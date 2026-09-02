# Bookshelf — Next.js app (Turborepo). Built and run as a plain Node server,
# so there are no serverless request-size / timeout limits.

FROM node:22

WORKDIR /app

# Install workspace dependencies (cached until a package.json / lockfile changes).
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/ui/package.json packages/ui/package.json
COPY packages/eslint-config/package.json packages/eslint-config/package.json
COPY packages/typescript-config/package.json packages/typescript-config/package.json
RUN npm ci

# Build.
COPY . .
RUN npm run build

ENV NODE_ENV=production
EXPOSE 3000
WORKDIR /app/apps/web
CMD ["npm", "run", "start", "--", "-H", "0.0.0.0", "-p", "3000"]
