FROM node:22.13.1-alpine AS builder
WORKDIR /app

# dependencies
ADD package.json yarn.lock ./
RUN yarn --frozen-lockfile

# library code
ADD src src

# bundle
RUN yarn esbuild src/bin/start.ts --outdir=lib --platform=node --target=node14 --bundle

FROM node:22.13.1-alpine
WORKDIR /app
COPY --from=builder /app/lib .

# bindings
EXPOSE 9229
ENV HOST 0.0.0.0
ENV PORT 9229
VOLUME /app/.cognito
ENTRYPOINT ["node", "/app/start.js"]
