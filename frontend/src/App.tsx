import React, { Suspense, lazy } from "react";
import { Navigate, Outlet, Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import Footer from "./components/Footer";
import Navbar from "./components/Navbar";
import { AuthProvider } from "./context/AuthContext";

const HomeRoute = lazy(() => import('./routes/Home'));
const AboutRoute = lazy(() => import('./routes/About'));
const ContactRoute = lazy(() => import('./routes/Contact'));
const LoginRoute = lazy(() => import('./routes/login'));
const SignUpRoute = lazy(() => import('./routes/SignUp'));
const AdminDashboard = lazy(() => import('./components/admin/AdminDashboard'));
const AdminRoute = lazy(() => import('./components/admin/AdminRoute'));
const TradeHistoryRoute = lazy(() => import('./routes/TradeHistory'));
const AutoTradingRoute = lazy(() => import('./routes/AutoTrading'));
const ResetPasswordRoute = lazy(() => import('./routes/ResetPassword'));

const DefaultLayout: React.FC = () => (
  <div className="bg-gradient-to-b from-indigo-900 via-purple-800 to-black text-white min-h-screen flex flex-col">
    <Navbar />
    <main className="flex-1">
      <Outlet />
    </main>
    <Footer />
  </div>
);

const App: React.FC = () => {
  const basename = import.meta.env.BASE_URL || "/";

  return (
    <Router basename={basename}>
      <AuthProvider>
        <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-black text-white">Loading...</div>}>
          <Routes>
            <Route path="/" element={<HomeRoute />} />
            <Route element={<DefaultLayout />}>
              <Route path="/about" element={<AboutRoute />} />
              <Route path="/contact" element={<ContactRoute />} />
              <Route path="/login" element={<LoginRoute />} />
              <Route path="/signup" element={<SignUpRoute />} />
              <Route path="/reset-password" element={<ResetPasswordRoute />} />
              <Route path="/trade-history" element={<TradeHistoryRoute />} />
              <Route path="/auto-trading" element={<AutoTradingRoute />} />
            </Route>
            <Route element={<AdminRoute />}>
              <Route path="/admin" element={<AdminDashboard />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </Router>
  );
};

export default App;
