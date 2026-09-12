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
import Jobs from "./pages/Jobs.jsx";
import JobReview from "./pages/JobReview.jsx";
import FundUtilization from "./pages/FundUtilization.jsx";
import ReportsAnalytics from "./pages/ReportsAnalytics.jsx";
import GreenTickApplications from "./pages/GreenTickApplications.jsx";
import RegisteredUsers from "./pages/RegisteredUsers.jsx";
import RegisteredUserDetail from "./pages/RegisteredUserDetail.jsx";
import UserActivityHistory from "./pages/UserActivityHistory.jsx";
import Visitors from "./pages/visitors/Visitors.jsx";
import SyntheticUsers from "./pages/SyntheticUsers.jsx";
import VisitorSessionDetail from "./pages/visitors/VisitorSessionDetail.jsx";
import Notifications from "./pages/Notifications.jsx";
import EmailTemplateEditor from "./pages/EmailTemplateEditor.jsx";
import Settings from "./pages/Settings.jsx";
import Meta from "./pages/Meta.jsx";
import Translations from "./pages/Translations.jsx";
import Pages from "./pages/Pages.jsx";
import Concerns from "./pages/Concerns.jsx";
import ConcernReview from "./pages/ConcernReview.jsx";
import ContactInquiries from "./pages/ContactInquiries.jsx";
import ContactInquiryReview from "./pages/ContactInquiryReview.jsx";
import FaqManagement from "./pages/FaqManagement.jsx";
import TestimonialsAndStories from "./pages/TestimonialsAndStories.jsx";
import Moderation from "./pages/Moderation.jsx";
import ModerationDetail from "./pages/ModerationDetail.jsx";
import PendingReviews from "./pages/PendingReviews.jsx";
import MasjidCorrections from "./pages/MasjidCorrections.jsx";
import MasjidCorrectionDetail from "./pages/MasjidCorrectionDetail.jsx";
import StaffList from "./pages/StaffList.jsx";
import StaffForm from "./pages/StaffForm.jsx";
import StaffDetail from "./pages/StaffDetail.jsx";
import Developer from "./pages/Developer.jsx";
import SystemHealth from "./pages/SystemHealth.jsx";

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
        <Route path="masjids/:id/:tab" element={<MasjidReview />} />
        <Route path="community-wall" element={<CommunityWall />} />
        <Route path="campaigns" element={<Campaigns />} />
        <Route path="campaigns/:id" element={<CampaignReview />} />
        <Route path="campaigns/:id/:tab" element={<CampaignReview />} />
        <Route path="jobs" element={<Jobs />} />
        <Route path="jobs/:id" element={<JobReview />} />
        <Route path="verification" element={<GreenTickApplications />} />
        <Route path="fund-utilization" element={<FundUtilization />} />
        <Route path="reports" element={<ReportsAnalytics />} />
        <Route path="registered-users" element={<RegisteredUsers />} />
        <Route path="registered-users/:id" element={<RegisteredUserDetail />} />
        <Route path="registered-users/:id/activity" element={<UserActivityHistory />} />
        <Route path="visitors" element={<Visitors />} />
        <Route path="synthetic-users" element={<SyntheticUsers />} />
        <Route path="visitors/:sessionKey" element={<VisitorSessionDetail />} />
        <Route path="registered-users/:id/:tab" element={<RegisteredUserDetail />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="notifications/templates/:key" element={<EmailTemplateEditor />} />
        <Route path="meta" element={<Navigate to="/admin/meta/masjid-category" replace />} />
        <Route path="meta/:entityKey" element={<Meta />} />
        <Route path="translations" element={<Translations />} />
        <Route path="pages" element={<Pages />} />
        <Route path="pages/:pageId" element={<Pages />} />
        <Route path="concerns" element={<Concerns />} />
        <Route path="concerns/:id" element={<ConcernReview />} />
        <Route path="contact-inquiries" element={<ContactInquiries />} />
        <Route path="contact-inquiries/:id" element={<ContactInquiryReview />} />
        <Route path="faq" element={<FaqManagement />} />
        <Route path="testimonials" element={<TestimonialsAndStories />} />
        <Route path="success-stories" element={<TestimonialsAndStories />} />
        <Route path="moderation" element={<Moderation />} />
        <Route path="moderation/:targetType/:targetId" element={<ModerationDetail />} />
        <Route path="pending-reviews" element={<PendingReviews />} />
        <Route path="masjid-corrections" element={<MasjidCorrections />} />
        <Route path="masjid-corrections/:id" element={<MasjidCorrectionDetail />} />
        <Route path="staff" element={<StaffList />} />
        <Route path="staff/new" element={<StaffForm />} />
        <Route path="staff/:id/edit" element={<StaffForm />} />
        <Route path="staff/:id" element={<StaffDetail />} />
        <Route path="staff/:id/:tab" element={<StaffDetail />} />
        <Route path="settings" element={<Navigate to="/admin/settings/profile" replace />} />
        <Route path="settings/:sectionKey" element={<Settings />} />
        <Route path="developer" element={<Developer />} />
        <Route path="developer/:moduleKey" element={<Developer />} />
        <Route path="system-health" element={<SystemHealth />} />
      </Route>

      <Route index element={<Navigate to="login" replace />} />
      <Route path="*" element={<Navigate to="login" replace />} />
    </Routes>
  );
}

export default AdminApp;
