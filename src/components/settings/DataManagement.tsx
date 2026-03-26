import { useState } from "react";
import { useProgressStore } from "../../store/progressStore";

export function DataManagement() {
    const exportData = useProgressStore((s) => s.exportData);
    const importData = useProgressStore((s) => s.importData);
    const clearAllData = useProgressStore((s) => s.clearAllData);
    const isHydrated = useProgressStore((s) => s.isHydrated);

    const [status, setStatus] = useState<string | null>(null);
    const [showClearConfirm, setShowClearConfirm] = useState(false);

    const handleExport = async () => {
        try {
            const json = await exportData();
            const blob = new Blob([json], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            const date = new Date().toISOString().split("T")[0];
            a.href = url;
            a.download = `ppa-backup-${date}.json`;
            a.click();
            URL.revokeObjectURL(url);
            setStatus("Data exported successfully");
        } catch {
            setStatus("Export failed");
        }
    };

    const handleImport = () => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".json";
        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;
            try {
                const text = await file.text();
                await importData(text);
                setStatus("Data imported successfully");
            } catch (err) {
                setStatus(`Import failed: ${err instanceof Error ? err.message : "Unknown error"}`);
            }
        };
        input.click();
    };

    const handleClear = async () => {
        await clearAllData();
        setShowClearConfirm(false);
        setStatus("All data cleared");
    };

    return (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
            <h2 className="text-lg font-bold text-neutral-100 mb-1">Data Management</h2>
            <p className="text-neutral-400 text-sm mb-4">
                Export, import, or clear your training data.
            </p>

            {!isHydrated && (
                <p className="text-amber-400 text-sm mb-4">Loading data from storage...</p>
            )}

            <div className="flex flex-wrap gap-3 mb-4">
                <button
                    onClick={handleExport}
                    disabled={!isHydrated}
                    className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-neutral-700 disabled:text-neutral-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                    Export Backup
                </button>

                <button
                    onClick={handleImport}
                    disabled={!isHydrated}
                    className="bg-blue-600 hover:bg-blue-500 disabled:bg-neutral-700 disabled:text-neutral-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                    Import Backup
                </button>

                {!showClearConfirm ? (
                    <button
                        onClick={() => setShowClearConfirm(true)}
                        className="bg-red-700 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                        Clear All Data
                    </button>
                ) : (
                    <div className="flex items-center gap-2">
                        <span className="text-red-400 text-sm">Are you sure?</span>
                        <button
                            onClick={handleClear}
                            className="bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 rounded text-sm font-medium transition-colors"
                        >
                            Yes, delete everything
                        </button>
                        <button
                            onClick={() => setShowClearConfirm(false)}
                            className="bg-neutral-700 hover:bg-neutral-600 text-white px-3 py-1.5 rounded text-sm font-medium transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                )}
            </div>

            {status && (
                <p className="text-sm text-neutral-300">{status}</p>
            )}
        </div>
    );
}
