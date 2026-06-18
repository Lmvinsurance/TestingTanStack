import React, { useEffect, useRef } from 'react';
import Slider from 'react-slick';
import ImageB1 from '../assets/biryani/b1.jpg';
import ImageB2 from '../assets/biryani/b2.jpg';
import ImageB3 from '../assets/biryani/b3.jpg';
import ImageB4 from '../assets/biryani/b4.jpg';
import Background from '../assets/background2-pink.webp';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';

function OurStory() {
  const sliderRef = useRef(null);

  const settings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 3000,
    arrows: true,
    adaptiveHeight: true,
    responsive: [
      {
        breakpoint: 1024,
        settings: {
          arrows: false,
          dots: true,
        },
      },
      {
        breakpoint: 768,
        settings: {
          arrows: false,
          dots: true,
        },
      },
      {
        breakpoint: 480,
        settings: {
          arrows: false,
          dots: true,
        },
      },
    ],
  };

  useEffect(() => {
    const handleResize = () => {
      if (sliderRef.current) {
        sliderRef.current.slickGoTo(0);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
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
      <div className="md:w-1/2 mb-10 md:mb-0 px-4 max-w-full">
        <div className="flex flex-col text-center">
          <h2 className="text-2xl md:text-4xl font-bold mb-6 text-black animate-slide-in-from-left">
            Discover Our Story
          </h2>
        </div>
        <p className="text-base text-justify md:text-xl leading-relaxed text-black animate-slide-in-from-left delay-200 overflow-hidden">
          In a small town (Bhimavaram) in Andhra Pradesh, two determined women dared to dream beyond expectations. Passionate about their rich culinary heritage, they set out to bring the authentic flavors of their homeland to the world. With limited resources but boundless determination, they started a small kitchen, crafting dishes that carried the warmth of home.
          Facing challenges in a male-dominated industry, they stood strong, proving that skill and resilience know no boundaries. Their journey was not just about food; it was about creating opportunities for other women, empowering them with jobs and independence.
          Today, their restaurant stands as a symbol of strength, unity, and the power of dreams. Every dish served carries the essence of tradition and the spirit of fearless women who believed in themselves. Their story continues to inspire, reminding everyone that when women uplift each other, they can change the world—one meal at a time.
        </p>
      </div>

      {/* Right Side - Carousel */}
      <div className="md:w-1/2 w-full max-w-xl px-4">
        <Slider ref={sliderRef} {...settings}>
          <div>
            <img src={ImageB1} alt="Biryani 1" className="w-full h-64 md:h-96 object-cover rounded-xl shadow-lg" />
          </div>
          <div>
            <img src={ImageB2} alt="Biryani 2" className="w-full h-64 md:h-96 object-cover rounded-xl shadow-lg" />
          </div>
          <div>
            <img src={ImageB3} alt="Biryani 3" className="w-full h-64 md:h-96 object-cover rounded-xl shadow-lg" />
          </div>
          <div>
            <img src={ImageB4} alt="Biryani 4" className="w-full h-64 md:h-96 object-cover rounded-xl shadow-lg" />
          </div>
        </Slider>
      </div>

      {/* Keyframe Animation */}
      <style jsx>{`
        @keyframes slideInFromLeft {
          from {
            opacity: 0;
            transform: translateX(-50px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .animate-slide-in-from-left {
          animation: slideInFromLeft 1.8s ease-out forwards;
        }

        .delay-200 {
          animation-delay: 0.2s;
        }
      `}</style>
    </div>
  );
}

export default OurStory;