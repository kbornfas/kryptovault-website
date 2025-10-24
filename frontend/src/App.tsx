import React from "react";
import { Navigate, Outlet, Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import Footer from "./components/Footer";
import Navbar from "./components/Navbar";
import { AuthProvider } from "./context/AuthContext";
import About from "./routes/About";
import Contact from "./routes/Contact";
import CryptoInvestmentPlatform from "./routes/Home";
import Login from "./routes/Login";
import SignUp from "./routes/SignUp";

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
        <Routes>
          <Route path="/" element={<CryptoInvestmentPlatform />} />
          <Route element={<DefaultLayout />}>
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<SignUp />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
};

export default App;
