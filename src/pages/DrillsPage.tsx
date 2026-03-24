import { useDrillStore } from '../store/drillStore';
import { DrillSetup } from '../components/drill/DrillSetup';

export function DrillsPage() {
    const phase = useDrillStore((s) => s.phase);

    if (phase === 'setup') {
        return <DrillSetup />;
    }

    // Placeholder for phases implemented in Tasks 5-7
    return (
        <div className="flex-1 flex items-center justify-center p-4">
            <div className="text-center">
                <h1 className="text-2xl font-bold text-neutral-100 mb-2">
                    {phase === 'drilling' && 'Drilling...'}
                    {phase === 'feedback' && 'Feedback'}
                    {phase === 'summary' && 'Session Summary'}
                </h1>
                <p className="text-neutral-400">
                    This phase is coming soon.
                </p>
            </div>
        </div>
    );
}
