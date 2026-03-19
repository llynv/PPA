import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    CartesianGrid,
    ReferenceLine,
} from "recharts";
import type { AnalysisData } from "../../types/poker";

interface EVTrackerProps {
    analyses: AnalysisData[];
}

export function EVTracker({ analyses }: EVTrackerProps) {
    if (analyses.length === 0) {
        return null;
    }

    // Single hand: show a simple stat instead of a chart
    if (analyses.length === 1) {
        const single = analyses[0];
        return (
            <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
                <h3 className="text-lg font-semibold text-slate-100 mb-4">
                    Session EV Tracker
                </h3>
                <div className="text-center py-4">
                    <p className="text-slate-400 text-sm">
                        First hand of the session
                    </p>
                    <p
                        className={`text-2xl font-bold mt-1 ${single.totalEvLoss <= 0 ? "text-emerald-400" : "text-red-400"}`}
                    >
                        {single.totalEvLoss === 0
                            ? "0.0"
                            : `-${single.totalEvLoss.toFixed(1)}`}{" "}
                        BB
                    </p>
                    <p className="text-slate-500 text-xs mt-1">
                        Play more hands to see your EV trend
                    </p>
                </div>
            </div>
        );
    }

    const data = analyses.map((a, i) => ({
        hand: a.handNumber,
        evLoss: Number(
            (
                analyses
                    .slice(0, i + 1)
                    .reduce((sum, x) => sum + x.totalEvLoss, 0) * -1
            ).toFixed(2),
        ),
    }));

    const minEV = Math.min(...data.map((d) => d.evLoss));
    const maxEV = Math.max(...data.map((d) => d.evLoss));
    const yMin = Math.floor(Math.min(minEV, 0) - 1);
    const yMax = Math.ceil(Math.max(maxEV, 0) + 1);

    return (
        <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-slate-100 mb-4">
                Session EV Tracker
            </h3>

            <ResponsiveContainer width="100%" height={240}>
                <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis
                        dataKey="hand"
                        tick={{ fill: "#94a3b8", fontSize: 12 }}
                        axisLine={{ stroke: "#334155" }}
                        tickLine={false}
                        label={{
                            value: "Hand #",
                            position: "insideBottom",
                            offset: -5,
                            fill: "#64748b",
                            fontSize: 11,
                        }}
                    />
                    <YAxis
                        tick={{ fill: "#94a3b8", fontSize: 12 }}
                        axisLine={{ stroke: "#334155" }}
                        tickLine={false}
                        domain={[yMin, yMax]}
                        tickFormatter={(v: number) => `${v}`}
                        label={{
                            value: "EV (BB)",
                            angle: -90,
                            position: "insideLeft",
                            fill: "#64748b",
                            fontSize: 11,
                        }}
                    />
                    <ReferenceLine
                        y={0}
                        stroke="#64748b"
                        strokeDasharray="4 4"
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: "#1e293b",
                            border: "1px solid #334155",
                            borderRadius: "8px",
                            color: "#e2e8f0",
                        }}
                        formatter={(value: number) => [
                            `${value.toFixed(2)} BB`,
                            "Cumulative EV",
                        ]}
                        labelFormatter={(label: number) => `Hand #${label}`}
                    />
                    <Line
                        type="monotone"
                        dataKey="evLoss"
                        stroke="#ef4444"
                        strokeWidth={2}
                        dot={{
                            r: 4,
                            fill: "#ef4444",
                            stroke: "#1e293b",
                            strokeWidth: 2,
                        }}
                        activeDot={{ r: 6, fill: "#ef4444" }}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}
