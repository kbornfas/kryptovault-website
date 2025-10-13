import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const plans = [
  { name: "Starter", rate: "10%", desc: "Perfect for beginners", color: "bg-indigo-700", minAmount: "500" },
  { name: "Gold", rate: "20%", desc: "For experienced investors", color: "bg-purple-700", minAmount: "2,500" },
  { name: "Diamond", rate: "30%", desc: "Maximize your ROI", color: "bg-pink-700", minAmount: "10,000" }
];

export default function InvestmentPlans() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handlePlanSelect = (planName: string) => {
    if (!user) {
      localStorage.setItem('selectedPlan', planName);
      navigate('/signup');
    } else {
      // TODO: Handle investment process for logged-in users
      console.log(`Selected plan: ${planName}`);
    }
  };

  return (
    <section className="grid md:grid-cols-3 gap-6 px-8 py-12 bg-gradient-to-b from-black to-indigo-950">
      {plans.map((plan) => (
        <motion.div
          key={plan.name}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          whileHover={{ scale: 1.02 }}
          className={`p-6 rounded-2xl shadow-lg text-center ${plan.color} cursor-pointer`}
          onClick={() => handlePlanSelect(plan.name)}
        >
          <h2 className="text-3xl font-bold mb-2 text-white">{plan.name}</h2>
          <p className="text-xl mb-2 text-gray-100">{plan.rate} Monthly Return</p>
          <p className="text-gray-300 mb-2">{plan.desc}</p>
          <p className="text-sm text-gray-300 mb-4">Min. Investment: ${plan.minAmount}</p>
          <button className="bg-white text-black px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors">
            {user ? 'Invest Now' : 'Get Started'}
          </button>
        </motion.div>
      ))}
    </section>
  );
}
