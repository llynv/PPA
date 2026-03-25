import { useState, useCallback } from "react";

const ONBOARDING_KEY = "ppa_onboarded";

export function useOnboarding() {
    const [showOnboarding, setShowOnboarding] = useState(
        () => !localStorage.getItem(ONBOARDING_KEY)
    );

    const dismissOnboarding = useCallback(() => {
        localStorage.setItem(ONBOARDING_KEY, "true");
        setShowOnboarding(false);
    }, []);

    return { showOnboarding, dismissOnboarding };
}
