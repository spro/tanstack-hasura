import { Link } from "@tanstack/react-router"

export default function Header() {
    return (
        <header className="border-b border-slate-200 bg-white">
            <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
                <Link
                    to="/"
                    className="text-base font-semibold text-slate-900 no-underline"
                >
                    __PROJECT_NAME__
                </Link>

                <div className="flex items-center gap-4 text-sm">
                    <Link
                        to="/"
                        className="text-slate-600 no-underline"
                        activeProps={{
                            className: "text-slate-900 no-underline",
                        }}
                    >
                        Home
                    </Link>
                    <Link
                        to="/about"
                        className="text-slate-600 no-underline"
                        activeProps={{
                            className: "text-slate-900 no-underline",
                        }}
                    >
                        About
                    </Link>
                </div>
            </nav>
        </header>
    )
}
