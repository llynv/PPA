import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    Legend,
    Cell,
} from "recharts";
import type { Decision } from "../../types/poker";

interface DecisionChartProps {
    decisions: Decision[];
}

const ACTION_COLORS = {
    Fold: "#ef4444", // red-500
    Call: "#10b981", // emerald-500
    Raise: "#f59e0b", // amber-500
} as const;

type ActionKey = keyof typeof ACTION_COLORS;

// Map hero action to the chart bar key
function heroActionToKey(action: string): ActionKey {
    switch (action) {
        case "fold":
            return "Fold";
        case "call":
            return "Call";
        case "check":
            return "Call"; // check maps to call bucket
        case "bet":
            return "Raise"; // bet maps to raise bucket
        case "raise":
            return "Raise";
        default:
            return "Call";
    }
}

interface ChartDataPoint {
    round: string;
    Fold: number;
    Call: number;
    Raise: number;
    heroKey: ActionKey;
}

export function DecisionChart({ decisions }: DecisionChartProps) {
    const chartData: ChartDataPoint[] = decisions.map((d) => ({
        round: d.round.charAt(0).toUpperCase() + d.round.slice(1),
        Fold: Math.round(d.optimalFrequencies.fold * 100),
        Call: Math.round(d.optimalFrequencies.call * 100),
        Raise: Math.round(d.optimalFrequencies.raise * 100),
        heroKey: heroActionToKey(d.heroAction),
    }));

    if (chartData.length === 0) {
        return (
            <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
                <h3 className="text-lg font-semibold text-slate-100 mb-4">
                    Optimal Frequencies
                </h3>
                <p className="text-slate-400 text-sm">
                    No decisions to display.
                </p>
            </div>
        );
    }

    return (
        <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-slate-100 mb-4">
                Optimal Frequencies
            </h3>

            <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData} barCategoryGap="20%">
                    <XAxis
                        dataKey="round"
                        tick={{ fill: "#94a3b8", fontSize: 12 }}
                        axisLine={{ stroke: "#334155" }}
                        tickLine={false}
                    />
                    <YAxis
                        tick={{ fill: "#94a3b8", fontSize: 12 }}
                        axisLine={{ stroke: "#334155" }}
                        tickLine={false}
                        tickFormatter={(v: number) => `${v}%`}
                        domain={[0, 100]}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: "#1e293b",
                            border: "1px solid #334155",
                            borderRadius: "8px",
                            color: "#e2e8f0",
                        }}
                        formatter={(value: number, name: string) => [
                            `${value}%`,
                            name,
                        ]}
                        cursor={{ fill: "rgba(148,163,184,0.1)" }}
                    />
                    <Legend wrapperStyle={{ color: "#94a3b8", fontSize: 12 }} />

                    {(["Fold", "Call", "Raise"] as const).map((key) => (
                        <Bar
                            key={key}
                            dataKey={key}
                            name={key}
                            stackId={undefined}
                        >
                            {chartData.map((entry, index) => (
                                <Cell
                                    key={index}
                                    fill={ACTION_COLORS[key]}
                                    opacity={entry.heroKey === key ? 1 : 0.5}
                                    stroke={
                                        entry.heroKey === key
                                            ? "#ffffff"
                                            : "none"
                                    }
                                    strokeWidth={entry.heroKey === key ? 2 : 0}
                                />
                            ))}
                        </Bar>
                    ))}
                </BarChart>
            </ResponsiveContainer>

            <p className="text-xs text-slate-500 mt-2 text-center">
                Highlighted bars indicate hero&apos;s actual action
            </p>
        </div>
    );
}
