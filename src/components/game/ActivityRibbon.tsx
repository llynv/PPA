import { useGameStore } from "../../store/gameStore";

export function ActivityRibbon() {
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
            className="text-xs font-medium px-3 py-1 rounded-full transition-opacity duration-150"
            style={{
                background: "var(--sd-smoke)",
                color: "var(--sd-ivory)",
                opacity: 0.7,
            }}
        >
            {message}
        </div>
    );
}
