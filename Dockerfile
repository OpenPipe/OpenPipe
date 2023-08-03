# Adapted from https://create.t3.gg/en/deployment/docker#3-create-dockerfile

FROM node:20.1.0-bullseye as base
RUN yarn global add pnpm

# DEPS
FROM base as deps

WORKDIR /app

COPY prisma ./

COPY package.json pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile

# BUILDER
FROM base as builder

# Include all NEXT_PUBLIC_* env vars here
ARG NEXT_PUBLIC_POSTHOG_KEY
ARG NEXT_PUBLIC_SOCKET_URL
ARG NEXT_PUBLIC_HOST
ARG NEXT_PUBLIC_SENTRY_DSN
ARG SENTRY_AUTH_TOKEN

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN SKIP_ENV_VALIDATION=1 pnpm build

# RUNNER
FROM base as runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

COPY --from=builder /app/ ./

EXPOSE 3000
ENV PORT 3000

# Run the "run-prod.sh" script
CMD /app/run-prod.sh