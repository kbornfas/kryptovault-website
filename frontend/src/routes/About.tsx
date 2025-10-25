import React from 'react';
import { useNavigate } from 'react-router-dom';

const About: React.FC = () => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate('/');
  };

  return (
    <section className="px-4 py-10 sm:py-16">
      <div className="mx-auto max-w-5xl">
        <button
          type="button"
          onClick={handleBack}
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-sm font-medium text-indigo-100 transition hover:border-white/40 hover:text-white"
        >
          <span className="text-lg font-semibold">&lt;-</span>
          <span>Back</span>
        </button>
        <h1 className="text-4xl font-bold mb-6">About KryptoVault</h1>
        <div className="rounded-lg bg-indigo-900/30 p-6 shadow-lg">
          <p className="text-lg mb-4">
            KryptoVault is your trusted partner in cryptocurrency investments. We provide secure, transparent, and profitable investment opportunities in the digital asset space.
          </p>
          <p className="text-lg mb-4">
            Our platform combines cutting-edge technology with expert market analysis to deliver optimal returns for our investors.
          </p>
          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="rounded-lg bg-indigo-900/50 p-4">
              <h3 className="text-xl font-semibold mb-2">Security First</h3>
              <p>Your investments are protected by state-of-the-art security measures.</p>
            </div>
            <div className="rounded-lg bg-indigo-900/50 p-4">
              <h3 className="text-xl font-semibold mb-2">Expert Team</h3>
              <p>Our team consists of experienced crypto market analysts and traders.</p>
            </div>
            <div className="rounded-lg bg-indigo-900/50 p-4">
              <h3 className="text-xl font-semibold mb-2">24/7 Support</h3>
              <p>Round-the-clock customer support to assist you with your investments.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;