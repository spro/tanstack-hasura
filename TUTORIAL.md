# Tutorial: Build This TanStack Start + Hasura App From Scratch

This guide walks through how to build this project from an empty TanStack Start app into a local microblog backed by Hasura and Postgres.

By the end, you will have:

- a TanStack Start frontend
- a local Postgres database in Docker
- a local Hasura GraphQL API in Docker
- a seeded `posts` table
- Hasura metadata auto-tracking for the table
- a UI that can create, list, edit, and delete posts
- Prettier, ESLint, and TypeScript checks

---

## 0. Prerequisites

You should have:

- Node.js and npm
- Docker Desktop or another working Docker daemon
- a fresh TanStack Start app

If Docker is not running, `docker compose up` will fail.

---

## 1. Start with a TanStack Start app

Create a new TanStack Start app however you prefer.

Once the app exists, install dependencies and confirm it runs:

```bash
npm install
npm run dev
```

At this point, you just have the frontend app.

---

## 2. Add Docker services for Postgres and Hasura

Create a `docker-compose.yml` file in the project root.

This project uses two services:

- `postgres`
- `hasura`

Use a compose file like this:

```yml
services:
    postgres:
        image: postgres:16-alpine
        restart: unless-stopped
        ports:
            - "${POSTGRES_PORT:-5432}:5432"
        environment:
            POSTGRES_DB: ${POSTGRES_DB:-microblog}
            POSTGRES_USER: ${POSTGRES_USER:-postgres}
            POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-postgres}
        volumes:
            - postgres_data:/var/lib/postgresql/data
            - ./hasura/init:/docker-entrypoint-initdb.d
        healthcheck:
            test:
                [
                    "CMD-SHELL",
                    "pg_isready -U ${POSTGRES_USER:-postgres} -d ${POSTGRES_DB:-microblog}",
                ]
            interval: 5s
            timeout: 5s
            retries: 10

    hasura:
        image: hasura/graphql-engine:v2.48.4
        restart: unless-stopped
        depends_on:
            postgres:
                condition: service_healthy
        ports:
            - "${HASURA_PORT:-8080}:8080"
        environment:
            HASURA_GRAPHQL_DATABASE_URL: postgres://${POSTGRES_USER:-postgres}:${POSTGRES_PASSWORD:-postgres}@postgres:5432/${POSTGRES_DB:-microblog}
            HASURA_GRAPHQL_ENABLE_CONSOLE: "true"
            HASURA_GRAPHQL_DEV_MODE: "true"
            HASURA_GRAPHQL_ADMIN_SECRET: ${HASURA_GRAPHQL_ADMIN_SECRET:-dev-admin-secret}
            HASURA_GRAPHQL_UNAUTHORIZED_ROLE: ${HASURA_GRAPHQL_UNAUTHORIZED_ROLE:-anonymous}
            HASURA_GRAPHQL_ENABLED_LOG_TYPES: startup, http-log, webhook-log, websocket-log, query-log
        healthcheck:
            test:
                [
                    "CMD-SHELL",
                    "wget -qO- http://localhost:8080/healthz || exit 1",
                ]
            interval: 5s
            timeout: 5s
            retries: 15

volumes:
    postgres_data:
```

### Why this matters

- Postgres stores your data
- Hasura connects to Postgres and gives you a GraphQL API immediately
- Docker volumes preserve your database between restarts
- the `./hasura/init` mount lets Postgres execute SQL automatically on first boot

---

## 3. Add environment defaults

Create `.env.example`:

```env
POSTGRES_DB=microblog
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_PORT=5432

HASURA_PORT=8080
HASURA_GRAPHQL_ADMIN_SECRET=dev-admin-secret
HASURA_GRAPHQL_UNAUTHORIZED_ROLE=anonymous

VITE_HASURA_URL=http://localhost:8080/v1/graphql
VITE_HASURA_ADMIN_SECRET=dev-admin-secret
```

Then create your local file:

```bash
cp .env.example .env
```

### Important note

For privileged backend access, prefer server-side env names like:

- `HASURA_GRAPHQL_URL`
- `HASURA_GRAPHQL_ADMIN_SECRET`

Do not rely on `VITE_*` secrets in production browser code.

---

## 4. Create the initial database schema

Create this folder:

```bash
mkdir -p hasura/init
```

Then create `hasura/init/01-init.sql`:

