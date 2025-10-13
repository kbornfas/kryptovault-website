import React from "react";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import InvestmentPlans from "./components/InvestmentPlans";
import Footer from "./components/Footer";

const App: React.FC = () => {
  return (
    <div className="bg-gradient-to-b from-indigo-900 via-purple-800 to-black text-white min-h-screen">
      <Navbar />
      <Hero />
      <InvestmentPlans />
      <Footer />
    </div>
  );
};

export default App;
