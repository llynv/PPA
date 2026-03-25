interface WelcomeOverlayProps {
    onDismiss: () => void;
    onStartLearning: () => void;
}

export function WelcomeOverlay({ onDismiss, onStartLearning }: WelcomeOverlayProps) {
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="welcome-heading"
        >
            <div className="mx-4 max-w-lg rounded-2xl border border-neutral-800 bg-neutral-900 p-8 shadow-2xl">
                <h2
                    id="welcome-heading"
                    className="text-2xl font-bold text-white mb-2"
                >
                    Welcome to PPA
                </h2>
                <p className="text-neutral-400 mb-6">
                    Your personal GTO poker coach.
                </p>

                <ol className="space-y-3 mb-6 list-decimal list-inside text-sm text-neutral-300">
                    <li>Play hands against a GTO opponent</li>
                    <li>Review your mistakes with detailed analysis</li>
                    <li>Drill your weaknesses until they become strengths</li>
                </ol>

                <p className="text-sm text-neutral-400 mb-8">
                    We recommend beginning with the fundamentals.
                </p>

                <div className="flex gap-3">
                    <button
                        onClick={onStartLearning}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-lg font-medium transition-colors focus-visible:ring-2 focus-visible:ring-emerald-400"
                    >
                        Start Learning
                    </button>
                    <button
                        onClick={onDismiss}
                        className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 px-5 py-2.5 rounded-lg font-medium transition-colors border border-neutral-700 focus-visible:ring-2 focus-visible:ring-emerald-400"
                    >
                        Skip
                    </button>
                </div>
            </div>
        </div>
    );
}
