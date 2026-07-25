import React from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';
import ScrollToTop from './components/ScrollToTop';
import { SiteHeader, SiteFooter } from './components/SiteChrome';
import { HeroSection, StatsSection, FeaturesSection, CategorySection, StepsSection, UniversitiesSection, FAQSection } from './components/PageSections';
import Browse from './pages/Browse';
import ProductPage from './pages/ProductPage';
import LoginPage from './pages/Login';
import AuthCallback from './pages/AuthCallback';
import ResetPasswordPage from './pages/ResetPassword';
import CartPage from './pages/Cart';
import CheckoutPage from './pages/Checkout';
import BuyerDash from './pages/BuyerDash';
import SellerDash from './pages/SellerDash';
import AdminDash from './pages/AdminDash';
import { UniversitiesPage, VerifyPage, ContactPage, SellPage, LegalPage } from './pages/Static';
import { useAuth } from './lib/auth';

function Home() {
  return (<><HeroSection /><StatsSection /><FeaturesSection /><CategorySection /><StepsSection /><UniversitiesSection /><FAQSection /></>);
}

function Protected({ roles, children }) {
  const { user, ready } = useAuth();
  if (!ready) return <div className="container-shell py-20 text-center text-slate-500">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

function App() {
  return (
    <div className="min-h-screen bg-white">
      <ScrollToTop />
      <SiteHeader />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/browse" element={<Browse />} />
          <Route path="/book/:id" element={<ProductPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/universities" element={<UniversitiesPage />} />
          <Route path="/verify" element={<VerifyPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/sell" element={<SellPage />} />
          <Route path="/about" element={<LegalPage pageKey="about" />} />
          <Route path="/privacy" element={<LegalPage pageKey="privacy" />} />
          <Route path="/terms" element={<LegalPage pageKey="terms" />} />
          <Route path="/refund" element={<LegalPage pageKey="refund" />} />
          <Route path="/shipping" element={<LegalPage pageKey="shipping" />} />
          <Route path="/cart" element={<Protected><CartPage /></Protected>} />
          <Route path="/checkout" element={<Protected><CheckoutPage /></Protected>} />
          <Route path="/buyer" element={<Protected roles={['BUYER','ADMIN']}><BuyerDash /></Protected>} />
          <Route path="/seller" element={<Protected roles={['SELLER','ADMIN']}><SellerDash /></Protected>} />
          <Route path="/admin" element={<Protected roles={['ADMIN']}><AdminDash /></Protected>} />
        </Routes>
      </main>
      <SiteFooter />
    </div>
  );
}

export default App;
