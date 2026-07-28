import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { BotsPage } from './pages/BotsPage';
import { MonitorsPage } from './pages/MonitorsPage';
import { IntelligencePage } from './pages/IntelligencePage';
import { SettingsPage } from './pages/SettingsPage';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/bots" element={<BotsPage />} />
          <Route path="/monitors" element={<MonitorsPage />} />
          <Route path="/intelligence" element={<IntelligencePage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}