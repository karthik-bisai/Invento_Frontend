# Invento web app: build the static site, serve it with nginx. Build with `docker build -f frontend/Dockerfile frontend`
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# The app and the gateway share one address, so the API is a relative path and no CORS is involved.
ENV VITE_API_URL=/api/v1
RUN npm run build

FROM nginx:1.27-alpine
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=15s --timeout=5s --retries=5 CMD wget -qO- http://127.0.0.1/healthz >/dev/null || exit 1
