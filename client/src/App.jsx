import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, Outlet, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import Footer from "./components/Footer.jsx";
import CookieConsent from "./components/CookieConsent.jsx";
import Home from "./pages/Home.jsx";
import Community from "./pages/Community.jsx";
import HowItWorks from "./pages/HowItWorks.jsx";
import OurImpact from "./pages/OurImpact.jsx";
import AboutUs from "./pages/AboutUs.jsx";
import TermsOfUse from "./pages/TermsOfUse.jsx";
import PrivacyPolicy from "./pages/PrivacyPolicy.jsx";
import RaiseConcern from "./pages/RaiseConcern.jsx";
import CookiePolicy from "./pages/CookiePolicy.jsx";
import Auth from "./pages/Auth.jsx";
import Account from "./pages/Account.jsx";
import ExploreMasjids from "./pages/ExploreMasjids.jsx";
import MasjidProfile from "./pages/MasjidProfile.jsx";
import MyMasjids from "./pages/masjid/MyMasjids.jsx";
import MasjidWizard from "./pages/masjid/MasjidWizard.jsx";
import MyCampaigns from "./pages/campaign/MyCampaigns.jsx";
import CampaignWizard from "./pages/campaign/CampaignWizard.jsx";
import CampaignProfile from "./pages/CampaignProfile.jsx";
import RequireUserAuth from "./components/RequireUserAuth.jsx";
import AdminApp from "./admin/AdminApp.jsx";

function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      const el = document.getElementById(hash.slice(1));
      if (el) {
        el.scrollIntoView({ behavior: "instant", block: "start" });
        return;
      }
    }
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname, hash]);
  return null;
}

function MarketingLayout() {
  return (
    <>
      <Navbar />
      <Outlet />
      <Footer />
      <CookieConsent />
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route element={<MarketingLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/community" element={<Community />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/our-impact" element={<OurImpact />} />
          <Route path="/about" element={<AboutUs />} />
          <Route path="/terms" element={<TermsOfUse />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/raise-a-concern" element={<RaiseConcern />} />
          <Route path="/cookie-policy" element={<CookiePolicy />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/explore-masjids" element={<ExploreMasjids />} />
          <Route path="/masjid/:id" element={<MasjidProfile />} />
          <Route path="/campaign/:slug" element={<CampaignProfile />} />
          <Route
            path="/account"
            element={
              <RequireUserAuth>
                <Account />
              </RequireUserAuth>
            }
          />
          <Route
            path="/account/masjids"
            element={
              <RequireUserAuth>
                <MyMasjids />
              </RequireUserAuth>
            }
          />
          <Route
            path="/account/masjids/new"
            element={
              <RequireUserAuth>
                <MasjidWizard />
              </RequireUserAuth>
            }
          />
          <Route
            path="/account/masjids/:id"
            element={
              <RequireUserAuth>
                <MasjidWizard />
              </RequireUserAuth>
            }
          />
          <Route
            path="/account/campaigns"
            element={
              <RequireUserAuth>
                <MyCampaigns />
              </RequireUserAuth>
            }
          />
          <Route
            path="/account/campaigns/new"
            element={
              <RequireUserAuth>
                <CampaignWizard />
              </RequireUserAuth>
            }
          />
          <Route
            path="/account/campaigns/:id"
            element={
              <RequireUserAuth>
                <CampaignWizard />
              </RequireUserAuth>
            }
          />
        </Route>
        <Route path="/admin/*" element={<AdminApp />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
