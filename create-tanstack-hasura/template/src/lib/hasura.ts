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
