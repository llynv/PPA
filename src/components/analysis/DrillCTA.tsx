import { useNavigate } from "react-router-dom";
import type { MistakeType } from "../../types/poker";
import { MISTAKE_TO_DRILL_CONCEPT, MISTAKE_TYPE_LABELS } from "../../lib/mistake-mappings";

interface DrillCTAProps {
    mistakeType: MistakeType;
}

export function DrillCTA({ mistakeType }: DrillCTAProps) {
    const navigate = useNavigate();
    const concept = MISTAKE_TO_DRILL_CONCEPT[mistakeType];

    const handleClick = () => {
        navigate(`/practice/drills?concept=${concept}`);
    };

    return (
        <button
            onClick={handleClick}
            className="flex items-center gap-2 mt-2 px-3 py-1.5 rounded-lg bg-emerald-600/20 border border-emerald-600/30 text-emerald-400 text-xs font-medium hover:bg-emerald-600/30 transition-colors"
        >
            <span>Practice: {MISTAKE_TYPE_LABELS[mistakeType]}</span>
            <span aria-hidden="true">&rarr;</span>
        </button>
    );
}
