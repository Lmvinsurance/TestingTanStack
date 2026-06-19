import React, { forwardRef } from "react";
import { FaFacebookF, FaInstagram, FaTwitter, FaPinterest } from "react-icons/fa";
import BgImage from "../assets/contactus.jpg"; // Background Image
import { Link } from "react-router-dom";

const Footer = forwardRef((props, ref) => {
  return (
    <div
      ref={ref}
      className="relative bg-cover bg-center text-white py-20 px-4 mt-20"
      style={{
        backgroundImage: `url(${BgImage})`,
      }}
    >
      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-black opacity-50"></div>

      <div className="relative z-10 max-w-5xl mx-auto text-center">
        {/* <h1 className="text-4xl font-semibold mb-2">GET IN TOUCH WITH US</h1> */}

        {/* Newsletter Subscription */}
        {/* <div className="flex justify-center items-center gap-2 max-w-md mx-auto">
          <input
            type="email"
            placeholder="Enter your email..."
            className="w-full p-3 rounded-full bg-gray-800 text-white placeholder-gray-400 outline-none"
          />
          <button className="bg-orange-500 px-6 py-3 rounded-full hover:bg-orange-600 transition duration-300">
            SUBMIT
          </button>
        </div> */}

        {/* Footer Sections */}
        <div className="mt-12 flex flex-col md:flex-row justify-between text-sm text-gray-300">
          <div className="mb-6 md:mb-0">
            <h3 className="text-lg font-semibold text-white mb-2">OPENING HOURS</h3>
            <p>Mon - Sat: 5a.m - 11p.m</p>
            <p>Sun: 7a.m - 11p.m</p>
          </div>

          <div className="mb-6 md:mb-0">
            <h3 className="text-lg font-semibold text-white mb-2">LOCATION</h3>
            <p>Telugu Food Club,</p>
            <p>1-67, SS Bhavan Dhulapally Road, Komapally, Hyd - 500014.</p>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-white mb-2">CONTACT</h3>
            <p>Call us +918143298555, +918977130555</p>
            <p><a href="mailto:telugufoodclub1@gmail.com" className="underline hover:text-blue-400" >telugufoodclub1@gmail.com</a></p>
          </div>
        </div>

        {/* Social Media Icons */}
        <div className="mt-8 flex justify-center gap-6 text-xl">
          <FaFacebookF className="hover:text-orange-400 cursor-pointer" />
          <FaInstagram className="hover:text-orange-400 cursor-pointer" />
          <FaTwitter className="hover:text-orange-400 cursor-pointer" />
          <FaPinterest className="hover:text-orange-400 cursor-pointer" />
        </div>

        {/* Footer Bottom */}
        <div className="mt-8 text-gray-400 text-xs">
          <p>
            Powered By @LMV FOODS
          </p>
          {/* <p>
            DESIGNED BY © 2025 <span className="text-orange-500"><a href="" >LAKSHITA TECH SOLUTIONS</a></span>. ALL RIGHTS RESERVED.
          </p> */}
          <p className="mt-2">
            <Link to="/policy" className="hover:text-white">
              PRIVACY & COOKIE POLICY
            </Link>{" "}
            |{" "}
            <Link to="/termsofservice" className="hover:text-white">
              TERMS OF SERVICE
            </Link>{" "}
            |{" "}
            <Link to="/orderpolicy" className="hover:text-white">
              ORDER SHIPPING & CANCELLATION POLICY
            </Link>
            |{" "}
            <Link to="/refundpolicy" className="hover:text-white">
              REFUND POLICY
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
});

export default Footer;
