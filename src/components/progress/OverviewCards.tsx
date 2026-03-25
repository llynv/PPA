import { useProgressStore } from "../../store/progressStore";
import type { HeroGrade } from "../../types/poker";

function getGradeColor(grade: HeroGrade): string {
    if (grade.startsWith("A")) return "text-emerald-400";
    if (grade.startsWith("B")) return "text-sky-400";
    if (grade.startsWith("C")) return "text-amber-400";
    if (grade === "D") return "text-orange-400";
    return "text-red-400";
}

function getAccuracyColor(accuracy: number): string {
    if (accuracy >= 0.8) return "text-emerald-400";
    if (accuracy >= 0.6) return "text-blue-400";
    if (accuracy >= 0.4) return "text-amber-400";
    return "text-red-400";
}

export function OverviewCards() {
    const totalHands = useProgressStore((s) => s.overallStats.totalHands);
    const totalDrills = useProgressStore((s) => s.overallStats.totalDrills);
    const overallAccuracy = useProgressStore((s) => s.overallStats.overallAccuracy);
    const currentStreak = useProgressStore((s) => s.overallStats.currentStreak);
    const bestStreak = useProgressStore((s) => s.overallStats.bestStreak);
    const averageGrade = useProgressStore((s) => s.overallStats.averageGrade);

    if (totalHands + totalDrills === 0) {
        return (
            <div className="bg-slate-800 rounded-xl p-6 shadow-lg text-center">
                <p className="text-slate-400 text-sm">
                    Play some hands or drills to see your progress here.
                </p>
            </div>
        );
    }

    const totalPlayed = totalHands + totalDrills;
    const accuracyPercent = Math.round(overallAccuracy * 100);

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Hands Played */}
            <div className="bg-slate-800 rounded-xl p-4 shadow-lg">
                <p className="text-2xl font-bold text-neutral-100">{totalPlayed}</p>
                <p className="text-xs text-slate-400 mt-1">Hands Played</p>
                <p className="text-xs text-slate-500 mt-0.5">
                    {totalHands} live &middot; {totalDrills} drills
                </p>
            </div>

            {/* Overall Accuracy */}
            <div className="bg-slate-800 rounded-xl p-4 shadow-lg">
                <p className={`text-2xl font-bold ${getAccuracyColor(overallAccuracy)}`}>
                    {accuracyPercent}%
                </p>
                <p className="text-xs text-slate-400 mt-1">Overall Accuracy</p>
            </div>

            {/* Current Streak */}
            <div className="bg-slate-800 rounded-xl p-4 shadow-lg">
                <p className="text-2xl font-bold text-neutral-100">{currentStreak}</p>
                <p className="text-xs text-slate-400 mt-1">Current Streak</p>
                <p className="text-xs text-slate-500 mt-0.5">Best: {bestStreak}</p>
            </div>

            {/* Average Grade */}
            <div className="bg-slate-800 rounded-xl p-4 shadow-lg">
                <p className={`text-2xl font-bold ${getGradeColor(averageGrade)}`}>
                    {averageGrade}
                </p>
                <p className="text-xs text-slate-400 mt-1">Average Grade</p>
            </div>
        </div>
    );
}
