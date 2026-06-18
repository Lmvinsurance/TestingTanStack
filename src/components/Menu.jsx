import React, { forwardRef } from "react";
import { useInView } from "react-intersection-observer";
import StartersImage from "../assets/starters.jpg";
import BiryanisImage from "../assets/nonvegBiryani.jpg";
import NonVegCurry from "../assets/nonvegcurry.jpg";
import { Link } from "react-router-dom";

const Menu = forwardRef((props, ref) => {
  // Intersection observers for each section
  const { ref: startersRef, inView: startersInView } = useInView({ triggerOnce: true });
  const { ref: biryanisRef, inView: biryanisInView } = useInView({ triggerOnce: true });
  const { ref: curriesRef, inView: curriesInView } = useInView({ triggerOnce: true });

  return (
    <div ref={ref} className="bg-[#42241D] min-h-screen flex flex-col items-center py-10">

      {/* Header Section */}
      <div className="text-center mb-10">
        <p className="text-sm text-white">Enjoy an exceptional</p>
        <h1 className="text-3xl font-bold text-white">SEASONAL AND DELICIOUS</h1>
        <h1 className="text-3xl font-bold text-white">FOOD MENU</h1>
      </div>

      {/* Starters Section */}
      <div ref={startersRef} className="max-w-6xl w-full flex flex-col gap-x-20 md:flex-row items-center md:items-start bg-[#42241D] shadow-lg rounded-lg overflow-hidden p-5">
        {/* Image Section */}
        <div className="md:w-1/2 w-full">
          <img
            src={StartersImage}
            alt="Starters"
            className="w-full h-auto object-cover rounded-tl-[350px]"
          />
        </div>

        {/* Content Section */}
        <div className="md:w-1/2 w-full p-5">
          <h1
            className="text-2xl font-bold text-white relative px-6 py-3 inline-block"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 225 44' width='100%' height='100%'>%3Cpath d='M0 0h225l-15.4 22L225 44H0l15.5-22L0 0z' fill='%23f97316'/%3E%3C/svg%3E")`,
              backgroundRepeat: "no-repeat",
              backgroundPosition: "center",
              backgroundSize: "contain",
            }}
          >
            STARTERS
          </h1>

          {/* Menu Items with Animation */}
          <div className={`space-y-9 ${startersInView ? "animate-slide-in-left" : ""}`}>
            {[
              {
                name: "Bhimavaram Royala Yepudu",
                price: "₹580",
                description:
                  "A flavorful prawn fry made with fresh Bhimavaram prawns and aromatic Andhra spices. The prawns are slow-cooked until golden brown, enhancing their natural sweetness. A perfect blend of spice and crispiness makes this dish an irresistible seafood delight."
              },
              {
                name: "Raju Gari Jeedipapu Chicken Pakodi",
                price: "₹150",
                description:
                "A crispy and royal-style chicken pakodi, coated with cashew paste for a rich taste. Tender chicken pieces are deep-fried to perfection, locking in juicy flavors. Served hot with a spicy chutney or a squeeze of lemon for extra zest.",
              },
              {
                name: "Chittimuthyalu Chicken Fry Piece Pulao",
                price: "₹280",
                description:
                  "A fragrant chicken pulao made with the unique small-grained Chittimuthyalu rice. Crispy fried chicken pieces are mixed into the pulao, adding bold flavors.Cooked with aromatic Andhra spices, this dish is both spicy and satisfying.",
              },
              {
                name: "Bhimavaram Chicken Joint Vepudu",
                price: "200",
                description:
                  "A classic Bhimavaram-style chicken fry prepared with bone-in chicken joints. Marinated with fiery Andhra spices and deep-fried for a crispy, flavorful finish. The juicy interior and crunchy outer layer create a perfect contrast of textures.",
              },
              {
                name: "Bhimavaram Raju Gari Chepala Fry",
                price: "₹140",
                description:
                  "A royal fish fry dish from Bhimavaram, seasoned with traditional Andhra spices. The fish is marinated and shallow-fried until crispy on the outside and juicy inside. Tangy flavors from tamarind and spices enhance the freshness of the fish.",
              },
              // {
              //   name: "Amalapuram Layer Kodi Vepudu",
              //   price: "₹380",
              //   description:
              //     "A special chicken fry dish from Amalapuram, prepared with layers of bold spices. The chicken is marinated, slow-cooked, and pan-fried for a deep, rich taste.Each layer adds complexity, making it a unique and flavorful experience. Perfect as a side dish or enjoyed with steamed rice and Andhra-style curries.",
              // },
            ].map((item, index) => (
              <div key={index}>
                <div className="flex justify-between items-center">
                  <p className="text-lg font-semibold text-white">{item.name}</p>
                  <span className="flex-1 border-dashed border-t border-[#666666] mx-4"></span>
                  <p className="text-lg font-semibold text-white">{item.price}</p>
                </div>
                <p className="text-white text-sm">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Biryanis-Pulaos Section */}
      <div ref={biryanisRef} className="max-w-6xl w-full flex flex-col gap-x-20 md:flex-row items-center md:items-start bg-[#42241D] shadow-lg rounded-lg overflow-hidden p-5">
        {/* Content Section */}
        <div className="md:w-1/2 w-full p-5">
          <h1
            className="text-2xl font-bold text-white relative px-6 py-3 inline-block"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 225 44' width='100%' height='100%'>%3Cpath d='M0 0h225l-15.4 22L225 44H0l15.5-22L0 0z' fill='%23f97316'/%3E%3C/svg%3E")`,
              backgroundRepeat: "no-repeat",
              backgroundPosition: "center",
              backgroundSize: "contain",
            }}
          >
            Biryanis-Pulaos
          </h1>

          {/* Menu Items with Animation */}
          <div className={`space-y-9 ${biryanisInView ? "animate-slide-in-left" : ""}`}>
            {[
              {
                name: "Raju Gari Dupudupothu Chittimuthyalu Pulao",
                price: "₹249",
                description:
                  "A royal lamb pulao cooked with tender lamb pieces and aromatic Chittimuthyalu rice. The meat is slow-cooked with Andhra spices, making it soft and flavorful. Each bite bursts with the richness of slow-roasted spices and juicy lamb.",
              },
              {
                name: "Raju Gari Royala Pulao (Chittimuthyalu Rice)",
                price: "₹220",
                description:
                  "A seafood delicacy featuring jumbo prawns and fragrant Chittimuthyalu rice. The prawns are cooked with aromatic spices, blending beautifully into the pulao. Each grain of rice absorbs the bold flavors of prawns and Andhra masalas.",
              },
              {
                name: "Bhimavaram Royala Vepudu Biryani",
                price: "₹240",
                description:
                  "A fusion dish combining spicy prawn fry with aromatic biryani rice. The prawns are slow-cooked with bold spices, adding depth to the biryani. Each bite delivers a mix of crispy textures and rich Andhra flavors.",
              },
              {
                name: "Bhimavaram Raju Gari Mixed Pulao (Mutton, Prawns, Chicken)",
                price: "₹280",
                description:
                  "A grand pulao blending the best of mutton, prawns, and chicken. Slow-cooked with Andhra spices to ensure each ingredient is rich in flavor. The combination of meats adds a unique depth and complexity to the dish.",
              },
              {
                name: "Chittimuthyalu Mutton Kheema Pulao",
                price: "₹299  ",
                description:
                  "A rich and hearty mutton kheema pulao made with Chittimuthyalu rice. Minced mutton is slow-cooked with fragrant spices, infusing every grain with flavor. The soft texture of the rice complements the richness of the mutton perfectly.",
              },
              // {
              //   name: "Bhimavaram Royala Vepudu Biryani",
              //   price: "₹240",
              //   description:
              //     "Succulent fish chunks grilled with aromatic Indian spices, served with mint chutney.",
              // },
              // {
              //   name: "Nautikodi Chittimuthyalu Pulao",
              //   price: "₹200",
              //   description:
              //     "Chicken stir-fried with crushed black pepper and spices for a bold and spicy flavor.",
              // },
            ].map((item, index) => (
              <div key={index}>
                <div className="flex justify-between items-center">
                  <p className="text-lg font-semibold text-white">{item.name}</p>
                  <span className="flex-1 border-dashed border-t border-[#666666] mx-4"></span>
                  <p className="text-lg font-semibold text-white">{item.price}</p>
                </div>
                <p className="text-white text-sm">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="md:w-1/2 w-full">
          <img
            src={BiryanisImage}
            alt="Starters"
            className="w-full h-auto object-cover rounded-full"
          />
        </div>
      </div>

      {/* Non-Veg Curries Section */}
      <div ref={curriesRef} className="max-w-6xl w-full flex flex-col gap-x-20 md:flex-row items-center md:items-start bg-[#42241D] shadow-lg rounded-lg overflow-hidden p-5">
        {/* Image Section */}
        <div className="md:w-1/2 w-full">
          <img
            src={NonVegCurry}
            alt="Starters"
            className="w-full h-auto object-cover rounded-t-full"
          />
        </div>

        {/* Content Section */}
        <div className="md:w-1/2 w-full p-5">
          <h1
            className="text-2xl font-bold text-white relative px-6 py-3 inline-block"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 225 44' width='100%' height='100%'>%3Cpath d='M0 0h225l-15.4 22L225 44H0l15.5-22L0 0z' fill='%23f97316'/%3E%3C/svg%3E")`,
              backgroundRepeat: "no-repeat",
              backgroundPosition: "center",
              backgroundSize: "contain",
            }}
          >
            NON-VEG CURRIES
          </h1>

          {/* Menu Items with Animation */}
          <div className={`space-y-9 ${curriesInView ? "animate-slide-in-left" : ""}`}>
            {[
              {
                name: "Chicken Curry",
                price: "₹110",
                description:
                  "A classic Andhra-style chicken curry cooked with bold spices and rich masalas. Slow-cooked to perfection, the tender chicken absorbs the deep, aromatic flavors. A perfect blend of heat, tanginess, and spice makes this dish truly irresistible.",
              },
              {
                name: "Bhimavaram Rajula Chepala",
                price: "₹80",
                description:
                  "A tangy and spicy fish curry, a signature delicacy from Bhimavaram. Fresh fish is slow-cooked in a tamarind-based gravy with garlic and mustard seeds. The rich blend of Andhra spices enhances the natural flavors of the fish.",
              },
              {
                name: "PRAWN CURRY",
                price: "₹230",
                description:
                  "A delicious prawn curry infused with Andhra-style spices and coconut flavors. The prawns are simmered in a rich, aromatic gravy that enhances their natural sweetness. A hint of tamarind and chili gives it the perfect balance of tangy and spicy.",
              },
              {
                name: "Natukodi Curry",
                price: "₹230",
                description:
                  "A rustic and traditional Andhra country chicken curry with bold flavors. The slow-cooked natukodi (country chicken) absorbs deep, earthy spice blends. Its slightly firm texture and rich masala make it a favorite among spice lovers.",
              },
              {
                name: "Bombidayalu Pulusu",
                price: "₹250",
                description:
                  "A unique and tangy Andhra-style pulusu made with tiny coastal fish. These small fish are simmered in a spicy tamarind-based gravy with garlic and mustard. The bold flavors soak into the fish, making every bite rich and flavorful.",
              },
              // {
              //   name: "Gongura Chicken Curry",
              //   price: "₹110",
              //   description:
              //     "A lip-smacking Andhra chicken curry cooked with tangy gongura leaves. The sourness of gongura blends perfectly with the bold spice mix and tender chicken. Slow-cooked for deep, intense flavors that linger with every bite. Best enjoyed with rice or jowar roti for an authentic Andhra experience.",
              // },
              // {
              //   name: "Mutton Kheema Curry",
              //   price: "₹300",
              //   description:
              //     "A rich and flavorful minced mutton curry cooked with aromatic spices. The juicy mutton kheema is slow-cooked with onions, tomatoes, and Andhra masalas. Its thick, spicy gravy makes it a great pairing with rice, roti, or dosas. A must-try dish for meat lovers craving a hearty and spicy delight.",
              // },
            ].map((item, index) => (
              <div key={index}>
                <div className="flex justify-between items-center">
                  <p className="text-lg font-semibold text-white">{item.name}</p>
                  <span className="flex-1 border-dashed border-t border-[#666666] mx-4"></span>
                  <p className="text-lg font-semibold text-white">{item.price}</p>
                </div>
                <p className="text-white text-sm">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Add CSS for the slide-in animation */}
      <style>
        {`
          @keyframes slideInLeft {
            from {
              transform: translateX(-100%);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }

          .animate-slide-in-left {
            animation: slideInLeft 1s ease-out forwards; /* 1s duration, ease-out timing, stays at final state */
          }
        `}
      </style>
    </div>
  );
});

export default Menu;