import { useDrillStore } from '../store/drillStore';
import { DrillSetup } from '../components/drill/DrillSetup';
import { SpotBoard } from '../components/drill/SpotBoard';
import { DrillActionControls } from '../components/drill/DrillActionControls';
import { DrillFeedback } from '../components/drill/DrillFeedback';

export function DrillsPage() {
    const phase = useDrillStore((s) => s.phase);
    const session = useDrillStore((s) => s.session);

    if (phase === 'setup') {
        return <DrillSetup />;
    }

    if (phase === 'drilling' && session) {
        const spot = session.queue[session.currentIndex];
        const progress = `${session.currentIndex + 1} / ${session.queue.length}`;

        return (
            <div className="flex-1 flex flex-col">
                {/* Progress bar */}
                <div className="flex items-center justify-between px-4 py-2 border-b border-neutral-800">
                    <span className="text-sm text-neutral-400">
                        Spot {progress}
                    </span>
                    {session.streak > 0 && (
                        <span className="text-sm text-amber-400 font-medium">
                            Streak: {session.streak}
                        </span>
                    )}
                </div>

                {/* Board display — centered, scrollable */}
                <div className="flex-1 overflow-y-auto flex items-center justify-center p-4">
                    <SpotBoard spot={spot} />
                </div>

                {/* Action controls — pinned to bottom */}
                <DrillActionControls spot={spot} />
            </div>
        );
    }

    if (phase === 'feedback') {
        return <DrillFeedback />;
    }

    // Placeholder for summary phase (Task 7)
    return (
        <div className="flex-1 flex items-center justify-center p-4">
            <div className="text-center">
                <h1 className="text-2xl font-bold text-neutral-100 mb-2">
                    Session Summary
                </h1>
                <p className="text-neutral-400">
                    This phase is coming soon.
                </p>
            </div>
        </div>
    );
}
