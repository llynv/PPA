import { useEffect } from "react";
import { useProgressStore } from "../store/progressStore";

export function useHydration(): boolean {
    const isHydrated = useProgressStore((s) => s.isHydrated);
    const hydrate = useProgressStore((s) => s.hydrate);

    useEffect(() => {
        hydrate();
    }, [hydrate]);

    return isHydrated;
}
