import React, { useState } from 'react';
import BgImage from '../assets/subsciptionBg.jpg';

function Subscription() {
  // State to control modal visibility
  const [isModalOpen, setIsModalOpen] = useState(false);
  // State to store form data
  const [formData, setFormData] = useState({
    username: '',
    mobileNumber: '',
  });

  // Handle opening the modal
  const openModal = () => {
    setIsModalOpen(true);
  };

  // Handle closing the modal
  const closeModal = () => {
    setIsModalOpen(false);
    // Reset form data when closing
    setFormData({ username: '', mobileNumber: '' });
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    // Log the form data (you can replace this with an API call or other logic)
    console.log('Form submitted:', formData);
    // Close the modal after submission
    closeModal();
  };

  return (
    <div className="w-full">
      {/* Hero Section */}
      <section
        className="relative bg-cover bg-center h-96 flex items-center justify-center text-center text-white"
        style={{
          backgroundImage: `url(${BgImage})`,
        }}
      >
        <div className="absolute inset-0 bg-black opacity-30"></div> {/* Overlay for better text readability */}
        <div className="relative z-10">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Subscribe & Save 10% On Every Order
          </h1>
          <p className="text-lg md:text-xl mb-6">
            Join our exclusive membership program for premium dining benefits
          </p>
          <button
            onClick={openModal}
            className="bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-6 rounded-full transition duration-300"
          >
            Start Saving Today
          </button>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-gray-800 text-center mb-12">
            Why Choose Our Subscription?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Card 1 */}
            <div className="bg-white p-6 rounded-lg shadow-lg text-center">
              <div className="text-4xl text-orange-500 mb-4">%</div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                10% OFF Every Order
              </h3>
              <p className="text-gray-600">
                Save on all your favorite dishes, every time you order
              </p>
            </div>

            {/* Card 2 */}
            <div className="bg-white p-6 rounded-lg shadow-lg text-center">
              <div className="text-4xl text-orange-500 mb-4">🚀</div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                Priority Service
              </h3>
              <p className="text-gray-600">
                Skip the queue with exclusive member service
              </p>
            </div>

            {/* Card 3 */}
            <div className="bg-white p-6 rounded-lg shadow-lg text-center">
              <div className="text-4xl text-orange-500 mb-4">🎁</div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                Exclusive Offers
              </h3>
              <p className="text-gray-600">
                Access seasonal member-only deals and special promotions
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Choose Your Plan Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-gray-800 text-center mb-12">
            Choose Your Plan
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Monthly Plan */}
            <div className="bg-white p-8 rounded-lg shadow-lg border border-gray-200">
              <h3 className="text-2xl font-semibold text-gray-800 mb-4">
                Monthly
              </h3>
              <p className="text-3xl font-bold text-gray-800 mb-6">
                ₹19.99 <span className="text-lg font-normal text-gray-600">/month</span>
              </p>
              <ul className="space-y-3 mb-6">
                <li className="flex items-center">
                  <span className="text-orange-500 mr-2">✔</span> 10% off all orders
                </li>
                <li className="flex items-center">
                  <span className="text-orange-500 mr-2">✔</span> Priority service
                </li>
                <li className="flex items-center">
                  <span className="text-orange-500 mr-2">✔</span> Monthly special offers
                </li>
                <li className="flex items-center">
                  <span className="text-orange-500 mr-2">✔</span> No commitment
                </li>
              </ul>
              <button
                onClick={openModal}
                className="w-full bg-transparent border border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white font-semibold py-3 rounded-full transition duration-300"
              >
                Subscribe Now
              </button>
            </div>

            {/* Annual Plan */}
            <div className="bg-white p-8 rounded-lg shadow-lg border-2 border-orange-500 relative">
              <span className="absolute top-0 right-4 transform -translate-y-1/2 bg-orange-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                Most Popular
              </span>
              <h3 className="text-2xl font-semibold text-gray-800 mb-4">
                Annual
              </h3>
              <p className="text-3xl font-bold text-gray-800 mb-6">
                ₹199.99 <span className="text-lg font-normal text-gray-600">/year</span>
              </p>
              <ul className="space-y-3 mb-6">
                <li className="flex items-center">
                  <span className="text-orange-500 mr-2">✔</span> 10% off all orders
                </li>
                <li className="flex items-center">
                  <span className="text-orange-500 mr-2">✔</span> Priority service
                </li>
                <li className="flex items-center">
                  <span className="text-orange-500 mr-2">✔</span> Monthly special offers
                </li>
                <li className="flex items-center">
                  <span className="text-orange-500 mr-2">✔</span> Two free meals
                </li>
                <li className="flex items-center">
                  <span className="text-orange-500 mr-2">✔</span> Save 16%
                </li>
              </ul>
              <button
                onClick={openModal}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-full transition duration-300"
              >
                Subscribe Now
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* What Our Members Say Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-gray-800 text-center mb-12">
            What Our Members Say
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Testimonial 1 */}
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <div className="flex items-center mb-4">
                <img
                  src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&q=80"
                  alt="Sarah Johnson"
                  className="w-12 h-12 rounded-full mr-4"
                />
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Sanjay</h3>
                  <div className="text-yellow-400">★★★★★</div>
                </div>
              </div>
              <p className="text-gray-600">
                The subscription has paid for itself! I love getting priority service and the exclusive deals are amazing.
              </p>
            </div>

            {/* Testimonial 2 */}
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <div className="flex items-center mb-4">
                <img
                  src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&q=80"
                  alt="Michael Chen"
                  className="w-12 h-12 rounded-full mr-4"
                />
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Akash</h3>
                  <div className="text-yellow-400">★★★★★</div>
                </div>
              </div>
              <p className="text-gray-600">
                Best decision ever! The 10% discount on every order adds up to significant savings over time.
              </p>
            </div>

            {/* Testimonial 3 */}
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <div className="flex items-center mb-4">
                <img
                  src="https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&q=80"
                  alt="Emily Davis"
                  className="w-12 h-12 rounded-full mr-4"
                />
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Eshwar</h3>
                  <div className="text-yellow-400">★★★★★</div>
                </div>
              </div>
              <p className="text-gray-600">
                The member benefits are fantastic. I especially love the seasonal offers and priority service.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center">
          <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
              Subscribe to Your Plan
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label
                  htmlFor="username"
                  className="block text-gray-700 font-semibold mb-2"
                >
                  Username
                </label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Enter your username"
                  required
                />
              </div>
              <div className="mb-6">
                <label
                  htmlFor="mobileNumber"
                  className="block text-gray-700 font-semibold mb-2"
                >
                  Mobile Number
                </label>
                <input
                  type="tel"
                  id="mobileNumber"
                  name="mobileNumber"
                  value={formData.mobileNumber}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Enter your mobile number"
                  required
                />
              </div>
              <div className="flex justify-between">
                <button
                  type="submit"
                  className="bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2 px-6 rounded-full transition duration-300"
                >
                  Submit
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 px-6 rounded-full transition duration-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Subscription;