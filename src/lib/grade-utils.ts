import type { HeroGrade } from "../types/poker";

/**
 * Returns a Tailwind text-color class for the given grade.
 */
export function getGradeColorClass(grade: HeroGrade): string {
    if (grade.startsWith("A")) return "text-emerald-400";
    if (grade.startsWith("B")) return "text-sky-400";
    if (grade.startsWith("C")) return "text-amber-400";
    if (grade.startsWith("D")) return "text-orange-400";
    return "text-red-400";
}

/**
 * Returns a hex color string for the given grade.
 */
export function getGradeColorHex(grade: HeroGrade): string {
    if (grade.startsWith("A")) return "#10b981";
    if (grade.startsWith("B")) return "#0ea5e9";
    if (grade.startsWith("C")) return "#f59e0b";
    if (grade.startsWith("D")) return "#f97316";
    return "#ef4444";
}
