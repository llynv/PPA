import type { HeroGrade as HeroGradeType } from '../../types/poker';

interface HeroGradeProps {
  grade: HeroGradeType;
  evLoss: number;
}

function getGradeColor(grade: HeroGradeType): string {
  if (grade.startsWith('A')) return '#10b981'; // emerald-500
  if (grade.startsWith('B')) return '#0ea5e9'; // sky-500
  if (grade.startsWith('C')) return '#f59e0b'; // amber-500
  if (grade === 'D') return '#f97316'; // orange-500
  return '#ef4444'; // red-500
}

function getGradePercent(grade: HeroGradeType): number {
  const map: Record<HeroGradeType, number> = {
    'A+': 100, 'A': 92, 'A-': 85,
    'B+': 78, 'B': 70, 'B-': 63,
    'C+': 55, 'C': 48, 'C-': 40,
    'D': 25,
    'F': 5,
  };
  return map[grade];
}

export function HeroGrade({ grade, evLoss }: HeroGradeProps) {
  const color = getGradeColor(grade);
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const gradePercent = getGradePercent(grade);
  const offset = circumference * (1 - gradePercent / 100);

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
        EV Loss: {evLoss > 0 ? '-' : ''}{Math.abs(evLoss).toFixed(1)} BB
      </p>
    </div>
  );
}
