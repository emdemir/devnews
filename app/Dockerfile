FROM node:lts
EXPOSE 8080

WORKDIR /app

# Copy just the dependency files. Avoids running yarn everytime src changes
COPY package.json .
COPY yarn.lock .
# Fetch dependencies
RUN yarn

# Copy the necessary files
COPY src/ src/

# Build typescript code once so we can watch it. Fixes failing nodemon
COPY tsconfig.json .
RUN npx tsc

ENV DEBUG="koa:* devnews:*"
ENV DEBUG_COLORS=true
CMD ["yarn", "watch"]
