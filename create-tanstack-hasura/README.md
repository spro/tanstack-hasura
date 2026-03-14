# @spro/create-tanstack-hasura

Scaffold a TanStack Start + Hasura + Postgres app from the bundled template.

Repo for now:

- `spro/tanstack-hasura`

## Local usage

From this repository:

```bash
node create-tanstack-hasura/index.mjs my-app
```

Then:

```bash
cd my-app
npm install
cp .env.example .env
npm run hasura:up
npm run dev
```

## Publishing

The naming is:

- GitHub repo: `spro/tanstack-hasura`
- npm package: `@spro/create-tanstack-hasura`
- create command: `npm create @spro/tanstack-hasura`

So to support:

```bash
npm create @spro/tanstack-hasura my-app
```

publish this package to npm with the name:

- `@spro/create-tanstack-hasura`
