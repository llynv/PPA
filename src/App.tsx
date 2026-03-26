import { AppShell } from "./components/layout/AppShell";
import { Navigate, Route, Routes } from "react-router-dom";
import { HomePage } from "./pages/HomePage";
import { PracticePage } from "./pages/PracticePage";
import { LiveTablePage } from "./pages/LiveTablePage";
import { DrillsPage } from "./pages/DrillsPage";
import { ReviewPage } from "./pages/ReviewPage";
import { ProgressPage } from "./pages/ProgressPage";
import { LibraryPage } from "./pages/LibraryPage";
import { LearnPage } from "./pages/LearnPage";
import { useHydration } from "./hooks/useHydration";

function App() {
    useHydration();

    return (
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
                <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
        </Routes>
    );
}

export default App;
