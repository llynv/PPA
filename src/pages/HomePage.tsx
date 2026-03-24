import { Link } from "react-router-dom";

export function HomePage() {
    return (
        <div className="max-w-5xl mx-auto px-4 py-8 md:px-6 md:py-12 space-y-8">
            <section className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6 md:p-8">
                <p className="text-sm font-medium text-emerald-400 mb-3">
                    M1 foundation
                </p>
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
                    Learning-first poker coach
                </h1>
                <p className="text-neutral-300 max-w-2xl leading-7">
                    Practice hands, review decisions, and grow a durable study loop.
                    This milestone establishes the product shell while keeping the
                    existing hand engine intact.
                </p>

                <div className="flex flex-wrap gap-3 mt-6">
                    <Link
                        to="/practice"
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-medium transition-colors focus-visible:ring-2 focus-visible:ring-emerald-400"
                    >
                        Start practice
                    </Link>
                    <Link
                        to="/review"
                        className="bg-neutral-800 hover:bg-neutral-700 text-neutral-100 px-4 py-2 rounded-lg font-medium transition-colors border border-neutral-700 focus-visible:ring-2 focus-visible:ring-emerald-400"
                    >
                        Open review
                    </Link>
                </div>
            </section>

            <section className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
                    <h2 className="text-lg font-semibold text-white mb-2">Practice</h2>
                    <p className="text-sm text-neutral-400">
                        Configure a table and play through the current settings → hand → showdown loop.
                    </p>
                </div>
                <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
                    <h2 className="text-lg font-semibold text-white mb-2">Review</h2>
                    <p className="text-sm text-neutral-400">
                        Inspect analysis after a hand and keep feedback separate from live play.
                    </p>
                </div>
                <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
                    <h2 className="text-lg font-semibold text-white mb-2">Progress</h2>
                    <p className="text-sm text-neutral-400">
                        Session trends and study tracking arrive next; this placeholder keeps the shell honest.
                    </p>
                </div>
            </section>
        </div>
    );
}
