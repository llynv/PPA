import type { ActionType } from '../../types/poker';
import { mapToFrequencyKey } from '../../store/drillStore';

// ── Frequency Bar ───────────────────────────────────────────────────
// Horizontal stacked bar showing fold/call/raise GTO frequencies.
// The hero's chosen action segment is highlighted with a brighter
// outline and slightly elevated opacity.

const ACTION_COLORS = {
    Fold: '#ef4444',   // red-500
    Call: '#10b981',   // emerald-500
    Raise: '#f59e0b',  // amber-500
};

interface FrequencyBarProps {
    frequencies: { fold: number; call: number; raise: number };
    heroAction: ActionType;
}

const SEGMENTS: { key: 'fold' | 'call' | 'raise'; label: string; color: string }[] = [
    { key: 'fold', label: 'Fold', color: ACTION_COLORS.Fold },
    { key: 'call', label: 'Call', color: ACTION_COLORS.Call },
    { key: 'raise', label: 'Raise', color: ACTION_COLORS.Raise },
];

export function FrequencyBar({ frequencies, heroAction }: FrequencyBarProps) {
    const heroKey = mapToFrequencyKey(heroAction);

    return (
        <div className="space-y-1.5">
            {/* Stacked horizontal bar */}
            <div className="flex h-7 rounded-md overflow-hidden">
                {SEGMENTS.map(({ key, color }) => {
                    const pct = frequencies[key] * 100;
                    if (pct < 0.5) return null; // skip negligible segments

                    const isHero = key === heroKey;

                    return (
                        <div
                            key={key}
                            className="relative flex items-center justify-center transition-all"
                            style={{
                                width: `${pct}%`,
                                backgroundColor: color,
                                opacity: isHero ? 1 : 0.5,
                                outline: isHero ? '2px solid white' : 'none',
                                outlineOffset: '-2px',
                                zIndex: isHero ? 1 : 0,
                            }}
                        >
                            {pct >= 12 && (
                                <span className="text-xs font-bold text-white drop-shadow-sm">
                                    {Math.round(pct)}%
                                </span>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Legend below the bar */}
            <div className="flex gap-3 text-xs">
                {SEGMENTS.map(({ key, label, color }) => {
                    const pct = frequencies[key] * 100;
                    if (pct < 0.5) return null;

                    const isHero = key === heroKey;

                    return (
                        <span
                            key={key}
                            className={`flex items-center gap-1 ${isHero ? 'font-bold text-neutral-100' : 'text-neutral-400'}`}
                        >
                            <span
                                className="inline-block w-2.5 h-2.5 rounded-sm"
                                style={{ backgroundColor: color, opacity: isHero ? 1 : 0.5 }}
                            />
                            {label} {Math.round(pct)}%
                        </span>
                    );
                })}
            </div>
        </div>
    );
}
