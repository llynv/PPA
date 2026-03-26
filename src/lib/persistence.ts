import { get, set, del } from "idb-keyval";
import type { AttemptRecord } from "../types/progress";

export const ATTEMPTS_KEY = "ppa-attempts-v1";

export async function loadAttempts(): Promise<AttemptRecord[]> {
    try {
        const data = await get<AttemptRecord[]>(ATTEMPTS_KEY);
        return data ?? [];
    } catch {
        console.warn("[PPA] Failed to load attempts from IndexedDB");
        return [];
    }
}

export async function saveAttempts(attempts: AttemptRecord[]): Promise<void> {
    try {
        await set(ATTEMPTS_KEY, attempts);
    } catch {
        console.warn("[PPA] Failed to save attempts to IndexedDB");
    }
}

export async function clearAttempts(): Promise<void> {
    try {
        await del(ATTEMPTS_KEY);
    } catch {
        console.warn("[PPA] Failed to clear attempts from IndexedDB");
    }
}
