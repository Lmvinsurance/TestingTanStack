import React, { Suspense, useEffect, useRef } from "react";
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate } from "react-router-dom";
import Menu from "./components/Menu";
import OurStory from "./components/OurStory";
import ScrollMenu from "./components/ScrollMenu";
import FranchiseData from "./components/FranchiseData";
import Footer from "./components/Footer";
import Home from "./components/Home";
import Franchise from "./components/Franchise";
import Branches from "./components/Branches";
import DeliveryBoyImage from './assets/delievryBoy.png'
import Orders from "./components/Orders";
import SubscriptionPage from "./pages/SubscriptionPage";
import Founders from "./components/Founders";
import Policy from "./pages/Policy";
import TermsOfService from "./pages/TermsofService";
import OrderPolicy from "./pages/orderShippingcancellation";
import RefundPolicy from "./pages/refundPolicy";
import ContactUs from "./pages/contactUs";
import PaymentGateway from "./pages/paymentPage";
import OrderStatus from "./components/StatusOrder";



// Layout component to wrap common elements (e.g., Footer)
const Layout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (location.pathname.endsWith("/") && location.pathname !== "/") {
      navigate(location.pathname.slice(0, -1), { replace: true });
    }
  }, [location, navigate]);

  return (
    <>
      <div>
        {React.Children.map(children, (child) =>
          React.cloneElement(child)
        )}
        {!["/orders", "/orderStatus", "/termsofservice", "/policy", "/orderpolicy", "/refundpolicy", "/payment"].includes(location.pathname) &&
          <>
            <Link
              target="blank"
              to="/orders"
              className="fixed right-5 bottom-10 flex flex-col items-center hover:scale-105 transition-transform duration-300"
            >
              <img src={DeliveryBoyImage} alt="Delivery Boy" className="w-24 h-24 object-contain" />
              <span className="mt-2 text-lg font-bold bg-orange-500 text-white p-2 rounded-lg">
                Order Now
              </span>
            </Link>
          </>
        }
      </div>
    </>
  );
};

function App() {
  const footerRef = useRef(null);
  const MenuRef = useRef(null);
  return (
    <Router>
      <Routes>
        {/* Home Route */}
        <Route
          path="/"
          element={
            <Layout>
              <Home menuRef={MenuRef} footerRef={footerRef} />
              <OurStory />
              <Menu ref={MenuRef} />
              <ScrollMenu />
              <FranchiseData />
              <Footer ref={footerRef} />
            </Layout>
          }
        />

        {/* Franchise Route */}
        {/* <Route
          path="/franchise"
          element={
            <Layout>
              <Franchise footerRef={footerRef} />
              <Footer ref={footerRef} />
            </Layout>
          }
        /> */}
        <Route
          path="/branches"
          element={
            <Layout>
              <Branches footerRef={footerRef} />
              <Footer ref={footerRef} />
            </Layout>
          }
        />
        <Route
          path="/subscription"
          element={
            <Layout>
              <SubscriptionPage footerRef={footerRef} />
              <Footer ref={footerRef} />
            </Layout>
          }
        />

        <Route
          path="/orders"
          element={
            <Layout>
              <Orders />
            </Layout>
          }
        />

        <Route
          path="/orderStatus"
          element={
            <Layout>
              <OrderStatus />
            </Layout>
          }
        />

        <Route
          path="/founder"
          element={
            <Layout>
              <Founders footerRef={footerRef} />
              <Footer ref={footerRef} />
            </Layout>
          }
        />
        <Route
          path="/policy"
          element={
            <Layout>
              <Policy />
            </Layout>
          }
        />

        <Route
          path="/termsofservice"
          element={
            <Layout>
              <TermsOfService />
            </Layout>
          }
        />

        <Route
          path="/orderpolicy"
          element={
            <Layout>
              <OrderPolicy />
            </Layout>
          }
        />

        <Route
          path="/refundpolicy"
          element={
            <Layout>
              <RefundPolicy />
            </Layout>
          }
        />

        <Route
          path="/contactus"
          element={
            <Layout>
              <ContactUs />
            </Layout>
          }
        />

        <Route
          path="/payment"
          element={
            <Layout>
              <PaymentGateway />
            </Layout>
          }
        />

        {/* Fall back to Home */}
        <Route
          path="*"
          element={
            <Home />
          }
        />
      </Routes>
    </Router>
  );
}

export default App;