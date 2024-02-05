# Adapted from https://create.t3.gg/en/deployment/docker#3-create-dockerfile

FROM node:20.9.0-bullseye as base
RUN yarn global add pnpm

# DEPS
FROM base as deps

WORKDIR /code

COPY app/prisma app/package.json /code/app/
COPY client-libs/typescript/package.json /code/client-libs/typescript/
COPY pnpm-lock.yaml pnpm-workspace.yaml /code/

RUN cd app && pnpm install --frozen-lockfile

# BUILDER
FROM base as builder

# Include all NEXT_PUBLIC_* env vars here
ARG NEXT_PUBLIC_POSTHOG_KEY
ARG NEXT_PUBLIC_HOST
ARG NEXT_PUBLIC_SENTRY_DSN
ARG NEXT_PUBLIC_DEPLOY_ENV
ARG SENTRY_AUTH_TOKEN
ARG NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

WORKDIR /code
COPY --from=deps /code/node_modules ./node_modules
COPY --from=deps /code/app/node_modules ./app/node_modules
COPY --from=deps /code/client-libs/typescript/node_modules ./client-libs/typescript/node_modules
COPY app /code/app
COPY client-libs/typescript /code/client-libs/typescript
RUN cd app && SKIP_ENV_VALIDATION=1 pnpm build

# RUNNER
FROM base as runner
WORKDIR /code/app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

COPY --from=builder /code/ /code/

EXPOSE 80
ENV PORT 80

# Run the "run-prod.sh" script
CMD /code/app/scripts/run-prod.sh