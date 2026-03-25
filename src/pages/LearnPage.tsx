import { useProgressStore } from "../store/progressStore";
import { CURRICULUM } from "../data/curriculum";
import { isTierUnlocked } from "../lib/learning-path";
import { getRecommendation } from "../lib/coaching";
import { RecommendedNext } from "../components/learn/RecommendedNext";
import { CurriculumTierCard } from "../components/learn/CurriculumTierCard";

export function LearnPage() {
    const conceptMastery = useProgressStore((s) => s.conceptMastery);
    const recommendation = getRecommendation(conceptMastery);

    const totalConcepts = CURRICULUM.flatMap((t) => t.concepts).length;
    const practicedCount = Object.values(conceptMastery).filter(
        (m) => m.totalAttempts > 0
    ).length;

    return (
        <div className="max-w-4xl mx-auto px-4 py-8 md:px-6 md:py-12 space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-white">Learning Path</h1>
                {practicedCount > 0 && (
                    <p className="text-sm text-slate-400 mt-1">
                        You&apos;ve practiced {practicedCount}/{totalConcepts} concepts.
                    </p>
                )}
            </div>

            <RecommendedNext recommendation={recommendation} />

            <div className="space-y-6">
                {CURRICULUM.map((tier) => (
                    <CurriculumTierCard
                        key={tier.id}
                        tier={tier}
                        mastery={conceptMastery}
                        isUnlocked={isTierUnlocked(tier, conceptMastery)}
                    />
                ))}
            </div>
        </div>
    );
}
