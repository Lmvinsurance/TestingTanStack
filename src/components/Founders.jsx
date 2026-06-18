import React, { useState } from 'react';
import BranchImg from '../assets/branchesimage.jpg';
import BgFrame from '../assets/restauranthall.jpg';
import { FaBars, FaTimes } from "react-icons/fa";
import { Link } from 'react-router-dom';
import Background from '../assets/background2-pink.webp';

function Founders() {
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
                <div className="relative ">
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
                            <li className="cursor-pointer text-orange-400">
                                <Link to="/founder">FOUNDERS</Link>
                            </li>
                            {/* <li className="cursor-pointer hover:text-orange-400">
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
                                <li className="cursor-pointer hover:text-orange-400">
                                    <Link to="/">HOME</Link>
                                </li>
                                <li className="cursor-pointer text-orange-400">
                                    <Link to="/founder">FOUNDERS</Link>
                                </li>
                                <li className="cursor-pointer hover:text-orange-400">
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

                    {/* Overlay Text */}
                    <div className="flex flex-col justify-center items-center text-white text-center px-6 min-h-[calc(100vh-80px)]">
                        <h1 className="text-4xl font-bold">Founders</h1>
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
                        <h1 className="text-2xl font-semibold text-gray-800 mb-4">UMA DEVI THOTAKURU</h1>
                        <div className="flex items-center gap-3 mb-3 text-gray-600">
                            <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                <circle cx="12" cy="10" r="3" />
                            </svg>
                            <p className="text-sm">Bhimavaram</p>
                        </div>
                        <div className="flex items-center gap-3 text-gray-600">
                            <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M22 2L11 13" />
                                <path d="M22 2l-7 20-4-9-9-4 20-7z" />
                            </svg>
                            <p className="text-sm">8143298555, 8977130555</p>
                        </div>
                        <i className="text-sm text-gray-600 p-2">"The road to success is never easy, but every challenge is an opportunity to grow stronger." </i>
                    </div>
                </div>
                <div className="w-80 bg-white rounded-lg overflow-hidden shadow-md hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                    <img src={BranchImg} alt="Branch" className="w-full h-48 object-cover" />
                    <div className="p-6">
                        <h1 className="text-2xl font-semibold text-gray-800 mb-4">SAGI LAXMI</h1>
                        <div className="flex items-center gap-3 mb-3 text-gray-600">
                            <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                <circle cx="12" cy="10" r="3" />
                            </svg>
                            <p className="text-sm">Telangana    </p>
                        </div>
                        <div className="flex items-center gap-3 text-gray-600">
                            <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M22 2L11 13" />
                                <path d="M22 2l-7 20-4-9-9-4 20-7z" />
                            </svg>
                            <p className="text-sm">8143298555, 8977130555</p>
                        </div>
                        <i className="text-sm text-gray-600 p-2">"Surround yourself with people who uplift you and remember that resilience and passion can break any barrier."</i>

                    </div>
                </div>

                <div
                    className="flex flex-col md:flex-row items-center justify-between px-4 py-16 text-white md:px-10"
                    style={{
                        backgroundImage: `url(${Background})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        backgroundRepeat: 'no-repeat',
                    }}
                >
                    {/* Left Side - Text Content */}
                    <div className=" mb-10 md:mb-0 px-4 max-w-full">
                        <div className="flex flex-col text-center">
                            <h2 className="text-2xl md:text-4xl font-bold mb-6 text-black animate-slide-in-from-left">
                                Founder's Story
                            </h2>
                        </div>
                        <p className="text-base text-justify md:text-xl leading-relaxed text-black animate-slide-in-from-left delay-200 overflow-hidden">
                            In the heart of Andhra Pradesh, where tradition meets taste, two independent women dared to dream beyond boundaries. Born and raised in Bheemavaram, a town celebrated for its rich culinary heritage, they were deeply connected to the flavors that defined their childhood. From the fiery Gongura Pachadi to the aromatic Chepala Pulusu, the essence of Bheemavaram cuisine was more than just food to them—it was a story of love, family, and culture.

                            However, their journey was anything but easy. Despite their passion for cooking, the road to building their own restaurant was filled with challenges. Society often questioned their ambition, and the hurdles of starting a business with limited resources seemed overwhelming. But they refused to let these obstacles define their destiny. With relentless determination, they took their first steps towards creating something extraordinary.

                            In the beginning, they started small, preparing authentic Bheemavaram dishes from a tiny kitchen. Word spread quickly, and people began to recognize the authenticity and unique flavors in their food. Their dishes weren’t just meals; they were a reminder of home, a taste of nostalgia for those longing for the flavors of Andhra Pradesh. Encouraged by the love and support of their early customers, they decided to expand their dream and open a restaurant dedicated to preserving and promoting their beloved cuisine.

                            With no formal business background, they learned everything from scratch—sourcing ingredients, managing finances, and marketing their brand. They faced skepticism at every turn, but their belief in themselves and their mission kept them going. Every dish they served was a testament to their resilience, a symbol of their unwavering spirit. Slowly but surely, their restaurant became a cherished place for food lovers, attracting people from all walks of life.

                            But their story isn’t just about food; it’s about empowerment. As women who had faced numerous struggles, they knew the importance of supporting others like them. They made it their mission to create opportunities for women, hiring and training them to become financially independent. Their restaurant became more than just a business—it became a movement, a space where women could dream, grow, and achieve their own success.

                            Today, their restaurant stands as a beacon of inspiration, serving authentic Bheemavaram cuisine to people far and wide. It represents more than just great food; it symbolizes the strength of two women who dared to follow their dreams and uplift others along the way. Every dish carries a piece of their journey, a taste of home, and a promise that with passion and perseverance, anything is possible.

                            As they continue to spread the flavors of Bheemavaram to the world, their mission remains the same—to enlighten people’s taste buds with authentic Andhra Pradesh cuisine while empowering women to rise above limitations and chase their dreams. Their story is far from over, and with every meal served, they continue to inspire a new generation of dreamers, doers, and believers.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Founders;
