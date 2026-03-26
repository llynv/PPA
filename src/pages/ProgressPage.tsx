import { useProgressStore } from "../store/progressStore";
import { OverviewCards } from "../components/progress/OverviewCards";
import { MasteryGrid } from "../components/progress/MasteryGrid";
import { SessionHistory } from "../components/progress/SessionHistory";
import { WeaknessSpotlight } from "../components/progress/WeaknessSpotlight";

export function ProgressPage() {
    const isHydrated = useProgressStore((s) => s.isHydrated);

    if (!isHydrated) {
        return (
            <div className="max-w-4xl mx-auto px-4 py-8 md:px-6 md:py-12 space-y-8">
                <h1 className="text-2xl font-bold text-white">Progress</h1>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    {[...Array(4)].map((_, i) => (
                        <div
                            key={i}
                            className="h-24 animate-pulse rounded-xl bg-neutral-800"
                        />
                    ))}
                </div>
                <div className="h-48 animate-pulse rounded-xl bg-neutral-800" />
                <div className="h-64 animate-pulse rounded-xl bg-neutral-800" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto px-4 py-8 md:px-6 md:py-12 space-y-8">
            <h1 className="text-2xl font-bold text-white">Progress</h1>

            <OverviewCards />

            <WeaknessSpotlight />

            <MasteryGrid />

            <SessionHistory />
        </div>
    );
}

export default ProgressPage;
