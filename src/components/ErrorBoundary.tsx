import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
    onReset?: () => void;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("[ErrorBoundary]", error, errorInfo);
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
        this.props.onReset?.();
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8 text-center">
                    <div className="text-4xl">&#x26A0;</div>
                    <h2 className="text-xl font-semibold text-neutral-100">
                        Something went wrong
                    </h2>
                    <p className="max-w-md text-sm text-neutral-400">
                        An unexpected error occurred. Try resetting or refreshing the page.
                    </p>
                    <div className="flex gap-3">
                        <button
                            onClick={this.handleReset}
                            className="rounded-lg bg-neutral-700 px-4 py-2 text-sm font-medium text-neutral-100 hover:bg-neutral-600 transition-colors"
                        >
                            Try Again
                        </button>
                        <button
                            onClick={() => window.location.reload()}
                            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 transition-colors"
                        >
                            Reload Page
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
