# Adapted from https://create.t3.gg/en/deployment/docker#3-create-dockerfile

FROM node:20.1.0-bullseye as base
RUN yarn global add pnpm

RUN apt-get update \
  && apt-get install -y python3 python3-pip \
  && pip3 install poetry==1.6.1 \
  && poetry config virtualenvs.in-project true \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*

# DEPS
FROM base as deps

WORKDIR /code

COPY trainer/pyproject.toml trainer/poetry.lock /code/trainer/
RUN cd trainer && poetry install --no-dev

COPY app/prisma app/package.json /code/app/
COPY client-libs/typescript/package.json /code/client-libs/typescript/
COPY pnpm-lock.yaml pnpm-workspace.yaml /code/

RUN cd app && pnpm install --frozen-lockfile

# BUILDER
FROM base as builder

# Include all NEXT_PUBLIC_* env vars here
ARG NEXT_PUBLIC_POSTHOG_KEY
ARG NEXT_PUBLIC_SOCKET_URL
ARG NEXT_PUBLIC_HOST
ARG NEXT_PUBLIC_SENTRY_DSN
ARG SENTRY_AUTH_TOKEN

WORKDIR /code
COPY --from=deps /code/node_modules ./node_modules
COPY --from=deps /code/app/node_modules ./app/node_modules
COPY --from=deps /code/client-libs/typescript/node_modules ./client-libs/typescript/node_modules
COPY . .
# RUN cd app && SKIP_ENV_VALIDATION=1 pnpm build

# RUNNER
FROM base as runner
WORKDIR /code/app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

COPY --from=builder /code/ /code/
COPY --from=deps /code/trainer/.venv /code/trainer/.venv

EXPOSE 3000
ENV PORT 3000

# Run the "run-prod.sh" script
CMD /code/app/scripts/run-prod.sh