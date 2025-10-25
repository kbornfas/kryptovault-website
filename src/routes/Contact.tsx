import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Contact: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });
  const navigate = useNavigate();

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate('/');
  };

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
        <h1 className="text-4xl font-bold mb-6">Contact Us</h1>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <div className="rounded-lg bg-indigo-900/30 p-6 shadow-lg">
            <h2 className="text-2xl font-semibold mb-4">Get in Touch</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="mb-1 block text-sm font-medium">
                  Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full rounded-lg bg-indigo-900/50 px-3 py-2 outline-none focus:ring-2 focus:ring-purple-400"
                  required
                />
              </div>
              <div>
                <label htmlFor="email" className="mb-1 block text-sm font-medium">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full rounded-lg bg-indigo-900/50 px-3 py-2 outline-none focus:ring-2 focus:ring-purple-400"
                  required
                />
              </div>
              <div>
                <label htmlFor="message" className="mb-1 block text-sm font-medium">
                  Message
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  rows={4}
                  className="w-full rounded-lg bg-indigo-900/50 px-3 py-2 outline-none focus:ring-2 focus:ring-purple-400"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full rounded-lg bg-purple-600 px-4 py-2 transition-colors hover:bg-purple-700"
              >
                Send Message
              </button>
            </form>
          </div>
          <div className="rounded-lg bg-indigo-900/30 p-6 shadow-lg">
            <h2 className="text-2xl font-semibold mb-4">Contact Information</h2>
            <div className="space-y-4">
              <div>
                <h3 className="mb-1 text-lg font-medium">Email</h3>
                <p className="text-purple-400">support@kryptovault.com</p>
              </div>
              <div>
                <h3 className="mb-1 text-lg font-medium">Phone</h3>
                <p className="text-purple-400">+1 (555) 123-4567</p>
              </div>
              <div>
                <h3 className="mb-1 text-lg font-medium">Address</h3>
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
    </section>
  );
};

export default Contact;