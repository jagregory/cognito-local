# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

cognito-local is an offline emulator for Amazon Cognito, enabling local development and testing without hitting AWS. It implements ~47 Cognito User Pool API operations as an Express server that accepts the same `x-amz-target` header format as the real AWS API.

## Commands

```bash
yarn start              # Dev server (port 9229, COGNITO_LOCAL_DEVMODE=1)
yarn start:watch        # Dev server with file watching (nodemon)
yarn start:debug        # Dev server with Node inspector on port 9230
yarn build              # TypeScript compile + esbuild bundle to lib/
yarn test               # Run all tests (vitest)
yarn test -- src/targets/signUp.test.ts        # Run a single test file
yarn test -- -t "pattern"                      # Run tests matching name pattern
yarn lint               # Biome lint with auto-fix
yarn type-check         # TypeScript strict type checking
```

CI runs: lint → test → smoke test → build. Pre-commit hook runs biome check on staged .ts files via lint-staged.

## Architecture

### Request Flow

1. **HTTP Server** (`src/server/server.ts`) — Express app, `POST /` with AWS JSON protocol
2. **Router** (`src/server/Router.ts`) — Parses `x-amz-target: AWSCognitoIdentityProviderService.{TargetName}` header, dispatches to target handler
3. **Target** (`src/targets/`) — One file per Cognito operation (~47 total), each is a factory that takes services and returns an async `(ctx, req) => response` handler
4. **Services** (`src/services/`) — Business logic layer injected into targets

Additional endpoints: `GET /:userPoolId/.well-known/jwks.json` (JWKS), `GET /health`

### Service Layer (`src/services/`)

All dependencies flow through a `Services` interface (defined in `src/services/index.ts`), wired together in `src/server/defaults.ts`:

- **CognitoService** — User pool and app client orchestration
- **UserPoolService** — Per-pool user/group/token management
- **TokenGenerator** — JWT signing with RS256 (keys in `src/keys/`)
- **Triggers** — Lambda trigger dispatch (CustomMessage, PreSignUp, PostAuth, etc.)
- **Messages** — Message composition with trigger integration
- **DataStore** — StormDB-based JSON persistence in `.cognito/db/`
- **Clock** — Time abstraction (injectable for testing)

### Target Pattern

Every target follows this pattern — take a subset of Services via `Pick<Services, ...>`, return the handler:

```typescript
export type AdminInitiateAuthTarget = Target<AdminInitiateAuthRequest, AdminInitiateAuthResponse>;
export const AdminInitiateAuth =
  ({ cognito, triggers, tokenGenerator }: Pick<Services, "cognito" | "triggers" | "tokenGenerator">): AdminInitiateAuthTarget =>
  async (ctx, req) => { /* implementation */ };
```

### Data Persistence

- `.cognito/db/clients.json` — All app clients
- `.cognito/db/{userPoolId}.json` — Per-pool state (users, groups, refresh tokens)
- `.cognito/config.json` — Server/Lambda/KMS/trigger configuration

### Error Handling

Custom `CognitoError` hierarchy in `src/errors.ts` — serializes to AWS format `{__type, message}`. Server returns 400 for Cognito errors, 500 for unexpected errors. `UnsupportedError` signals unimplemented operations.

### Testing

- **Framework**: Vitest with colocated tests (`file.ts` + `file.test.ts`)
- **Test utilities**: `src/__tests__/` — `TestContext`, mock services (`MockCognitoService`, `MockUserPoolService`, etc.), `testDataBuilder.ts` with factory functions (`id()`, `user()`, `userPool()`, `appClient()`, `group()`)
- **Integration tests**: `integration-tests/` — Supertest HTTP tests and AWS SDK tests against live server
- **Pattern**: Mock services are injected into target factories; assertions use standard vitest matchers plus a custom `jsonMatching` helper

### Lambda Triggers

Six trigger types in `src/services/triggers/`: CustomMessage, CustomEmailSender, PreSignUp, PostAuthentication, PostConfirmation, PreTokenGeneration, UserMigration. Configured via `TriggerFunctions` in `.cognito/config.json`.

## Key Conventions

- TypeScript strict mode, ES2019 target, bundler module resolution
- Biome for linting/formatting (not ESLint/Prettier)
- Dates in responses are serialized as Unix timestamps (seconds, not milliseconds)
- User attributes use AWS `{Name, Value}` array format with utility functions in `src/services/userPoolService.ts`
- User status flow: UNCONFIRMED → CONFIRMED (via ConfirmSignUp)
