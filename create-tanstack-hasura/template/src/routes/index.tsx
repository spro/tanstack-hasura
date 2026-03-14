import { createFileRoute } from "@tanstack/react-router"
import { createServerFn } from "@tanstack/react-start"
import { useEffect, useState } from "react"
import {
    createPost,
    deletePost,
    listPosts,
    type Post,
    updatePost,
} from "../lib/hasura"

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

export const Route = createFileRoute("/")({ component: HomePage })

function HomePage() {
    const [posts, setPosts] = useState<Post[]>([])
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editAuthorName, setEditAuthorName] = useState("")
    const [editTitle, setEditTitle] = useState("")
    const [editContent, setEditContent] = useState("")
    const [savingId, setSavingId] = useState<string | null>(null)
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    async function loadPosts() {
        try {
            setLoading(true)
            setError(null)
            const nextPosts = await getPosts()
            setPosts(nextPosts)
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Failed to load posts",
            )
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadPosts()
    }, [])

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setSubmitting(true)
        setError(null)

        const form = event.currentTarget
        const formData = new FormData(form)
        const title = String(formData.get("title") || "").trim()
        const content = String(formData.get("content") || "").trim()
        const author_name = String(formData.get("author_name") || "").trim()

        if (!title || !content || !author_name) {
            setError("Title, content, and author are required")
            setSubmitting(false)
            return
        }

        try {
            const post = await addPost({
                data: { title, content, author_name },
            })

            setPosts((current) => [post, ...current])
            form.reset()
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Failed to create post",
            )
        } finally {
            setSubmitting(false)
        }
    }

    function startEditing(post: Post) {
        setEditingId(post.id)
        setEditAuthorName(post.author_name)
        setEditTitle(post.title)
        setEditContent(post.content)
        setError(null)
    }

    function cancelEditing() {
        setEditingId(null)
        setEditAuthorName("")
        setEditTitle("")
        setEditContent("")
    }

    async function handleEditSubmit(postId: string) {
        const title = editTitle.trim()
        const content = editContent.trim()
        const author_name = editAuthorName.trim()

        if (!title || !content || !author_name) {
            setError("Title, content, and author are required")
            return
        }

        setSavingId(postId)
        setError(null)

        try {
            const updatedPost = await editPost({
                data: {
                    id: postId,
                    title,
                    content,
                    author_name,
                },
            })

            setPosts((current) =>
                current.map((post) =>
                    post.id === postId ? updatedPost : post,
                ),
            )
            cancelEditing()
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Failed to update post",
            )
        } finally {
            setSavingId(null)
        }
    }

    async function handleDelete(postId: string) {
        setDeletingId(postId)
        setError(null)

        try {
            await removePost({
                data: { id: postId },
            })

            setPosts((current) => current.filter((post) => post.id !== postId))

            if (editingId === postId) {
                cancelEditing()
            }
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Failed to delete post",
            )
        } finally {
            setDeletingId(null)
        }
    }

    return (
        <main className="mx-auto max-w-5xl px-4 py-10">
            <div className="grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
                <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                    <p className="text-sm font-medium text-slate-500">
                        Hasura connected
                    </p>
                    <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
                        Microblog
                    </h1>
                    <p className="mt-3 text-sm leading-6 text-slate-600">
                        Create posts below. This form writes to Postgres through
                        Hasura, and the feed is loaded from the GraphQL API.
                    </p>

                    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                        <div>
                            <label
                                className="mb-1 block text-sm font-medium text-slate-700"
                                htmlFor="author_name"
                            >
                                Author
                            </label>
                            <input
                                id="author_name"
                                name="author_name"
                                type="text"
                                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-0 placeholder:text-slate-400 focus:border-slate-400"
                                placeholder="Jane Doe"
                            />
                        </div>

                        <div>
                            <label
                                className="mb-1 block text-sm font-medium text-slate-700"
                                htmlFor="title"
                            >
                                Title
                            </label>
                            <input
                                id="title"
                                name="title"
                                type="text"
                                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-0 placeholder:text-slate-400 focus:border-slate-400"
                                placeholder="Shipping the first post"
                            />
                        </div>

                        <div>
                            <label
                                className="mb-1 block text-sm font-medium text-slate-700"
                                htmlFor="content"
                            >
                                Content
                            </label>
                            <textarea
                                id="content"
                                name="content"
                                rows={6}
                                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-0 placeholder:text-slate-400 focus:border-slate-400"
                                placeholder="What are you building?"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={submitting}
                            className="inline-flex items-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {submitting ? "Publishing..." : "Publish post"}
                        </button>
                    </form>
                </section>

                <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <p className="text-sm font-medium text-slate-500">
                                Live from Hasura
                            </p>
                            <h2 className="mt-1 text-xl font-semibold text-slate-900">
                                Posts
                            </h2>
                        </div>
                        <button
                            type="button"
                            onClick={loadPosts}
                            className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700"
                        >
                            Refresh
                        </button>
                    </div>

                    {error ? (
                        <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                            {error}
                        </div>
                    ) : null}

                    {loading ? (
                        <p className="mt-6 text-sm text-slate-500">
                            Loading posts...
                        </p>
                    ) : posts.length === 0 ? (
                        <p className="mt-6 text-sm text-slate-500">
                            No posts yet.
                        </p>
                    ) : (
                        <div className="mt-6 space-y-4">
                            {posts.map((post) => {
                                const isEditing = editingId === post.id
                                const isSaving = savingId === post.id
                                const isDeleting = deletingId === post.id

                                return (
                                    <article
                                        key={post.id}
                                        className="rounded-lg border border-slate-200 p-4"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                                <h3 className="text-base font-semibold text-slate-900">
                                                    {post.title}
                                                </h3>
                                                <span className="text-xs uppercase tracking-wide text-slate-400">
                                                    {post.published
                                                        ? "published"
                                                        : "draft"}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {isEditing ? (
                                                    <button
                                                        type="button"
                                                        onClick={cancelEditing}
                                                        disabled={isSaving}
                                                        className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 disabled:cursor-not-allowed disabled:opacity-60"
                                                    >
                                                        Cancel
                                                    </button>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            startEditing(post)
                                                        }
                                                        disabled={isDeleting}
                                                        className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                                                    >
                                                        Edit
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        handleDelete(post.id)
                                                    }
                                                    disabled={
                                                        isDeleting || isSaving
                                                    }
                                                    className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 disabled:cursor-not-allowed disabled:opacity-60"
                                                >
                                                    {isDeleting
                                                        ? "Deleting..."
                                                        : "Delete"}
                                                </button>
                                            </div>
                                        </div>

                                        {isEditing ? (
                                            <div className="mt-4 space-y-3">
                                                <div>
                                                    <label className="mb-1 block text-sm font-medium text-slate-700">
                                                        Author
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={editAuthorName}
                                                        onChange={(event) =>
                                                            setEditAuthorName(
                                                                event.target
                                                                    .value,
                                                            )
                                                        }
                                                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none placeholder:text-slate-400 focus:border-slate-400"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="mb-1 block text-sm font-medium text-slate-700">
                                                        Title
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={editTitle}
                                                        onChange={(event) =>
                                                            setEditTitle(
                                                                event.target
                                                                    .value,
                                                            )
                                                        }
                                                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none placeholder:text-slate-400 focus:border-slate-400"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="mb-1 block text-sm font-medium text-slate-700">
                                                        Content
                                                    </label>
                                                    <textarea
                                                        rows={5}
                                                        value={editContent}
                                                        onChange={(event) =>
                                                            setEditContent(
                                                                event.target
                                                                    .value,
                                                            )
                                                        }
                                                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none placeholder:text-slate-400 focus:border-slate-400"
                                                    />
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        handleEditSubmit(
                                                            post.id,
                                                        )
                                                    }
                                                    disabled={isSaving}
                                                    className="inline-flex items-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
                                                >
                                                    {isSaving
                                                        ? "Saving..."
                                                        : "Save changes"}
                                                </button>
                                            </div>
                                        ) : (
                                            <>
                                                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                                                    {post.content}
                                                </p>
                                                <div className="mt-3 text-xs text-slate-400">
                                                    {post.author_name} ·{" "}
                                                    {new Date(
                                                        post.created_at,
                                                    ).toLocaleString()}
                                                </div>
                                            </>
                                        )}
                                    </article>
                                )
                            })}
                        </div>
                    )}
                </section>
            </div>
        </main>
    )
}
