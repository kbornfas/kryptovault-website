import React from 'react';

const About: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-6">About KryptoVault</h1>
      <div className="bg-indigo-900/30 p-6 rounded-lg shadow-lg">
        <p className="text-lg mb-4">
          KryptoVault is your trusted partner in cryptocurrency investments. We provide secure, transparent, and profitable investment opportunities in the digital asset space.
        </p>
        <p className="text-lg mb-4">
          Our platform combines cutting-edge technology with expert market analysis to deliver optimal returns for our investors.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <div className="bg-indigo-900/50 p-4 rounded-lg">
            <h3 className="text-xl font-semibold mb-2">Security First</h3>
            <p>Your investments are protected by state-of-the-art security measures.</p>
          </div>
          <div className="bg-indigo-900/50 p-4 rounded-lg">
            <h3 className="text-xl font-semibold mb-2">Expert Team</h3>
            <p>Our team consists of experienced crypto market analysts and traders.</p>
          </div>
          <div className="bg-indigo-900/50 p-4 rounded-lg">
            <h3 className="text-xl font-semibold mb-2">24/7 Support</h3>
            <p>Round-the-clock customer support to assist you with your investments.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;