```sql
create extension if not exists pgcrypto;

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  author_name text not null,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_current_timestamp_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_public_posts_updated_at on public.posts;
create trigger set_public_posts_updated_at
before update on public.posts
for each row
execute function public.set_current_timestamp_updated_at();

insert into public.posts (title, content, author_name, published)
values
  (
    'Hello Hasura',
    'Your local Hasura instance is up and ready to serve GraphQL.',
    'System',
    true
  ),
  (
    'Draft post',
    'Use the Hasura console to explore tables, permissions, and GraphQL queries.',
    'System',
    false
  )
on conflict do nothing;
```

### Why this matters

On the first creation of the Postgres volume, the container runs this SQL automatically.

That gives you:

- a `posts` table
- UUID primary keys
- timestamps
- an `updated_at` trigger
- sample seed rows

---

## 5. Start the stack

Start Docker services:

```bash
docker compose up -d
```

Check status:

```bash
docker compose ps
```

Open Hasura:

- Console: `http://localhost:8080/console`
- GraphQL: `http://localhost:8080/v1/graphql`

At this point, Postgres is running and Hasura is running.
But there is one important missing step.

---

## 6. Track the table in Hasura metadata

Hasura does not automatically expose every table you create in Postgres.
You must track the table in Hasura metadata.

Create `scripts/hasura-init.mjs`:

```js
const hasuraUrl = process.env.HASURA_GRAPHQL_URL || "http://localhost:8080"
const adminSecret =
    process.env.HASURA_GRAPHQL_ADMIN_SECRET || "dev-admin-secret"

async function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

async function waitForHasura() {
    for (let attempt = 1; attempt <= 30; attempt++) {
        try {
            const response = await fetch(`${hasuraUrl}/healthz`)
            if (response.ok) {
                return
            }
        } catch (error) {
            void error
        }

        await sleep(1000)
    }

    throw new Error("Hasura did not become healthy in time")
}

async function metadataRequest(body) {
    const response = await fetch(`${hasuraUrl}/v1/metadata`, {
        method: "POST",
        headers: {
            "content-type": "application/json",
            "x-hasura-admin-secret": adminSecret,
        },
        body: JSON.stringify(body),
    })

    const json = await response.json()

    if (!response.ok) {
        throw new Error(JSON.stringify(json))
    }

    return json
}

await waitForHasura()

await metadataRequest({
    type: "pg_track_table",
    args: {
        source: "default",
        table: {
            schema: "public",
            name: "posts",
        },
    },
}).catch(async (error) => {
    const message = String(error)

    if (
        message.includes("already tracked") ||
        message.includes("already exists in source")
    ) {
        return
    }

    throw error
})

console.log("Hasura metadata initialized")
```

Run it:

```bash
node scripts/hasura-init.mjs
```

### Why this matters

Without table tracking, this query will fail:

```graphql
query Posts {
    posts {
        id
    }
}
```

After tracking, Hasura exposes `posts` in GraphQL.

---

## 7. Add npm scripts for app + Hasura workflow

Update `package.json` scripts:

```json
{
    "scripts": {
        "dev": "vite dev --port 3000",
        "build": "vite build",
        "preview": "vite preview",
        "test": "vitest run",
        "typecheck": "tsc --noEmit",
        "lint": "eslint .",
        "lint:fix": "eslint . --fix",
        "format": "prettier . --write",
        "hasura:init": "node scripts/hasura-init.mjs",
        "hasura:up": "docker compose up -d && npm run hasura:init",
        "hasura:down": "docker compose down",
        "hasura:logs": "docker compose logs -f hasura postgres"
    }
}
```

Now your main workflow becomes:

```bash
npm run hasura:up
npm run dev
```

---

## 8. Create a small Hasura client for the app

Create `src/lib/hasura.ts`.

This file centralizes all GraphQL access.

