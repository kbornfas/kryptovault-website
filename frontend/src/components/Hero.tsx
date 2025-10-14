import { motion } from "framer-motion";
import { useRef } from "react";

export default function Hero() {
  const plansRef = useRef<HTMLDivElement>(null);

  const scrollToPlans = () => {
    plansRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="text-center py-24 bg-gradient-to-r from-indigo-800 to-purple-700">
      <motion.h1
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
        className="text-5xl font-extrabold mb-6 text-white"
      >
        Grow Your Wealth with KryptoVault 💎
      </motion.h1>

      <p className="text-lg text-gray-200 max-w-xl mx-auto">
        The modern way to invest in crypto securely — start small, grow big, and
        let your investments work for you.
      </p>

      <button 
        onClick={scrollToPlans}
        className="mt-8 px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-xl text-white font-semibold transition-colors"
      >
        Start Investing
      </button>
      <div ref={plansRef} />
    </section>
  );
}
