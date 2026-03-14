# tanstack-hasura

TanStack Start frontend with a local Hasura + Postgres stack for development.

## Stack

- TanStack Start
- React 19
- Hasura GraphQL Engine
- Postgres 16
- Tailwind CSS 4
- Prettier
- ESLint
- TypeScript

## App + local infrastructure

### 1. Install dependencies

```bash
npm install
```

### 2. Create your local env file

```bash
cp .env.example .env
```

### 3. Start Postgres and Hasura

```bash
npm run hasura:up
```

This starts:

- Postgres on `localhost:5432`
- Hasura Console and GraphQL API on `localhost:8080`

`npm run hasura:up` also runs the Hasura metadata init step so the `public.posts` table is tracked automatically.

### 4. Start the app

```bash
npm run dev
```

The app runs on `http://localhost:3000`.

## Local URLs

- App: `http://localhost:3000`
- Hasura Console: `http://localhost:8080/console`
- GraphQL endpoint: `http://localhost:8080/v1/graphql`
- Postgres: `localhost:5432`

## Seeded schema

On first boot, Postgres runs `hasura/init/01-init.sql`, which creates `public.posts` with these fields:

- `id`
- `title`
- `content`
- `author_name`
- `published`
- `created_at`
- `updated_at`

It also inserts sample data.

## Current app behavior

The home page is wired to Hasura.

It currently supports:

- loading posts from Hasura
- creating posts from the UI
- editing posts inline
- deleting posts
- refreshing the feed

The UI talks to TanStack Start server functions, which then call Hasura. The browser does not directly use the Hasura admin secret.

## Useful commands

```bash
npm run dev
npm run build
npm run preview
npm run test
npm run hasura:up
npm run hasura:init
npm run hasura:down
npm run hasura:logs
npm run format
npm run lint
npm run lint:fix
npm run typecheck
```

## Code quality workflow

This project is set up with:

- **Prettier**
    - 4 spaces
    - trailing commas
    - no semicolons
- **ESLint**
    - flat config
    - TypeScript + React hooks + React refresh rules
- **TypeScript type checking**

Recommended local workflow after changes:

```bash
npm run format
npm run lint
npm run typecheck
```

## Example GraphQL query

Add these headers:

```http
Content-Type: application/json
x-hasura-admin-secret: dev-admin-secret
```

Query:

```graphql
query Posts {
    posts(order_by: { created_at: desc }) {
        id
        title
        author_name
        published
        created_at
    }
}
```

Example `curl`:

```bash
curl http://localhost:8080/v1/graphql \
  -H 'Content-Type: application/json' \
  -H 'x-hasura-admin-secret: dev-admin-secret' \
  -d '{"query":"query Posts { posts(order_by: { created_at: desc }) { id title author_name published created_at } }"}'
```

## Reusing this starter

The current naming is:

- GitHub repo: `spro/tanstack-hasura`
- scaffold package directory: `create-tanstack-hasura`
- npm package name: `@spro/create-tanstack-hasura`
- create command: `npm create @spro/tanstack-hasura`

Local usage:

```bash
node create-tanstack-hasura/index.mjs my-app
```

After publishing `@spro/create-tanstack-hasura` to npm, users will be able to run:

```bash
npm create @spro/tanstack-hasura my-app
```

## Documentation

More project details are in:

- `docs/hasura-architecture.md`
- `TUTORIAL.md`

## Notes

- Update `.env` before sharing this project or deploying anywhere.
- Use server-side Hasura env vars for privileged operations.
- Do not expose admin secrets in production browser code.
- If you need a fresh database, run `npm run hasura:down` and remove the Docker volume.
