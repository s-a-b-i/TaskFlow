# Stage 1: Build React App
FROM node:20-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Serve with Nginx for Cloud Run / Firebase Hosting
FROM nginx:alpine
# Copy built assets to Nginx html dir
COPY --from=build /app/dist /usr/share/nginx/html
# Copy custom Nginx config to handle React Router (fallback to index.html)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port (Cloud Run expects 8080 by default, Nginx defaults to 80)
# We will map this via docker-compose or Cloud Run config
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
