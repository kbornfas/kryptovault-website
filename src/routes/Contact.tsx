import React, { useState } from 'react';

const Contact: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission here
    console.log('Form submitted:', formData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-6">Contact Us</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-indigo-900/30 p-6 rounded-lg shadow-lg">
          <h2 className="text-2xl font-semibold mb-4">Get in Touch</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-1">
                Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-indigo-900/50 rounded-lg focus:ring-2 focus:ring-purple-400 outline-none"
                required
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1">
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-indigo-900/50 rounded-lg focus:ring-2 focus:ring-purple-400 outline-none"
                required
              />
            </div>
            <div>
              <label htmlFor="message" className="block text-sm font-medium mb-1">
                Message
              </label>
              <textarea
                id="message"
                name="message"
                value={formData.message}
                onChange={handleChange}
                rows={4}
                className="w-full px-3 py-2 bg-indigo-900/50 rounded-lg focus:ring-2 focus:ring-purple-400 outline-none"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-purple-600 hover:bg-purple-700 py-2 px-4 rounded-lg transition-colors"
            >
              Send Message
            </button>
          </form>
        </div>
        <div className="bg-indigo-900/30 p-6 rounded-lg shadow-lg">
          <h2 className="text-2xl font-semibold mb-4">Contact Information</h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium mb-1">Email</h3>
              <p className="text-purple-400">support@kryptovault.com</p>
            </div>
            <div>
              <h3 className="text-lg font-medium mb-1">Phone</h3>
              <p className="text-purple-400">+1 (555) 123-4567</p>
            </div>
            <div>
              <h3 className="text-lg font-medium mb-1">Address</h3>
              <p className="text-purple-400">
                123 Crypto Street<br />
                Blockchain City, BC 12345<br />
                United States
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;