import { OverviewCards } from "../components/progress/OverviewCards";
import { MasteryGrid } from "../components/progress/MasteryGrid";
import { SessionHistory } from "../components/progress/SessionHistory";
import { WeaknessSpotlight } from "../components/progress/WeaknessSpotlight";

export function ProgressPage() {
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
