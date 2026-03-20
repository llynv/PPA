// ── Action Button with Colored Dot Indicator ────────────────────────

interface ActionButtonProps {
    label: string;
    dotColor: string;
    onClick: () => void;
    ariaLabel?: string;
    disabled?: boolean;
}

export function ActionButton({
    label,
    dotColor,
    onClick,
    ariaLabel,
    disabled = false,
}: ActionButtonProps) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            aria-label={ariaLabel ?? label}
            className={`
                flex items-center gap-2 px-4 py-2.5 md:px-5 md:py-3
                bg-neutral-800 border border-neutral-700
                rounded-md
                text-white font-bold text-xs md:text-sm uppercase tracking-wide
                transition-colors
                hover:bg-neutral-700 hover:border-neutral-600
                focus-visible:ring-2 focus-visible:ring-emerald-400
                disabled:opacity-40 disabled:cursor-not-allowed
                min-h-[40px] md:min-h-[44px]
            `}
        >
            <span
                className={`w-2 h-2 rounded-full flex-shrink-0 ${dotColor}`}
            />
            <span className="whitespace-nowrap">{label}</span>
        </button>
    );
}
