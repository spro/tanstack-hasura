# Hasura Setup and Architecture

This project uses a local Hasura + Postgres stack alongside a TanStack Start frontend.

## Overview

The app is split into 3 main parts:

1. **Postgres**
    - stores application data
    - runs locally in Docker
    - seeds the initial schema on first boot

2. **Hasura GraphQL Engine**
    - connects to Postgres
    - exposes the database as a GraphQL API
    - serves the Hasura Console for schema inspection and metadata management

3. **TanStack Start app**
    - renders the UI
    - calls Hasura through server functions
    - keeps privileged Hasura access on the server side

---

## Local services

The local infrastructure is defined in:

- `docker-compose.yml`

### Services

#### `postgres`

- image: `postgres:16-alpine`
- port: `5432`
- persists data in Docker volume: `postgres_data`
- runs SQL bootstrap files from:
    - `hasura/init`

#### `hasura`

- image: `hasura/graphql-engine:v2.48.4`
- port: `8080`
- connects to Postgres with `HASURA_GRAPHQL_DATABASE_URL`
- runs with console + dev mode enabled for local development

---

## Database bootstrap

Initial database setup is defined in:

- `hasura/init/01-init.sql`

This file runs automatically the first time the Postgres volume is created.

### What it creates

#### Extension

- `pgcrypto`
    - used for `gen_random_uuid()`

#### Table

- `public.posts`

Columns:

- `id uuid primary key default gen_random_uuid()`
- `title text not null`
- `content text not null`
- `author_name text not null`
- `published boolean not null default false`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

#### Trigger

A trigger updates `updated_at` automatically on every row update.

#### Seed data

Sample posts are inserted on first boot.

---

## Hasura metadata initialization

Hasura does **not** automatically expose new database tables until they are tracked in metadata.

That step is handled by:

- `scripts/hasura-init.mjs`

### What it does

1. waits for Hasura to become healthy
2. calls the Hasura metadata API
3. tracks the `public.posts` table in the default Postgres source

### Related npm scripts

Defined in `package.json`:

```json
{
    "hasura:init": "node scripts/hasura-init.mjs",
    "hasura:up": "docker compose up -d && npm run hasura:init",
    "hasura:down": "docker compose down",
    "hasura:logs": "docker compose logs -f hasura postgres"
}
```

This means `npm run hasura:up` both starts the containers and makes sure the `posts` table is tracked by Hasura.

---

## Frontend architecture

### Main UI route

The primary page is:

- `src/routes/index.tsx`

This route renders:

- a post creation form
- a post feed
- refresh behavior for live data reloads

### Data access layer

Hasura access is centralized in:

- `src/lib/hasura.ts`

This file contains:

- `listPosts()`
- `createPost()`
- shared `hasuraFetch()` logic
- the `Post` TypeScript type

### Server functions

The UI does not call Hasura directly from the browser.
Instead, it uses TanStack Start server functions in `src/routes/index.tsx`:

- `getPosts`
- `addPost`

These server functions:

- run on the server
- call `src/lib/hasura.ts`
- return data back to the React UI

### Current request flow

```text
Browser UI
  -> TanStack Start server function
    -> src/lib/hasura.ts
      -> Hasura GraphQL API
        -> Postgres
```

This keeps the admin secret on the server side instead of embedding it in client-side code.

---

## Environment variables

### Docker / Hasura stack

Current local defaults are documented in:

- `.env.example`

Important variables:

- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_PORT`
- `HASURA_PORT`
- `HASURA_GRAPHQL_ADMIN_SECRET`
- `HASURA_GRAPHQL_UNAUTHORIZED_ROLE`

### App server access to Hasura

The server-side Hasura client in `src/lib/hasura.ts` reads:

- `HASURA_GRAPHQL_URL`
- `HASURA_GRAPHQL_ADMIN_SECRET`

If not set, it falls back to:

- `http://localhost:8080/v1/graphql`
- `dev-admin-secret`

### Important note

The app currently uses **server-side** env names:

- `HASURA_GRAPHQL_URL`
- `HASURA_GRAPHQL_ADMIN_SECRET`

These are different from browser-style `VITE_*` variables.
For privileged operations, prefer the server-side names so secrets are not exposed to the client.

