import type { HeroGrade as HeroGradeType, Decision } from "../../types/poker";
import { useGameStore } from "../../store/gameStore";

interface HeroGradeProps {
    grade: HeroGradeType;
    evLoss: number;
    decisions?: Decision[];
}

function getGradeColor(grade: HeroGradeType): string {
    if (grade.startsWith("A")) return "#10b981"; // emerald-500
    if (grade.startsWith("B")) return "#0ea5e9"; // sky-500
    if (grade.startsWith("C")) return "#f59e0b"; // amber-500
    if (grade === "D") return "#f97316"; // orange-500
    return "#ef4444"; // red-500
}

function getGradePercent(grade: HeroGradeType): number {
    const map: Record<HeroGradeType, number> = {
        "A+": 100,
        A: 92,
        "A-": 85,
        "B+": 78,
        B: 70,
        "B-": 63,
        "C+": 55,
        C: 48,
        "C-": 40,
        D: 25,
        F: 5,
    };
    return map[grade];
}

export function HeroGrade({ grade, evLoss, decisions }: HeroGradeProps) {
    const color = getGradeColor(grade);
    const radius = 70;
    const circumference = 2 * Math.PI * radius;
    const gradePercent = getGradePercent(grade);
    const offset = circumference * (1 - gradePercent / 100);
    const sessionAnalyses = useGameStore((s) => s.sessionAnalyses);

    // Count mistakes (decisions where heroAction !== optimalAction)
    const mistakeCount = decisions
        ? decisions.filter((d) => d.heroAction !== d.optimalAction).length
        : undefined;
    const decisionCount = decisions?.length;

    // Generate summary sentence
    const summary = generateSummary(grade, mistakeCount, decisionCount, evLoss);

    // Session streak: count consecutive hands with the same or better grade
    const streak = getStreak(sessionAnalyses);

    return (
        <div className="bg-slate-800 rounded-xl p-6 shadow-lg flex flex-col items-center">
            <svg width={160} height={160} viewBox="0 0 160 160">
                {/* Background circle */}
                <circle
                    cx={80}
                    cy={80}
                    r={radius}
                    fill="none"
                    stroke="#334155"
                    strokeWidth={10}
                />
                {/* Foreground arc */}
                <circle
                    cx={80}
                    cy={80}
                    r={radius}
                    fill="none"
                    stroke={color}
                    strokeWidth={10}
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    transform="rotate(-90 80 80)"
                    className="transition-all duration-700 ease-out"
                />
                {/* Grade letter */}
                <text
                    x={80}
                    y={80}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill={color}
                    fontSize={40}
                    fontWeight="bold"
                >
                    {grade}
                </text>
            </svg>

            <p className="mt-3 text-lg font-semibold" style={{ color }}>
                EV Loss: {evLoss > 0 ? "-" : ""}
                {Math.abs(evLoss).toFixed(1)} BB
            </p>

            {decisionCount != null && (
                <p className="text-slate-500 text-sm mt-1">
                    {decisionCount} decision{decisionCount !== 1 ? "s" : ""}
                    {mistakeCount != null && mistakeCount > 0 && (
                        <span className="text-red-400">
                            {" "}
                            &middot; {mistakeCount} mistake
                            {mistakeCount !== 1 ? "s" : ""}
                        </span>
                    )}
                    {mistakeCount === 0 && (
                        <span className="text-emerald-400"> &middot; perfect</span>
                    )}
                </p>
            )}

            {/* Summary sentence */}
            {summary && (
                <p className="text-slate-400 text-xs mt-2 text-center max-w-[250px]">
                    {summary}
                </p>
            )}

            {/* Session streak */}
            {streak != null && streak >= 2 && (
                <p className="text-blue-400 text-xs mt-1 font-medium">
                    {streak}-hand streak of {grade.startsWith("A") ? "A" : grade}+ grades
                </p>
            )}
        </div>
    );
}

// ── Helpers ─────────────────────────────────────────────────────────

function generateSummary(
    grade: HeroGradeType,
    mistakeCount: number | undefined,
    decisionCount: number | undefined,
    evLoss: number,
): string {
    if (decisionCount == null) return "";

    if (grade.startsWith("A") && (mistakeCount ?? 0) === 0) {
        return "Excellent play — no mistakes detected.";
    }
    if (grade.startsWith("A")) {
        return `Strong play — ${mistakeCount === 1 ? "one minor error" : `${mistakeCount} small errors`} overall.`;
    }
    if (grade.startsWith("B")) {
        return `Good play with room to improve. ${evLoss.toFixed(1)} BB left on the table.`;
    }
    if (grade.startsWith("C")) {
        return `Mixed results — some key decisions cost you ${evLoss.toFixed(1)} BB.`;
    }
    return `Several costly mistakes. Review the decisions below to improve.`;
}

function getStreak(
    sessionAnalyses: { heroGrade: HeroGradeType }[],
): number | null {
    if (sessionAnalyses.length < 2) return null;

    const latest = sessionAnalyses[sessionAnalyses.length - 1];
    const latestLetter = latest.heroGrade.charAt(0);
    let count = 0;

    for (let i = sessionAnalyses.length - 1; i >= 0; i--) {
        if (sessionAnalyses[i].heroGrade.charAt(0) <= latestLetter) {
            count++;
        } else {
            break;
        }
    }

    return count;
}
