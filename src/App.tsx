import { Suspense, lazy } from "react";
import { AppShell } from "./components/layout/AppShell";
import { Navigate, Route, Routes } from "react-router-dom";
import { useHydration } from "./hooks/useHydration";

const HomePage = lazy(() => import("./pages/HomePage"));
const PracticePage = lazy(() => import("./pages/PracticePage"));
const LiveTablePage = lazy(() => import("./pages/LiveTablePage"));
const DrillsPage = lazy(() => import("./pages/DrillsPage"));
const ReviewPage = lazy(() => import("./pages/ReviewPage"));
const ProgressPage = lazy(() => import("./pages/ProgressPage"));
const LibraryPage = lazy(() => import("./pages/LibraryPage"));
const LearnPage = lazy(() => import("./pages/LearnPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));

function App() {
    useHydration();

    return (
        <Suspense fallback={
            <div className="flex items-center justify-center h-dvh bg-neutral-950 text-neutral-400">
                Loading...
            </div>
        }>
            <Routes>
                <Route element={<AppShell />}>
                    <Route index element={<HomePage />} />
                    <Route path="practice" element={<PracticePage />}>
                        <Route path="live" element={<LiveTablePage />} />
                        <Route path="drills" element={<DrillsPage />} />
                    </Route>
                    <Route path="review" element={<ReviewPage />} />
                    <Route path="learn" element={<LearnPage />} />
                    <Route path="progress" element={<ProgressPage />} />
                    <Route path="library" element={<LibraryPage />} />
                    <Route path="settings" element={<SettingsPage />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Route>
            </Routes>
        </Suspense>
    );
}

export default App;
