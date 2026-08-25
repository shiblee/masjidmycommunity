import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import "./admin.css";
import AdminLogin from "./pages/AdminLogin.jsx";
import AdminLayout from "./components/AdminLayout.jsx";
import RequireAuth from "./components/RequireAuth.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Masjids from "./pages/Masjids.jsx";
import MasjidReview from "./pages/MasjidReview.jsx";
import CommunityWall from "./pages/CommunityWall.jsx";
import Campaigns from "./pages/Campaigns.jsx";
import CampaignReview from "./pages/CampaignReview.jsx";
import Donations from "./pages/Donations.jsx";
import Donors from "./pages/Donors.jsx";
import Projects from "./pages/Projects.jsx";
import FundUtilization from "./pages/FundUtilization.jsx";
import Verification from "./pages/Verification.jsx";
import ReportsAnalytics from "./pages/ReportsAnalytics.jsx";
import Users from "./pages/Users.jsx";
import RegisteredUsers from "./pages/RegisteredUsers.jsx";
import ContentManagement from "./pages/ContentManagement.jsx";
import Notifications from "./pages/Notifications.jsx";
import EmailTemplateEditor from "./pages/EmailTemplateEditor.jsx";
import Settings from "./pages/Settings.jsx";

function AdminApp() {
  return (
    <Routes>
      <Route path="login" element={<AdminLogin />} />

      <Route
        element={
          <RequireAuth>
            <AdminLayout />
          </RequireAuth>
        }
      >
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="masjids" element={<Masjids />} />
        <Route path="masjids/:id" element={<MasjidReview />} />
        <Route path="community-wall" element={<CommunityWall />} />
        <Route path="campaigns" element={<Campaigns />} />
        <Route path="campaigns/:id" element={<CampaignReview />} />
        <Route path="donations" element={<Donations />} />
        <Route path="donors" element={<Donors />} />
        <Route path="projects" element={<Projects />} />
        <Route path="fund-utilization" element={<FundUtilization />} />
        <Route path="verification" element={<Verification />} />
        <Route path="reports" element={<ReportsAnalytics />} />
        <Route path="users" element={<Users />} />
        <Route path="registered-users" element={<RegisteredUsers />} />
        <Route path="content" element={<ContentManagement />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="notifications/templates/:key" element={<EmailTemplateEditor />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      <Route index element={<Navigate to="login" replace />} />
      <Route path="*" element={<Navigate to="login" replace />} />
    </Routes>
  );
}

export default AdminApp;
