import React, { useState, useRef } from "react";
import { useInView } from "react-intersection-observer"; // Intersection observer
import { FaBars, FaTimes } from "react-icons/fa"; // Mobile menu icons
import BgImage from "../assets/BannerS.jpg";
import Logo from "../assets/Logotfc1.png";
import Curry from "../assets/biryani/b1.jpg";
import Biryani from "../assets/biryani/b2.jpg";
import Starters from "../assets/home1.jpg";
import Background from "../assets/background2-pink.webp";
import { Link } from "react-router-dom";

function Home({ footerRef, menuRef }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { ref: heroRef, inView: heroInView } = useInView({ triggerOnce: true });

  const handleScrollToFooter = () => {
    console.log("okfooter");
    if (footerRef?.current) {
      footerRef.current.scrollIntoView({ behavior: "smooth" });
    }
    setMenuOpen(false); // Close the menu after clicking
  };

  const handleScrollToMenu = () => {
    console.log("okMennu");
    if (menuRef?.current) {
      menuRef.current.scrollIntoView({ behavior: "smooth" });
    }
    setMenuOpen(false); // Close the menu after clicking
  };

  const toggleMenu = (e) => {
    e.stopPropagation(); // Prevent event bubbling
    setMenuOpen((prev) => !prev); // Toggle menu state
  };

  const handleMenuItemClick = () => {
    setMenuOpen(false); // Close the menu when a menu item is clicked
  };

  const splitText = (text) => {
    return text.split("").map((letter, index) => (
      <span
        key={index}
        className={`inline-block ${heroInView ? "animate-fade-in" : "opacity-0"}`}
        style={{
          "--letter-index": index,
          margin: "0 2px",
        }}
      >
        {letter === " " ? "\u00A0" : letter}
      </span>
    ));
  };

  return (
    <div
      className="relative min-h-screen bg-cover bg-center"
      style={{ backgroundImage: `url(${BgImage})` }}
    >
      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-black opacity-50"></div>

      {/* Navbar */}
      <nav className="absolute top-0 left-0 w-full px-6 md:px-10 py-5 flex justify-between items-center text-white z-20">
        {/* Hamburger Menu Button for Mobile */}
        <button
          className="text-2xl bg-gray-800 p-3 rounded-full hover:bg-gray-700 md:hidden"
          onClick={toggleMenu}
        >
          {menuOpen ? <FaTimes /> : <FaBars />}
        </button>

        {/* Desktop Menu */}
        <ul className="z-10 hidden md:flex space-x-6">
          <li className="cursor-pointer text-orange-400">
            <Link to="/">HOME</Link>
          </li>
          <li className="cursor-pointer hover:text-orange-400">
            <Link to="/founder">FOUNDERS</Link>
          </li>
          <li
            className="cursor-pointer hover:text-orange-400"
            onClick={handleScrollToMenu}
          >
            MENU
          </li>
          {/* <li className="cursor-pointer hover:text-orange-400">
            <Link to="/franchise">FRANCHISE</Link>
          </li> */}
          <li className="cursor-pointer hover:text-orange-400">
            <Link to="/branches">BRANCHES</Link>
          </li>
          {/* <li className="cursor-pointer hover:text-orange-400">CATERING</li> */}
          <li
            className="cursor-pointer hover:text-orange-400"
          // onClick={handleScrollToFooter}
          >
            <Link to="contactus" >CONTACT US</Link>
          </li>
          {/* <li className="cursor-pointer hover:text-orange-400">
            <Link to="/subscription">SUBSCRIPTION</Link>
          </li> */}
        </ul>

        {/* Logo */}
        {/* <div className="flex items-center space-x-4">
          <img src={Logo} className="w-36 md:w-45" alt="Logo" />
        </div> */}

        <div className="flex flex-col items-center space-x-4">
          <p className="text-xl md:text-2xl font-mono font-bold text-white" >TELUGU FOOD.CLUB</p>
          <p className="text-xl md:text-xl font-mono font-bold text-white" >LMV FOODS</p>
        </div>

        {/* Mobile Menu (Visible when menuOpen is true) */}
        {menuOpen && (
          <ul className="absolute top-16 left-0 w-full bg-gray-800 text-white flex flex-col items-center space-y-4 py-4 md:hidden z-10">
            <li className="cursor-pointer text-orange-400" onClick={handleMenuItemClick}>
              <Link to="/">HOME</Link>
            </li>
            <li
              className="cursor-pointer hover:text-orange-400"
              onClick={() => {
                handleScrollToMenu();
                handleMenuItemClick();
              }}
            >
              MENU
            </li>
            {/* <li className="cursor-pointer hover:text-orange-400" onClick={handleMenuItemClick}>
              <Link to="/franchise">FRANCHISE</Link>
            </li> */}
            <li className="cursor-pointer hover:text-orange-400" onClick={handleMenuItemClick}>
              <Link to="/branches">BRANCHES</Link>
            </li>
            {/* <li className="cursor-pointer hover:text-orange-400" onClick={handleMenuItemClick}>
              CATERING
            </li> */}
            <li
              className="cursor-pointer hover:text-orange-400"
              onClick={() => {
                handleScrollToFooter();
                handleMenuItemClick();
              }}
            >
              CONTACT US
            </li>
            <li
              className="cursor-pointer hover:text-orange-400"
              onClick={() => {
                // handleScrollToFooter
                handleMenuItemClick();
              }}

            >
              <Link to="contactus" >CONTACT US</Link>
            </li>
            {/* <li className="cursor-pointer hover:text-orange-400" onClick={handleMenuItemClick}>
              <Link to="/subscription">SUBSCRIPTION</Link>
            </li> */}
          </ul>
        )}
      </nav>

      {/* Hero Section */}
      <div
        ref={heroRef}
        className="relative flex flex-col justify-center items-center min-h-screen max-h-max text-center text-white px-6"
      >
        <div className="flex items-center space-x-4 mt-20 md:mt-28">
          <img src={Logo} className="w-36 md:w-45" alt="Logo" />
        </div>
        <h1 className="text-3xl md:text-6xl font-bold text-white">
          {splitText("ENJOY DELICIOUS FOOD")}
        </h1>
        <p className="z-10 max-w-lg text-gray-200 text-sm md:text-lg mt-3">
          Experience the authentic taste of Telugu cuisine, where every dish is a celebration of flavors.
        </p>

        {/* CTA Button */}
        <button
          onClick={handleScrollToMenu}
          className="mt-6 px-6 py-3 bg-orange-500 text-white rounded-full text-lg hover:bg-orange-600 transition"
        >
          Explore Menu
        </button>
        <div className="max-w-lg mx-auto p-6 mt-8">
          <p className="text-white text-xl">
            " Experience the rich flavors of authentic Telugu cuisine! At <b>Telugu Food Club</b>, we bring you
            traditional recipes, aromatic spices, and delicious dishes straight from the heart of Andhra & Telangana."
          </p>
        </div>
      </div>

      {/* Food Grid Section */}
      <div className="relative py-16 px-6 md:px-12 bg-white">
        <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-800 mb-6">
          Our Signature Dishes
        </h2>

        <div
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
          style={{
            backgroundImage: `url(${Background})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}
        >
          {[
            { img: Curry, name: "Spicy Chicken Curry" },
            { img: Biryani, name: "Authentic Hyderabadi Biryani" },
            { img: Starters, name: "Crispy Starters" },
          ].map((item, index) => (
            <div
              key={index}
              className="bg-white shadow-lg rounded-xl overflow-hidden transform hover:scale-105 transition duration-300"
            >
              <img src={item.img} alt={item.name} className="w-full h-64 object-cover" />
              <div className="p-4 text-center">
                <h3 className="text-xl font-semibold text-gray-800">{item.name}</h3>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Styles for Animations */}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fadeIn 0.5s ease-out forwards;
          animation-delay: calc(var(--letter-index) * 0.05s);
        }
      `}</style>
    </div>
  );
}

export default Home;