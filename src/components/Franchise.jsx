import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom'; // Added import
import BgImage from '../assets/franchiseBgm.jpg';
import ImageGreen from '../assets/background2-pink.webp';
import { FaBars, FaTimes } from "react-icons/fa";
import Logo from '../assets/Logotfc.png'; // Add your logo import

function Franchise() {
    const [menuOpen, setMenuOpen] = useState(false);
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    const handleMenuItemClick = () => {
        setMenuOpen(false); // Close the menu when a menu item is clicked
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-100 to-white text-gray-900 font-sans">
            {/* Navigation */}
            <nav className="absolute top-0 left-0 w-full px-6 md:px-10 py-5 flex justify-between items-center text-white z-20">
                <button
                    className="text-2xl bg-gray-800 p-3 rounded-full hover:bg-gray-700 md:hidden"
                    onClick={() => setMenuOpen(!menuOpen)}
                >
                    {menuOpen ? <FaTimes /> : <FaBars />}
                </button>

                <ul className="hidden md:flex space-x-6">
                    <li className="cursor-pointer hover:text-orange-400"> <Link to="/">HOME</Link></li>
                    <li className="cursor-pointer hover:text-orange-400">
                        <Link to="/founder">FOUNDERS</Link>
                    </li>
                    {/* <li className="cursor-pointer text-orange-400">
                        <Link to="/franchise">FRANCHISE</Link>
                    </li> */}
                    <li className="cursor-pointer hover:text-orange-400"> <Link to="/branches">BRANCHES</Link></li>

                    {/* <li className="cursor-pointer hover:text-orange-400">CATERING</li> */}
                    <li
                        className="cursor-pointer hover:text-orange-400"
                    // onClick={handleScrollToFooter}
                    >
                        <Link to="/contactus" >CONTACT US</Link>
                    </li>
                </ul>

                <div className="flex flex-col items-center space-x-4">
                    <p className="text-xl md:text-2xl font-mono font-bold text-white" >TELUGU FOOD.CLUB</p>
                    <p className="text-xl md:text-xl font-mono font-bold text-white" >LMV FOODS</p>
                </div>

                {menuOpen && (
                    <ul className="absolute top-16 left-0 w-full bg-gray-800 text-white flex flex-col items-center space-y-4 py-4 md:hidden">
                        <li className="cursor-pointer hover:text-orange-400"> <Link to="/">HOME</Link></li>
                        <li className="cursor-pointer hover:text-orange-400">
                            <Link to="/founder">FOUNDERS</Link>
                        </li>
                        <li className="cursor-pointer hover:text-orange-400">MENU</li>
                        <li className="cursor-pointer text-orange-400">
                            <Link to="/franchise">FRANCHISE</Link>
                        </li>
                        <li className="cursor-pointer hover:text-orange-400"> <Link to="/branches">BRANCHES</Link></li>
                        {/* <li className="cursor-pointer hover:text-orange-400">CATERING</li> */}
                        <li
                            className="cursor-pointer hover:text-orange-400"
                            onClick={
                                // handleScrollToFooter
                                handleMenuItemClick()
                            }
                        >
                            <Link to="/contactus" >CONTACT US</Link>
                        </li>
                    </ul>
                )}
            </nav>

            {/* Rest of your component remains the same */}
            {/* Hero Section */}
            <div
                className="relative bg-cover bg-center h-[500px] flex items-center justify-center text-white"
                style={{ backgroundImage: `url(${BgImage})` }}
            >
                <div className="absolute inset-0 bg-black opacity-50"></div>
                <div className="relative z-10 text-center px-4">
                    <h1 className="text-4xl font-bold mb-4 animate-fade-in">Join Our Growing Restaurant Family</h1>
                    <p className="text-lg mb-6 max-w-2xl mx-auto animate-fade-in delay-200">
                        Partner with our proven franchise concept and build your success story.
                    </p>
                    <button className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-full text-lg font-semibold transition animate-bounce-in">
                        Become a Franchisee
                    </button>
                    <div className="flex justify-center gap-12 mt-8 text-sm animate-fade-in delay-400">
                        <div className="text-center">
                            <span className="text-3xl font-bold text-orange-400">200+</span>
                            <p>Locations</p>
                        </div>
                        <div className="text-center">
                            <span className="text-3xl font-bold text-orange-400">15+</span>
                            <p>Years Experience</p>
                        </div>
                        <div className="text-center">
                            <span className="text-3xl font-bold text-orange-400">95%</span>
                            <p>Success Rate</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Investment & Returns Section */}
            <div className="container mx-auto py-12 px-6">
                <h2 className="text-3xl font-bold text-center mb-8 text-gray-900 border-b-2 border-orange-400 pb-2 animate-slide-up">
                    Investment & Returns
                </h2>
                <div className="grid md:grid-cols-2 gap-8">
                    {/* Investment Details */}
                    <div className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition transform hover:-translate-y-2 animate-slide-right">
                        <div className="mb-4 flex justify-between border-b border-gray-200 pb-2">
                            <span className="text-gray-700">Initial Franchise Fee</span>
                            <span className="font-bold text-orange-500">₹5,00,000</span>
                        </div>
                        <div className="mb-4 flex justify-between border-b border-gray-200 pb-2">
                            <span className="text-gray-700">Total Investment</span>
                            <span className="font-bold text-orange-500">₹6,00,000 - ₹7,00,000</span>
                        </div>
                        <div className="mb-4 flex justify-between border-b border-gray-200 pb-2">
                            <span className="text-gray-700">Royalty Fee</span>
                            <span className="font-bold text-orange-500">5% of Gross Sales</span>
                        </div>
                        <div className="mb-6 flex justify-between border-b border-gray-200 pb-2">
                            <span className="text-gray-700">Marketing Fee</span>
                            <span className="font-bold text-orange-500">2% of Gross Sales</span>
                        </div>
                        <button className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-md font-semibold w-full animate-pulse-slow">
                            📄 Download Investment Brochure
                        </button>
                    </div>

                    {/* Expected Returns */}
                    <div className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition transform hover:-translate-y-2 animate-slide-left">
                        <h3 className="text-xl font-semibold mb-4 text-orange-500">Expected Returns</h3>
                        <ul className="list-disc pl-5 text-gray-700 space-y-2">
                            <li className="flex items-center gap-2">
                                <span className="text-orange-500">✅</span> Average annual revenue: ₹8,00,000 - ₹12,00,000
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="text-orange-500">✅</span> Typical break-even period: 18-24 months
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="text-orange-500">✅</span> Net profit margin: 15-20%
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="text-orange-500">✅</span> ROI potential: 25-35% annually
                            </li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Comprehensive Support System Section */}
            <div
                className="container mx-auto py-12 px-6 text-gray-900 relative bg-cover bg-center"
                style={{
                    backgroundImage: `url(${ImageGreen})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    backgroundRepeat: "no-repeat",
                }}
            >
                {/* Overlay for Better Readability */}
                <div className="absolute inset-0 bg-teal-900/20"></div>

                <div className="relative z-10">
                    <h2 className="text-3xl font-bold text-center mb-8 text-white animate-slide-up">
                        Comprehensive Support System
                    </h2>
                    <div className="grid md:grid-cols-3 gap-6">
                        {[
                            { icon: "🎓", title: "Training Program", desc: "4-week comprehensive training for owners and staff" },
                            { icon: "📦", title: "Supply Chain", desc: "Access to reliable supplier network and inventory management" },
                            { icon: "🛠️", title: "Tech Integration", desc: "Modern POS system and digital ordering platform" },
                            { icon: "📊", title: "Financial Planning", desc: "Detailed financial modeling and planning assistance" },
                            { icon: "📍", title: "Location Selection", desc: "Expert assistance in site selection and analysis" },
                            { icon: "🛎️", title: "Ongoing Support", desc: "24/7 operational support and regular guidance" }
                        ].map((support, index) => (
                            <div
                                key={index}
                                className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition transform hover:-translate-y-2 flex flex-col items-center text-center animate-slide-up delay-[200ms]"
                                style={{ animationDelay: `${index * 200}ms` }}
                            >
                                <div className="text-4xl mb-4 text-orange-500">{support.icon}</div>
                                <h3 className="text-xl font-semibold mb-2 text-orange-500">{support.title}</h3>
                                <p className="text-gray-700">{support.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Franchise Models Section */}
            <div className="container mx-auto py-12 px-4">
                <h2 className="text-3xl font-bold text-center mb-10 text-gray-900 border-b-2 border-orange-400 pb-2 animate-slide-up">
                    Our Franchise Models
                </h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                        { icon: "🏠", title: "Standalone Restaurant", desc: "Full-service restaurant with complete dining experience" },
                        { icon: "☁️", title: "Cloud Kitchen", desc: "Delivery-focused kitchen with minimal front-end investment" },
                        { icon: "🛍️", title: "Kiosk Model", desc: "Compact format perfect for high-traffic locations" },
                        { icon: "🚚", title: "Food Truck", desc: "Mobile restaurant unit with flexible operations" }
                    ].map((model, index) => (
                        <div
                            key={index}
                            className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition transform hover:-translate-y-2 flex flex-col items-center text-center animate-slide-up delay-[200ms]"
                            style={{ animationDelay: `${index * 200}ms` }}
                        >
                            <div className="text-4xl mb-4 text-orange-500">{model.icon}</div>
                            <h3 className="text-xl font-semibold mb-2 text-orange-500">{model.title}</h3>
                            <p className="text-gray-700 mb-4">{model.desc}</p>
                            <a href="#" className="text-orange-500 hover:underline">
                                Learn More →
                            </a>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// Keyframe Animations (Add this in a separate CSS file or <style> tag if needed)
const styles = `
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes slideUp {
    from { transform: translateY(20px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
  @keyframes slideRight {
    from { transform: translateX(-20px); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  @keyframes slideLeft {
    from { transform: translateX(20px); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  @keyframes bounceIn {
    0% { transform: scale(0.8); opacity: 0; }
    50% { transform: scale(1.1); }
    100% { transform: scale(1); opacity: 1; }
  }
  @keyframes pulseSlow {
    0% { transform: scale(1); }
    50% { transform: scale(1.05); }
    100% { transform: scale(1); }
  }

  .animate-fade-in { animation: fadeIn 1s ease-out; }
  .animate-slide-up { animation: slideUp 1s ease-out; }
  .animate-slide-right { animation: slideRight 1s ease-out; }
  .animate-slide-left { animation: slideLeft 1s ease-out; }
  .animate-bounce-in { animation: bounceIn 1s ease-out; }
  .animate-pulse-slow { animation: pulseSlow 2s infinite ease-in-out; }
`;

<style jsx>{styles}</style>

export default Franchise;