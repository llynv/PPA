import { useProgressStore } from "../store/progressStore";
import { CURRICULUM } from "../data/curriculum";
import { isTierUnlocked, recommendNextConcept } from "../lib/learning-path";
import { RecommendedNext } from "../components/learn/RecommendedNext";
import { CurriculumTierCard } from "../components/learn/CurriculumTierCard";

export function LearnPage() {
    const conceptMastery = useProgressStore((s) => s.conceptMastery);
    const recommended = recommendNextConcept(conceptMastery);

    return (
        <div className="max-w-4xl mx-auto px-4 py-8 md:px-6 md:py-12 space-y-8">
            <h1 className="text-2xl font-bold text-white">Learning Path</h1>

            <RecommendedNext concept={recommended} />

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
