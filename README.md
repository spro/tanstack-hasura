# tanstack-hasura

A TanStack Start template with a local Hasura + Postgres setup.

Use this repo when you want to start a new app with:

- TanStack Start
- React 19
- Hasura GraphQL Engine
- Postgres 16
- Tailwind CSS 4
- TypeScript
- ESLint
- Prettier

## Best ways to use this template

Repo:

- `https://github.com/spro/tanstack-hasura`

### Option 1: Use GitHub's template button

On GitHub, click **Use this template**.

This is the cleanest option if you want your own repo immediately.

### Option 2: Use `degit`

If you want a local copy without Git history:

```bash
npx degit spro/tanstack-hasura my-app
cd my-app
npm install
cp .env.example .env
npm run hasura:up
npm run dev
```

### Option 3: Clone manually

```bash
git clone https://github.com/spro/tanstack-hasura.git my-app
cd my-app
rm -rf .git
npm install
cp .env.example .env
npm run hasura:up
npm run dev
```

## Can this be used like `npm create @spro/tanstack-hasura`?

Not directly from this repo alone.

`npm create ...` works by resolving a published npm package named in the `create-*` convention. For a scoped command like:

```bash
npm create @spro/tanstack-hasura my-app
```

there would need to be a published npm package such as:

- `@spro/create-tanstack-hasura`

That package would usually copy or download this template.

### Current recommendation

For now, use:

```bash
npx degit spro/tanstack-hasura my-app
```

### If I publish a create package later

Then the README can support something like:

```bash
npm create @spro/tanstack-hasura my-app
```

But that requires publishing a separate npm package first.

## Quick start after copying the template

Once you have created your project from this repo:

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

`npm run hasura:up` also runs the metadata init step so the `public.posts` table is tracked automatically.

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

## What the template includes

### Infrastructure

- Docker Compose for Postgres + Hasura
- SQL bootstrap in `hasura/init/01-init.sql`
- automatic Hasura table tracking via `scripts/hasura-init.mjs`

### App behavior

The home page is already wired to Hasura and supports:

- loading posts
- creating posts
- editing posts inline
- deleting posts
- refreshing the feed

The UI talks to TanStack Start server functions, which then call Hasura. The browser does not directly use the Hasura admin secret.

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

## Documentation

More project details are in:

- `docs/hasura-architecture.md`
- `TUTORIAL.md`

## Notes

- Update `.env` before sharing this project or deploying anywhere.
- Use server-side Hasura env vars for privileged operations.
- Do not expose admin secrets in production browser code.
- If you need a fresh database, run `npm run hasura:down` and remove the Docker volume.
