import React, { useState } from 'react';
import BranchImg from '../assets/branchesimage.jpg';
import BgFrame from '../assets/restauranthall.jpg';
import { FaBars, FaTimes } from "react-icons/fa";
import { Link } from 'react-router-dom';
import Logo from '../assets/Logotfc.png'

function Branches() {
    const [menuOpen, setMenuOpen] = useState(false);

    const handleMenuItemClick = () => {
        setMenuOpen(false); // Close the menu when a menu item is clicked
    };

    return (
        <div>
            <div className="relative min-h-screen">
                {/* Background Image with Blur Effect */}
                <div
                    className="absolute inset-0 bg-cover bg-center z-0 after:absolute after:inset-0 after:bg-black/50"
                    style={{ backgroundImage: `url(${BgFrame})`, filter: "blur(8px)" }}
                ></div>

                {/* Navigation and Overlay Text Container */}
                <div className="relative z-10">
                    {/* Navigation */}
                    <nav className="w-full px-6 md:px-10 py-5 flex justify-between items-center text-white">
                        <button
                            className="text-2xl bg-gray-800 p-3 rounded-full hover:bg-gray-700 md:hidden"
                            onClick={() => setMenuOpen(!menuOpen)}
                        >
                            {menuOpen ? <FaTimes /> : <FaBars />}
                        </button>

                        <ul className="hidden md:flex space-x-6">
                            <li className="cursor-pointer hover:text-orange-400">
                                <Link to="/">HOME</Link>
                            </li>
                            <li className="cursor-pointer hover:text-orange-400">
                                <Link to="/founder">FOUNDERS</Link>
                            </li>
                            {/* <li className="cursor-pointer hover:text-orange-400">
                                <Link to="/franchise">FRANCHISE</Link>
                            </li> */}
                            <li className="cursor-pointer text-orange-400"> <Link to="/branches">BRANCHES</Link></li>
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
                                <li className="cursor-pointer hover:text-orange-400">
                                    <Link to="/">HOME</Link>
                                </li>
                                <li className="cursor-pointer hover:text-orange-400">
                                    <Link to="/founder">FOUNDERS</Link>
                                </li>
                                {/* <li className="cursor-pointer hover:text-orange-400">
                                    <Link to="/franchise">FRANCHISE</Link>
                                </li> */}
                                <li className="cursor-pointer text-orange-400"> <Link to="/branches">BRANCHES</Link></li>
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

                    {/* Overlay Text */}
                    <div className="flex flex-col justify-center items-center text-white text-center px-6 min-h-[calc(100vh-80px)]">
                        <h1 className="text-4xl font-bold">OUR BRANCHES</h1>
                        <p className="text-lg mt-2 max-w-2xl">
                            Explore our branches across Hyderabad, bringing you the best authentic Telugu flavors.
                        </p>
                    </div>
                </div>
            </div>

            {/* Branch Cards */}
            <div className="relative flex flex-wrap justify-center gap-20 p-8 z-10 bg-gray-100">
                {/* Branch 1 */}
                <div className="w-80 bg-white rounded-lg overflow-hidden shadow-md hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                    <img src={BranchImg} alt="Branch" className="w-full h-48 object-cover" />
                    <div className="p-6">
                        <h1 className="text-2xl font-semibold text-gray-800 mb-4">TELUGU FOOD CLUB</h1>
                        <div className="flex items-center gap-3 mb-3 text-gray-600">
                            <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                <circle cx="12" cy="10" r="3" />
                            </svg>
                            <p className="text-sm">1-67, SS Bhavan Dhulapally Road, Komapally, Hyd - 500014</p>
                        </div>
                        <div className="flex items-center gap-3 text-gray-600">
                            <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M22 2L11 13" />
                                <path d="M22 2l-7 20-4-9-9-4 20-7z" />
                            </svg>
                            <p className="text-sm">8143298555, 8977130555</p>
                        </div>
                    </div>
                </div>
                <div className="w-80 bg-white rounded-lg overflow-hidden shadow-md hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                    <img src={BranchImg} alt="Branch" className="w-full h-48 object-cover" />
                    <div className="p-6">
                        <h1 className="text-2xl font-semibold text-gray-800 mb-4">TELUGU FOOD CLUB</h1>
                        <div className="flex items-center gap-3 mb-3 text-gray-600">
                            <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                <circle cx="12" cy="10" r="3" />
                            </svg>
                            <p className="text-sm">5-41/2, Sri Venkateswara Society, Kompally,Dundigal,
                                Gandimaisamma, Medchal-Malkajgiri, Telangana-500014.</p>
                        </div>
                        <div className="flex items-center gap-3 text-gray-600">
                            <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M22 2L11 13" />
                                <path d="M22 2l-7 20-4-9-9-4 20-7z" />
                            </svg>
                            <p className="text-sm">8143298555, 8977130555</p>
                        </div>
                    </div>
                </div>

                {/* Branch 2 */}
                {/* <div className="w-80 bg-white rounded-lg overflow-hidden shadow-md hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                    <img src={BranchImg} alt="Branch" className="w-full h-48 object-cover" />
                    <div className="p-6">
                        <h1 className="text-2xl font-semibold text-gray-800 mb-4">SPICE GARDEN</h1>
                        <div className="flex items-center gap-3 mb-3 text-gray-600">
                            <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                <circle cx="12" cy="10" r="3" />
                            </svg>
                            <p className="text-sm">45-23, Green Valley, Banjara Hills, Hyderabad - 500034</p>
                        </div>
                        <div className="flex items-center gap-3 text-gray-600">
                            <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M22 2L11 13" />
                                <path d="M22 2l-7 20-4-9-9-4 20-7z" />
                            </svg>
                            <p className="text-sm">9876543210</p>
                        </div>
                    </div>
                </div> */}

                {/* Branch 3 */}
                {/* <div className="w-80 bg-white rounded-lg overflow-hidden shadow-md hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                    <img src={BranchImg} alt="Branch" className="w-full h-48 object-cover" />
                    <div className="p-6">
                        <h1 className="text-2xl font-semibold text-gray-800 mb-4">ANDHRA TASTE HUB</h1>
                        <div className="flex items-center gap-3 mb-3 text-gray-600">
                            <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                <circle cx="12" cy="10" r="3" />
                            </svg>
                            <p className="text-sm">12-89, Tech Park Avenue, Gachibowli, Hyd - 500032</p>
                        </div>
                        <div className="flex items-center gap-3 text-gray-600">
                            <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M22 2L11 13" />
                                <path d="M22 2l-7 20-4-9-9-4 20-7z" />
                            </svg>
                            <p className="text-sm">7894561230</p>
                        </div>
                    </div>
                </div> */}
            </div>
        </div>
    );
}

export default Branches;