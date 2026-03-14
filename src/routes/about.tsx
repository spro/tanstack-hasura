import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/about")({
    component: AboutPage,
})

function AboutPage() {
    return (
        <main className="mx-auto min-h-[calc(100vh-129px)] max-w-5xl px-4 py-12">
            <section className="rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
                <h1 className="text-2xl font-semibold text-slate-900">About</h1>
                <p className="mt-4 text-slate-600">
                    Minimal placeholder page. Replace or remove this route
                    anytime.
                </p>
            </section>
        </main>
    )
}
