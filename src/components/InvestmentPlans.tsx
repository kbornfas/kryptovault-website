const plans = [
  { name: "Starter", rate: "10%", desc: "Perfect for beginners", color: "bg-indigo-700" },
  { name: "Gold", rate: "20%", desc: "For experienced investors", color: "bg-purple-700" },
  { name: "Diamond", rate: "30%", desc: "Maximize your ROI", color: "bg-pink-700" }
];

export default function InvestmentPlans() {
  return (
    <section className="grid md:grid-cols-3 gap-6 px-8 py-12 bg-gradient-to-b from-black to-indigo-950">
      {plans.map((plan) => (
        <div key={plan.name} className={`p-6 rounded-2xl shadow-lg text-center ${plan.color}`}>
          <h2 className="text-3xl font-bold mb-2 text-white">{plan.name}</h2>
          <p className="text-xl mb-4 text-gray-100">{plan.rate} Monthly Return</p>
          <p className="text-gray-300 mb-4">{plan.desc}</p>
          <button className="bg-white text-black px-4 py-2 rounded-lg hover:bg-gray-200">
            Invest Now
          </button>
        </div>
      ))}
    </section>
  );
}
