import React from "react";
import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import Footer from "./components/Footer";
import Hero from "./components/Hero";
import InvestmentPlans from "./components/InvestmentPlans";
import Navbar from "./components/Navbar";
import { AuthProvider } from "./context/AuthContext";
import About from "./routes/About";
import Contact from "./routes/Contact";
import Login from "./routes/Login";
import SignUp from "./routes/SignUp";

const App: React.FC = () => {
  const basename = import.meta.env.BASE_URL || "/";

  return (
    <Router basename={basename}>
      <AuthProvider>
        <div className="bg-gradient-to-b from-indigo-900 via-purple-800 to-black text-white min-h-screen">
          <Navbar />
          <Routes>
            <Route
              path="/"
              element={(
                <>
                  <Hero />
                  <InvestmentPlans />
                </>
              )}
            />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <Footer />
        </div>
      </AuthProvider>
    </Router>
  );
};

export default App;
