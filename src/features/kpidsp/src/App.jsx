import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import DashboardHealth from './pages/DashboardHealth/index';
import DashboardOverview from './pages/DashboardOverview/index';
import DataEntry from './pages/DataEntry';
import DataEntryHealth from './pages/DataEntryHealth';
import KPIGroup from './pages/KPIGroup';
import ManageSDGs from './pages/ManageSDGs';
import ManageHealth from './pages/ManageHealth';
import ProtectedAdminRoute, { UnauthorizedPanel } from './components/auth/ProtectedAdminRoute';

// Mock empty pages for routing structure
const Settings = () => <div className="p-4 bg-white rounded-lg shadow-sm"><h2 className="text-xl font-bold text-slate-800">Settings</h2></div>;

function App() {
  return (
    <>
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<DashboardOverview />} />
        <Route path="sdgs" element={<Dashboard categoryFilter="SDGs" />} />
        <Route path="healthkpi" element={<DashboardHealth />} />
        <Route path="group/:groupId" element={<KPIGroup />} />
        <Route path="admin/unauthorized" element={<UnauthorizedPanel />} />

        <Route element={<ProtectedAdminRoute />}>
          <Route path="entry" element={<DataEntry />} />
          <Route path="entry-health" element={<DataEntryHealth />} />
          <Route path="manage/sdgs" element={<ManageSDGs />} />
          <Route path="manage/health" element={<ManageHealth />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Route>
    </Routes>
    <Analytics />
    </>
  );
}

export default App;
