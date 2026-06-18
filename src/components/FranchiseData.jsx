import React from "react";
import { useInView } from "react-intersection-observer";
import videoBg from "../assets/cookingvideo.mp4";
import { Link } from "react-router-dom";

function LovableCustomers() {
  const { ref: cardsRef, inView: cardsInView } = useInView({ triggerOnce: true });

  return (
    <div className="relative flex flex-col items-center justify-center px-4 mt-20 w-full h-[600px] overflow-hidden">
      {/* Background Video */}
      <video
        className="absolute top-0 left-0 w-full h-full object-cover"
        autoPlay
        loop
        muted
        playsInline
      >
        <source src={videoBg} type="video/mp4" />
        Your browser does not support the video tag.
      </video>

      {/* Overlay */}
      <div className="absolute top-0 left-0 w-full h-full bg-opacity-50"></div>

      {/* Content */}
      <div className="relative z-10 text-center text-white p-6">
        <h1 className="text-4xl font-bold mb-4">Our Lovable Customers 💖</h1>
        <p className="text-sm mb-8 max-w-md mx-auto">
          At Telugu Food Club, our greatest achievement is putting a smile on your face. Here's what makes our customers feel the love!
        </p>

        {/* Customer Cards */}
        <div ref={cardsRef} className="flex flex-col md:flex-row gap-6 mb-8">
          {[
            { emoji: "😊", title: "Happy Customers", description: "Thousands of satisfied foodies across Telugu states." },
            { emoji: "⭐", title: "5-Star Reviews", description: "Top ratings for taste, service, and experience." },
            { emoji: "👨‍👩‍👧‍👦", title: "Family Friendly", description: "A place where every age feels welcome." },
          ].map((card, index) => (
            <div
              key={index}
              className={`group flex flex-col items-center justify-center bg-white border border-gray-200 rounded-lg p-6 shadow-lg w-64 h-48 transition-all duration-300 transform ${
                cardsInView ? `animate-card-slide-up delay-${index}` : "translate-y-20 opacity-0"
              } hover:scale-105 hover:shadow-2xl hover:border-transparent hover:bg-gradient-to-br from-pink-500 to-red-400`}
            >
              <span className="text-5xl mb-2 transition-transform group-hover:scale-125">
                {card.emoji}
              </span>
              <h3 className="text-lg font-semibold mb-1 text-gray-800 group-hover:text-white">
                {card.title}
              </h3>
              <p className="text-gray-500 text-sm text-center group-hover:text-gray-200">
                {card.description}
              </p>
            </div>
          ))}
        </div>

      
      </div>

      {/* CSS Animation */}
      <style jsx>{`
        @keyframes cardSlideUp {
          from {
            transform: translateY(20px) scale(0.95);
            opacity: 0;
          }
          to {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
        }

        .animate-card-slide-up {
          animation: cardSlideUp 0.8s ease-out forwards;
        }

        .delay-0 {
          animation-delay: 0s;
        }
        .delay-1 {
          animation-delay: 0.2s;
        }
        .delay-2 {
          animation-delay: 0.4s;
        }
      `}</style>
    </div>
  );
}

export default LovableCustomers;
