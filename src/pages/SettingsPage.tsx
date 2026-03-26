import { DataManagement } from "../components/settings/DataManagement";

export function SettingsPage() {
    return (
        <div className="max-w-2xl mx-auto p-6 space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-neutral-100 mb-1">Settings</h1>
                <p className="text-neutral-400 text-sm">
                    Manage your data and preferences.
                </p>
            </div>

            <DataManagement />

            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
                <h2 className="text-lg font-bold text-neutral-100 mb-1">About</h2>
                <p className="text-neutral-400 text-sm">
                    PPA — Poker Practice App v0.1.0
                </p>
                <p className="text-neutral-500 text-xs mt-2">
                    Learning-first GTO coach. Built with React, TypeScript, and Zustand.
                </p>
            </div>
        </div>
    );
}

export default SettingsPage;
