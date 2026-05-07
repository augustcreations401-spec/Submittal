import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import AnalysesDashboard from './views/AnalysesDashboard.jsx';
import NewAnalysis from './views/NewAnalysis.jsx';
import AnalysisResults from './views/AnalysisResults.jsx';
import CompareSheets from './views/CompareSheets.jsx';
import SubmittalExport from './views/SubmittalExport.jsx';
import Library from './views/Library.jsx';
import SettingsView from './views/Settings.jsx';
import ProjectsDashboard from './views/ProjectsDashboard.jsx';
import ProjectDetail from './views/ProjectDetail.jsx';
import ItemDetail from './views/ItemDetail.jsx';
import BuildPackage from './views/BuildPackage.jsx';
import AllSubmittals from './views/AllSubmittals.jsx';
import AuditTrail from './views/AuditTrail.jsx';

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
          <Route path="projects" element={<ProjectsDashboard />} />
          <Route path="projects/:id" element={<ProjectDetail />} />
          <Route path="projects/:id/items/:itemId" element={<ItemDetail />} />
          <Route path="projects/:id/items/:itemId/package" element={<BuildPackage />} />
          <Route path="submittals" element={<AllSubmittals />} />
          <Route path="audit" element={<AuditTrail />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