```ts
export type Post = {
    id: string
    title: string
    content: string
    author_name: string
    published: boolean
    created_at: string
}

type GraphQLResponse<T> = {
    data?: T
    errors?: Array<{ message: string }>
}

const HASURA_URL =
    process.env.HASURA_GRAPHQL_URL || "http://localhost:8080/v1/graphql"
const HASURA_ADMIN_SECRET =
    process.env.HASURA_GRAPHQL_ADMIN_SECRET || "dev-admin-secret"

async function hasuraFetch<T>(
    query: string,
    variables?: Record<string, unknown>,
) {
    const response = await fetch(HASURA_URL, {
        method: "POST",
        headers: {
            "content-type": "application/json",
            "x-hasura-admin-secret": HASURA_ADMIN_SECRET,
        },
        body: JSON.stringify({ query, variables }),
    })

    if (!response.ok) {
        throw new Error(`Hasura request failed with ${response.status}`)
    }

    const json = (await response.json()) as GraphQLResponse<T>

    if (json.errors?.length) {
        throw new Error(json.errors.map((error) => error.message).join(", "))
    }

    if (!json.data) {
        throw new Error("Hasura returned no data")
    }

    return json.data
}

export async function listPosts() {
    const data = await hasuraFetch<{ posts: Post[] }>(`
        query ListPosts {
            posts(order_by: { created_at: desc }) {
                id
                title
                content
                author_name
                published
                created_at
            }
        }
    `)

    return data.posts
}

export async function createPost(input: {
    title: string
    content: string
    author_name: string
}) {
    const data = await hasuraFetch<{
        insert_posts_one: Post
    }>(
        `
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
        `,
        input,
    )

    return data.insert_posts_one
}

export async function updatePost(input: {
    id: string
    title: string
    content: string
    author_name: string
}) {
    const data = await hasuraFetch<{
        update_posts_by_pk: Post | null
    }>(
        `
            mutation UpdatePost($id: uuid!, $title: String!, $content: String!, $author_name: String!) {
                update_posts_by_pk(
                    pk_columns: { id: $id }
                    _set: {
                        title: $title
                        content: $content
                        author_name: $author_name
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
        `,
        input,
    )

    if (!data.update_posts_by_pk) {
        throw new Error("Post not found")
    }

    return data.update_posts_by_pk
}

export async function deletePost(id: string) {
    const data = await hasuraFetch<{
        delete_posts_by_pk: { id: string } | null
    }>(
        `
            mutation DeletePost($id: uuid!) {
                delete_posts_by_pk(id: $id) {
                    id
                }
            }
        `,
        { id },
    )

    if (!data.delete_posts_by_pk) {
        throw new Error("Post not found")
    }

    return data.delete_posts_by_pk
}
```

### Why this matters

This file becomes the app’s small backend integration layer.

Instead of scattering fetch calls everywhere, you keep GraphQL operations in one place.

---

## 9. Use TanStack Start server functions

Do not send the Hasura admin secret to the browser.

Instead, call Hasura through TanStack Start server functions.

In `src/routes/index.tsx`, create server functions like:

```ts
const getPosts = createServerFn({ method: "GET" }).handler(async () => {
    return listPosts()
})

const addPost = createServerFn({ method: "POST" })
    .inputValidator(
        (data: { title: string; content: string; author_name: string }) => data,
    )
    .handler(async ({ data }) => {
        return createPost(data)
    })

const editPost = createServerFn({ method: "POST" })
    .inputValidator(
        (data: {
            id: string
            title: string
            content: string
            author_name: string
        }) => data,
    )
    .handler(async ({ data }) => {
        return updatePost(data)
    })

const removePost = createServerFn({ method: "POST" })
    .inputValidator((data: { id: string }) => data)
    .handler(async ({ data }) => {
        return deletePost(data.id)
    })
```

### Why this matters

This keeps the request flow like this:

```text
Browser UI
  -> TanStack Start server function
    -> Hasura GraphQL API
      -> Postgres
```

That is safer than putting admin credentials in client-side code.

---

## 10. Build the page UI

The main page should do 4 jobs:

1. load posts
2. create posts
3. edit posts
4. delete posts

A good approach is:

- `useState` for local post state
- `useEffect` to load posts on mount
- one form for creating a post
- inline edit UI per post
- per-post loading states for save/delete

### State you will likely need

- `posts`
- `loading`
- `submitting`
- `editingId`
- `editAuthorName`
- `editTitle`
- `editContent`
- `savingId`
- `deletingId`
- `error`

### Common handlers

- `loadPosts()`
- `handleSubmit()`
- `startEditing(post)`
- `cancelEditing()`
- `handleEditSubmit(postId)`
- `handleDelete(postId)`

### One bug to avoid

If you use an async submit handler and then access `event.currentTarget` after an `await`, you may get errors.

Instead, store the form first:

```ts
const form = event.currentTarget
```

Then later use:

```ts
form.reset()
```

---

## 11. Clear the default starter UI

TanStack starters often come with demo pages and styling.

You can simplify the app by:

- replacing the default home page with your own post UI
- reducing the default styles to a minimal base
- simplifying the header/footer

That is exactly what this project does.

---

## 12. Add Prettier

Install it:

```bash
npm install -D prettier
```

Create `.prettierrc.json`:

```json
{
    "tabWidth": 4,
    "useTabs": false,
    "semi": false,
    "trailingComma": "all"
}
```

Create `.prettierignore`:

```text
node_modules
.output
.tanstack
.nitro
dist
dist-ssr
package-lock.json
```

Add script:

```json
{
    "format": "prettier . --write"
}
```

---

## 13. Add ESLint

Install:

```bash
npm install -D eslint@^9 @eslint/js@^9 typescript-eslint eslint-plugin-react-hooks eslint-plugin-react-refresh eslint-config-prettier globals
```

Create `eslint.config.js`:

```js
import js from "@eslint/js"
import prettierConfig from "eslint-config-prettier"
import globals from "globals"
import reactHooks from "eslint-plugin-react-hooks"
import reactRefresh from "eslint-plugin-react-refresh"
import tseslint from "typescript-eslint"

export default tseslint.config(
    {
        ignores: [
            ".output/**",
            ".tanstack/**",
            ".nitro/**",
            "dist/**",
            "dist-ssr/**",
            "node_modules/**",
            "src/routeTree.gen.ts",
        ],
    },
    {
        files: ["**/*.{js,mjs,cjs,ts,tsx}"],
        extends: [
            js.configs.recommended,
            ...tseslint.configs.recommended,
            prettierConfig,
        ],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: "module",
            globals: {
                ...globals.browser,
                ...globals.node,
            },
        },
        plugins: {
            "react-hooks": reactHooks,
            "react-refresh": reactRefresh,
        },
        rules: {
            ...reactHooks.configs.recommended.rules,
            "react-refresh/only-export-components": [
                "warn",
                {
                    allowConstantExport: true,
                    allowExportNames: ["Route"],
                },
            ],
        },
    },
    {
        files: ["src/routes/**/*.{ts,tsx}"],
        rules: {
            "react-refresh/only-export-components": "off",
        },
    },
)
```

Add scripts:

```json
{
    "lint": "eslint .",
    "lint:fix": "eslint . --fix"
}
```

---

## 14. Add type checking

Add a TypeScript check script:

```json
{
    "typecheck": "tsc --noEmit"
}
```

---

## 15. Use a consistent edit workflow

After making changes, run:

```bash
npm run format
npm run lint
npm run typecheck
```

This project follows that loop after edits.

---

## 16. Validate Hasura manually

You can test Hasura directly with `curl`.

### Query posts

```bash
curl http://localhost:8080/v1/graphql \
  -H 'Content-Type: application/json' \
  -H 'x-hasura-admin-secret: dev-admin-secret' \
  -d '{"query":"query Posts { posts(order_by: { created_at: desc }) { id title author_name published created_at } }"}'
```

### Create a post

```bash
curl http://localhost:8080/v1/graphql \
  -H 'Content-Type: application/json' \
  -H 'x-hasura-admin-secret: dev-admin-secret' \
  -d '{"query":"mutation CreatePost { insert_posts_one(object: { title: \"Test Post\", content: \"Created from curl\", author_name: \"Agent\", published: true }) { id title author_name } }"}'
```

---

## 17. Final project structure

A compact version of the important files looks like this:

```text
.
├── docker-compose.yml
├── .env.example
├── README.md
├── TUTORIAL.md
├── eslint.config.js
├── .prettierrc.json
├── .prettierignore
├── scripts/
│   └── hasura-init.mjs
├── hasura/
│   └── init/
│       └── 01-init.sql
└── src/
    ├── lib/
    │   └── hasura.ts
    └── routes/
        └── index.tsx
```

---

## 18. What you have at the end

If you follow this tutorial, you end up with:

- Dockerized Postgres
- Dockerized Hasura
- a seeded `posts` table
- auto-tracked Hasura metadata for `posts`
- a React UI for listing, creating, editing, and deleting posts
- server-side GraphQL access via TanStack Start server functions
- formatting, linting, and type checking

---

## 19. What I would do next

If I were continuing from here, I would likely add:

1. Hasura migrations + metadata committed as code
2. authentication
3. row-level permissions
4. generated GraphQL types
5. route loaders/actions for more SSR-friendly data handling
6. CI checks for format/lint/typecheck

---

## 20. Short version

The build order is:

1. scaffold TanStack Start
2. add Docker Compose for Postgres + Hasura
3. seed Postgres with SQL
4. track the table in Hasura metadata
5. add a server-side Hasura client
6. call it via TanStack Start server functions
7. build the CRUD UI
8. add Prettier, ESLint, and type checking
9. use `format`, `lint`, and `typecheck` after edits
