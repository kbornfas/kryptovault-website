import Footer from "../src/components/Footer";
import Hero from "../src/components/Hero";
import InvestmentPlans from "../src/components/InvestmentPlans";
import Navbar from "../src/components/Navbar";
function App() {
  return (
    <div className="bg-gradient-to-b from-indigo-900 via-purple-800 to-black text-white min-h-screen">
      <Navbar />
      <Hero />
      <InvestmentPlans />
      <Footer />
    </div>
  );
}

export default App;
