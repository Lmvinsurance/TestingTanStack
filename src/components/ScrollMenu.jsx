import React from "react";
import BgImage from "../assets/bgitems.png";
import Image1 from "../assets/starters.jpg";
import Image2 from "../assets/nonvegcurry.jpg";
import Image3 from "../assets/nonvegBiryani.jpg";
import Image4 from "../assets/biryani/b1.jpg";
import Image5 from "../assets/biryani/b2.jpg";
import Image6 from "../assets/biryani/b3.jpg";
import Image7 from "../assets/biryani/b4.jpg";


function ScrollMenu() {
  const imagesRow1 = [Image1, Image2, Image3, Image4]; // First row images
  const imagesRow2 = [Image5, Image6, Image7]; // Second row images

  return (
    <div
      className=" w-full overflow-hidden relative bg-[rgb(9,67,89)]"
      style={{
        backgroundImage: `url(${BgImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <h1 className="text-3xl font-bold text-center text-white py-6">
        OUR MENU
      </h1>

      {/* First Scrolling Row */}
      <div className="w-full overflow-hidden relative">
        <div className="flex space-x-4 animate-scroll">
          {[...imagesRow1, ...imagesRow1].map((image, index) => (
            <div
              key={index}
              className="flex-shrink-0 w-74 h-70 bg-cover bg-center rounded-lg shadow-lg"
              style={{ backgroundImage: `url(${image})` }}
            ></div>
          ))}
        </div>
      </div>

      {/* Second Scrolling Row (Opposite Direction) */}
      <div className="w-full overflow-hidden relative mt-6">
        <div className="flex space-x-4 animate-scroll-reverse">
          {[...imagesRow2, ...imagesRow2].map((image, index) => (
            <div
              key={index}
              className="flex-shrink-0 w-74 h-70 bg-cover bg-center rounded-lg shadow-lg"
              style={{ backgroundImage: `url(${image})` }}
            ></div>
          ))}
        </div>
      </div>

      {/* Scroll Animation */}
      <style>
        {`
          @keyframes scroll {
            from {
              transform: translateX(0);
            }
            to {
              transform: translateX(-50%);
            }
          }

          @keyframes scroll-reverse {
            from {
              transform: translateX(-50%);
            }
            to {
              transform: translateX(0);
            }
          }

          .animate-scroll {
            display: flex;
            white-space: nowrap;
            animation: scroll 10s linear infinite;
          }

          .animate-scroll-reverse {
            display: flex;
            white-space: nowrap;
            animation: scroll-reverse 10s linear infinite;
          }
        `}
      </style>
    </div>
  );
}

export default ScrollMenu;
