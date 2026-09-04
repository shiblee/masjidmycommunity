import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, Outlet, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import Footer from "./components/Footer.jsx";
import CookieConsent from "./components/CookieConsent.jsx";
import Community from "./pages/Community.jsx";
import HowItWorks from "./pages/HowItWorks.jsx";
import OurImpact from "./pages/OurImpact.jsx";
import AboutUs from "./pages/AboutUs.jsx";
import LegalPage from "./pages/LegalPage.jsx";
import RaiseConcern from "./pages/RaiseConcern.jsx";
import Contact from "./pages/Contact.jsx";
import Faq from "./pages/Faq.jsx";
import Testimonials from "./pages/Testimonials.jsx";
import SuccessStories from "./pages/SuccessStories.jsx";
import SuccessStoryDetail from "./pages/SuccessStoryDetail.jsx";
import ExploreCampaigns from "./pages/ExploreCampaigns.jsx";
import VerifiedMasjid from "./pages/VerifiedMasjid.jsx";
import Sitemap from "./pages/Sitemap.jsx";
import Auth from "./pages/Auth.jsx";
import Profile from "./pages/Profile.jsx";
import AccountRedirect from "./components/AccountRedirect.jsx";
import ExploreMasjids from "./pages/ExploreMasjids.jsx";
import MasjidProfile from "./pages/MasjidProfile.jsx";
import MyMasjids from "./pages/masjid/MyMasjids.jsx";
import MyCampaigns from "./pages/campaign/MyCampaigns.jsx";
import CampaignProfile from "./pages/CampaignProfile.jsx";
import RequireUserAuth from "./components/RequireUserAuth.jsx";
import AdminApp from "./admin/AdminApp.jsx";
import { LanguageProvider } from "./i18n/LanguageContext.jsx";

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
    <LanguageProvider>
      <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route element={<MarketingLayout />}>
          <Route path="/" element={<Auth defaultIntent="campaign" />} />
          <Route path="/my-community" element={<Community />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/our-impact" element={<OurImpact />} />
          <Route path="/about" element={<AboutUs />} />
          <Route path="/terms" element={<LegalPage slug="terms-of-use" />} />
          <Route path="/privacy" element={<LegalPage slug="privacy-policy" />} />
          <Route path="/raise-a-concern" element={<RaiseConcern />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/faq" element={<Faq />} />
          <Route path="/testimonials" element={<Testimonials />} />
          <Route path="/success-stories" element={<SuccessStories />} />
          <Route path="/success-stories/:slug" element={<SuccessStoryDetail />} />
          <Route path="/explore-campaigns" element={<ExploreCampaigns />} />
          <Route path="/verified-masjid" element={<VerifiedMasjid />} />
          <Route path="/sitemap" element={<Sitemap />} />
          <Route path="/cookie-policy" element={<LegalPage slug="cookie-policy" />} />
          <Route path="/pages/:slug" element={<LegalPage />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/explore-masjids" element={<ExploreMasjids />} />
          <Route path="/masjid/:id" element={<MasjidProfile />} />
          <Route path="/campaign/:slug" element={<CampaignProfile />} />
          <Route path="/profile/:username" element={<Profile />} />
          <Route path="/profile/:username/:section" element={<Profile />} />
          <Route
            path="/account"
            element={
              <RequireUserAuth>
                <AccountRedirect />
              </RequireUserAuth>
            }
          />
          <Route
            path="/account/my-masjids"
            element={
              <RequireUserAuth>
                <MyMasjids />
              </RequireUserAuth>
            }
          />
          <Route path="/account/my-masjids/new" element={<Community />} />
          <Route path="/account/my-masjids/:id" element={<Community />} />
          <Route
            path="/account/my-campaigns"
            element={
              <RequireUserAuth>
                <MyCampaigns />
              </RequireUserAuth>
            }
          />
          <Route path="/account/my-campaigns/new" element={<Community />} />
          <Route path="/account/my-campaigns/:id" element={<Community />} />
        </Route>
        <Route path="/admin/*" element={<AdminApp />} />
      </Routes>
    </BrowserRouter>
    </LanguageProvider>
  );
}

export default App;
