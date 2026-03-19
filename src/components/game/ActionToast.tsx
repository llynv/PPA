import { useGameStore } from "../../store/gameStore";

export function ActionToast() {
    const toast = useGameStore((s) => s.aiActionToast);

    if (!toast) return null;

    const message =
        toast.amount != null
            ? `${toast.playerName} ${toast.action} $${toast.amount.toLocaleString()}`
            : `${toast.playerName} ${toast.action}`;

    return (
        <div
            role="status"
            aria-live="polite"
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30
                       bg-slate-800/90 border border-slate-600 rounded-lg px-4 py-2
                       text-white text-sm font-medium shadow-lg
                       animate-in fade-in duration-200"
        >
            {message}
        </div>
    );
}
