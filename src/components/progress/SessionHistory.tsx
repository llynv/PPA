import { useProgressStore } from "../../store/progressStore";
import type { HeroGrade } from "../../types/poker";

function formatRelativeTime(timestamp: number): string {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

function getGradeColor(grade: HeroGrade): string {
    if (grade.startsWith("A")) return "text-emerald-400";
    if (grade.startsWith("B")) return "text-sky-400";
    if (grade.startsWith("C")) return "text-amber-400";
    if (grade === "D") return "text-orange-400";
    return "text-red-400";
}

export function SessionHistory() {
    const sessions = useProgressStore((s) => s.sessions);

    if (sessions.length === 0) {
        return (
            <div className="bg-slate-800 rounded-xl p-6 shadow-lg text-center">
                <p className="text-slate-400 text-sm">No sessions recorded yet.</p>
            </div>
        );
    }

    const recentSessions = [...sessions].reverse().slice(0, 20);

    return (
        <div className="bg-slate-800 rounded-xl shadow-lg overflow-hidden">
            {recentSessions.map((session, index) => {
                const isLast = index === recentSessions.length - 1;
                const evSign = session.totalEvDelta >= 0 ? "+" : "";
                const evColor =
                    session.totalEvDelta >= 0 ? "text-emerald-400" : "text-red-400";

                return (
                    <div
                        key={session.id}
                        className={`flex items-center justify-between px-4 py-3 ${
                            !isLast ? "border-b border-slate-700" : ""
                        }`}
                    >
                        {/* Left: time + type badge */}
                        <div className="flex items-center gap-3 min-w-0">
                            <span className="text-xs text-slate-500 w-16 shrink-0">
                                {formatRelativeTime(session.timestamp)}
                            </span>
                            <span
                                className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${
                                    session.type === "live"
                                        ? "bg-emerald-900/30 text-emerald-400"
                                        : "bg-amber-900/30 text-amber-400"
                                }`}
                            >
                                {session.type === "live" ? "Live" : "Drill"}
                            </span>
                            <span className="text-xs text-slate-400 truncate">
                                {session.handsPlayed}{" "}
                                {session.type === "live" ? "hands" : "drills"}
                            </span>
                        </div>

                        {/* Right: grade/accuracy + EV */}
                        <div className="flex items-center gap-3 shrink-0">
                            {session.type === "live" && session.averageGrade && (
                                <span
                                    className={`text-sm font-bold ${getGradeColor(session.averageGrade)}`}
                                >
                                    {session.averageGrade}
                                </span>
                            )}
                            {session.type === "drill" && session.accuracy != null && (
                                <span className="text-sm font-bold text-amber-400">
                                    {Math.round(session.accuracy * 100)}%
                                </span>
                            )}
                            <span className={`text-xs font-medium ${evColor}`}>
                                {evSign}
                                {session.totalEvDelta.toFixed(1)} BB
                            </span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