---

## Running the project

### 1. Install dependencies

```bash
npm install
```

### 2. Create env file

```bash
cp .env.example .env
```

### 3. Start Hasura + Postgres

```bash
npm run hasura:up
```

### 4. Start the app

```bash
npm run dev
```

### Local URLs

- App: `http://localhost:3000`
- Hasura Console: `http://localhost:8080/console`
- Hasura GraphQL endpoint: `http://localhost:8080/v1/graphql`
- Postgres: `localhost:5432`

---

## GraphQL schema currently in use

Once tracked, Hasura exposes the `posts` table with operations such as:

### Query posts

```graphql
query Posts {
    posts(order_by: { created_at: desc }) {
        id
        title
        content
        author_name
        published
        created_at
    }
}
```

### Insert a post

```graphql
mutation CreatePost($title: String!, $content: String!, $author_name: String!) {
    insert_posts_one(
        object: {
            title: $title
            content: $content
            author_name: $author_name
            published: true
        }
    ) {
        id
        title
        content
        author_name
        published
        created_at
    }
}
```

---

## Developer workflow

### Formatting

Prettier is configured with:

- 4 spaces
- trailing commas
- no semicolons

Config files:

- `.prettierrc.json`
- `.prettierignore`

Command:

```bash
npm run format
```

### Linting

ESLint is configured with a flat config in:

- `eslint.config.js`

It includes:

- base JavaScript rules from `@eslint/js`
- TypeScript rules via `typescript-eslint`
- React hooks rules
- React refresh rules
- Prettier compatibility via `eslint-config-prettier`

Commands:

```bash
npm run lint
npm run lint:fix
```

### Type checking

Type checking uses TypeScript directly:

```bash
npm run typecheck
```

### Recommended edit loop

After making changes, run:

```bash
npm run format
npm run lint
npm run typecheck
```

---

## Security model right now

Current setup is optimized for local development.

### Current behavior

- Hasura console is enabled
- Hasura dev mode is enabled
- the app uses the Hasura admin secret on the server
- no row-level permissions are configured yet

### Implications

- this is fine for local development
- this is **not** production-ready

### Before production

You should add:

- Hasura metadata and migrations committed in a formal workflow
- auth provider integration
- row-level permissions
- non-admin app roles
- separation between public and privileged operations
- secret management through deployment environment variables

---

## Key files

### Infrastructure

- `docker-compose.yml`
- `.env.example`
- `hasura/init/01-init.sql`
- `scripts/hasura-init.mjs`

### Frontend

- `src/routes/index.tsx`
- `src/lib/hasura.ts`
- `src/routes/__root.tsx`
- `src/components/Header.tsx`
- `src/components/Footer.tsx`

### Tooling

- `.prettierrc.json`
- `.prettierignore`
- `eslint.config.js`
- `tsconfig.json`
- `package.json`

---

## Current architectural tradeoffs

### Why this setup is good right now

- fast local iteration
- minimal moving pieces
- Hasura gives instant GraphQL over Postgres
- TanStack Start server functions provide a clean boundary for secrets
- linting, formatting, and type checking are lightweight and local

### What is intentionally simple

- no generated GraphQL types yet
- no dedicated API layer beyond `src/lib/hasura.ts`
- no auth or permissions yet
- no Hasura migrations/metadata directory exported from the CLI yet

---

## Recommended next steps

1. **Move to route loaders/actions where useful**
    - better SSR/data-loading ergonomics

2. **Add edit/delete mutations**
    - complete the basic CRUD flow

3. **Introduce Hasura migrations + metadata as code**
    - better reproducibility across environments

4. **Add authentication**
    - then configure Hasura roles and permissions

5. **Generate typed GraphQL operations**
    - reduce drift between schema and app code

6. **Add CI checks**
    - run format/lint/typecheck automatically in pull requests

---

## Quick mental model

If you need to understand the project quickly, think of it like this:

- **Postgres** is the source of truth
- **Hasura** is the GraphQL layer over Postgres
- **TanStack Start server functions** are the app’s trusted backend boundary
- **React UI** reads and writes posts through those server functions
- **Prettier + ESLint + TypeScript** keep the codebase consistent
