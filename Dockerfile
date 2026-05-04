FROM node:22-alpine AS builder
WORKDIR /app

ADD package.json package-lock.json yarn.lock ./
RUN npm install --ignore-scripts

ADD src src
ADD tsconfig.json tsconfig.build.json ./

RUN npx esbuild src/bin/start.ts --outdir=lib --platform=node --target=node22 --bundle

FROM node:22-alpine
WORKDIR /app
COPY --from=builder /app/lib .

EXPOSE 9229
ENV HOST=0.0.0.0
ENV PORT=9229
VOLUME /app/.cognito
ENTRYPOINT ["node", "/app/start.js"]
