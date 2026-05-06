import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import AnalysesDashboard from './views/AnalysesDashboard.jsx';
import NewAnalysis from './views/NewAnalysis.jsx';
import AnalysisResults from './views/AnalysisResults.jsx';
import CompareSheets from './views/CompareSheets.jsx';
import SubmittalExport from './views/SubmittalExport.jsx';
import Library from './views/Library.jsx';
import SettingsView from './views/Settings.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/analyses" replace />} />
          <Route path="analyses" element={<AnalysesDashboard />} />
          <Route path="analyses/new" element={<NewAnalysis />} />
          <Route path="analyses/:id" element={<AnalysisResults />} />
          <Route path="analyses/:id/compare" element={<CompareSheets />} />
          <Route path="analyses/:id/export" element={<SubmittalExport />} />
          <Route path="library" element={<Library />} />
          <Route path="settings" element={<SettingsView />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
