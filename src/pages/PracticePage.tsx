import { Link, Outlet, useLocation } from "react-router-dom";

export function PracticePage() {
    const location = useLocation();
    const isRoot = location.pathname === "/practice";

    if (!isRoot) {
        return <Outlet />;
    }

    return (
        <div className="flex-1 flex items-center justify-center p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl w-full">
                <Link
                    to="/practice/live"
                    className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 hover:border-emerald-500/50 transition-colors group"
                >
                    <h2 className="text-xl font-bold text-neutral-100 mb-2 group-hover:text-emerald-400">
                        Live Table
                    </h2>
                    <p className="text-neutral-400 text-sm">
                        Play full hands against AI opponents. Review analysis after each hand.
                    </p>
                </Link>
                <Link
                    to="/practice/drills"
                    className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 hover:border-amber-500/50 transition-colors group"
                >
                    <h2 className="text-xl font-bold text-neutral-100 mb-2 group-hover:text-amber-400">
                        Spot Drills
                    </h2>
                    <p className="text-neutral-400 text-sm">
                        Practice isolated decisions with instant GTO feedback. Build muscle memory.
                    </p>
                </Link>
            </div>
        </div>
    );
}

export default PracticePage;
