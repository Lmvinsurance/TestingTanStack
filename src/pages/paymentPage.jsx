// import React, { useState } from 'react';
// import { useLocation, useNavigate } from 'react-router-dom';
// import phonePeLogo from '../assets/phonepe.png'
// import googlePayLogo from '../assets/gpay.png'
// import paytmLogo from '../assets/paytm.png'

// // Sample logos (replace with actual image imports or URLs)
// // const phonePeLogo = '../assets/phonepe.png';
// // const googlePayLogo = 'https://via.placeholder.com/40?text=GooglePay';
// // const paytmLogo = 'https://via.placeholder.com/40?text=Paytm';
// const cardLogo = 'https://via.placeholder.com/40?text=Card';
// const netBankingLogo = 'https://via.placeholder.com/40?text=NetBanking';

// function PaymentGateway() {
//     const location = useLocation();
//     const navigate = useNavigate()
//     const [selectedMethod, setSelectedMethod] = useState(null);
//     const amount = location.state;
//     console.log("location", location);

//     // Sample payment methods data
//     const paymentMethods = [
//         { id: 'phonepe', name: 'PhonePe', logo: phonePeLogo },
//         { id: 'googlepay', name: 'Google Pay', logo: googlePayLogo },
//         { id: 'paytm', name: 'Paytm', logo: paytmLogo },
//         { id: 'card', name: 'Credit/Debit Card', logo: cardLogo },
//         { id: 'netbanking', name: 'Net Banking', logo: netBankingLogo },
//     ];

//     // Handle payment method selection
//     const handleSelectMethod = (methodId) => {
//         setSelectedMethod(methodId);
//         // Here you would typically trigger the payment gateway integration
//         console.log(`Selected payment method: ${methodId}`);
//     };

//     return (
//         <div className="min-h-screen bg-gray-100 flex items-center justify-center">

//             {/* Modal Content */}
//             <div
//                 className="fixed inset-0 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2  sm:w-[400px] md:w-xl h-full sm:h-auto sm:rounded-lg z-30 overflow-y-auto transition-all duration-300"
//             >
//                 <div className="p-4 sm:p-6">
//                     {/* Header */}
//                     <div className="flex justify-between items-center mb-4">
//                         <h2 className="text-lg sm:text-xl font-semibold text-gray-800">
//                             Select Payment Method
//                         </h2>
//                     </div>

//                     {/* Amount Display */}
//                     <div className="mb-6 text-center">
//                         <p className="text-sm text-gray-600">Amount to Pay</p>
//                         <p className="text-2xl font-bold text-orange-600">{amount || "unable to load the amount at the movement"}</p>
//                     </div>

//                     {/* Payment Options */}
//                     <div className="space-y-3">
//                         {paymentMethods.map((method) => (
//                             <button
//                                 key={method.id}
//                                 onClick={() => handleSelectMethod(method.id)}
//                                 className={`w-full flex items-center p-3 border-2 rounded-md ${selectedMethod === method.id
//                                         ? 'border-orange-500 bg-orange-50'
//                                         : 'border-gray-300 hover:border-orange-300'
//                                     } transition-colors duration-200`}
//                             >
//                                 <img
//                                     src={method.logo}
//                                     alt={method.name}
//                                     className="w-10 h-10 mr-4"
//                                 />
//                                 <span className="text-sm sm:text-base font-medium text-gray-800">
//                                     {method.name}
//                                 </span>
//                             </button>
//                         ))}
//                     </div>

//                     {/* Proceed Button */}
//                     <button
//                         onClick={() => {
//                             if (selectedMethod) {
//                                 navigate("/");
//                                 alert(`Proceeding with ${selectedMethod}`);
//                                 // Add your payment processing logic here
//                             } else {
//                                 alert('Please select a payment method');
//                             }
//                         }}
//                         className="w-full mt-6 bg-orange-500 text-white py-2 sm:py-3 rounded-md hover:bg-orange-600 transition-colors duration-200 text-sm sm:text-base font-medium"
//                     >
//                         Proceed to Pay
//                     </button>
//                 </div>
//             </div>
//         </div>
//     );
// }

// export default PaymentGateway;


import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import phonePeLogo from '../assets/phonepe.png'
import googlePayLogo from '../assets/gpay.png'
import paytmLogo from '../assets/paytm.png'
import cardLogo from '../assets/visacard.png'

// Sample logos (replace with actual image imports or URLs)
// const phonePeLogo = 'https://via.placeholder.com/40?text=PhonePe';
// const googlePayLogo = 'https://via.placeholder.com/40?text=GooglePay';
// const paytmLogo = 'https://via.placeholder.com/40?text=Paytm';
// const cardLogo = 'https://via.placeholder.com/40?text=Card';
const netBankingLogo = 'https://via.placeholder.com/40?text=NetBanking';

function PaymentGateway() {
    const location = useLocation();
    const navigate = useNavigate();
    const [selectedMethod, setSelectedMethod] = useState(null);
    const [paymentSuccess, setPaymentSuccess] = useState(false);
    const {totalValue, name, mobileNumber} = location?.state; // Assuming amount is passed in location.state.amount
    console.log("location", location.state);

    // Sample payment methods data
    const paymentMethods = [
        { id: 'phonepe', name: 'PhonePe', logo: phonePeLogo },
        { id: 'googlepay', name: 'Google Pay', logo: googlePayLogo },
        { id: 'paytm', name: 'Paytm', logo: paytmLogo },
        { id: 'card', name: 'Credit/Debit Card', logo: cardLogo },
        { id: 'netbanking', name: 'Net Banking', logo: netBankingLogo },
    ];

    // Generate a random order ID for demo purposes
    const generateOrderId = () => {
        return 'ORD' + Math.random().toString(36).substr(2, 9).toUpperCase();
    };

    // Handle payment method selection
    const handleSelectMethod = (methodId) => {
        setSelectedMethod(methodId);
        console.log(`Selected payment method: ${methodId}`);
    };

    // Handle payment submission
    const handlePayment = () => {
        if (selectedMethod) {
            // Simulate payment processing
            console.log("btoa", window.btoa("hello"));
            console.log("btoa object", window.btoa({totalValue: totalValue, name: name, mobileNumber: mobileNumber}));
            const encoded = window.btoa(JSON.stringify({totalValue: totalValue, name: name, mobileNumber: mobileNumber}));
            console.log("atob, object", JSON.parse(window.atob(encoded)));
            setPaymentSuccess(true);
        } else {
            alert('Please select a payment method');
        }
    };

    // Handle navigation to home
    const handleGoToHome = () => {
        navigate('/');
    };

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center">
            <div className="fixed inset-0 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-[400px] md:w-xl h-full sm:h-auto sm:rounded-lg z-30 overflow-y-auto transition-all duration-300">
                <div className="p-4 sm:p-6">
                    {!paymentSuccess ? (
                        <>
                            {/* Header */}
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-lg sm:text-xl font-semibold text-gray-800">
                                    Select Payment Method
                                </h2>
                            </div>

                            {/* Amount Display */}
                            <div className="mb-6 text-center">
                                <p className="text-sm text-gray-600">Amount to Pay</p>
                                <p className="text-2xl font-bold text-orange-600">
                                    {totalValue || "Unable to load the amount at the moment"}
                                </p>
                            </div>

                            {/* Payment Options */}
                            <div className="space-y-3">
                                {paymentMethods.map((method) => (
                                    <button
                                        key={method.id}
                                        onClick={() => handleSelectMethod(method.id)}
                                        className={`w-full flex items-center p-3 border-2 rounded-md ${
                                            selectedMethod === method.id
                                                ? 'border-orange-500 bg-orange-50'
                                                : 'border-gray-300 hover:border-orange-300'
                                        } transition-colors duration-200`}
                                    >
                                        <img
                                            src={method.logo}
                                            alt={method.name}
                                            className="w-10 h-10 mr-4"
                                        />
                                        <span className="text-sm sm:text-base font-medium text-gray-800">
                                            {method.name}
                                        </span>
                                    </button>
                                ))}
                            </div>

                            {/* Proceed Button */}
                            <button
                                onClick={handlePayment}
                                className="w-full mt-6 bg-orange-500 text-white py-2 sm:py-3 rounded-md hover:bg-orange-600 transition-colors duration-200 text-sm sm:text-base font-medium"
                            >
                                Proceed to Pay
                            </button>
                        </>
                    ) : (
                        <div className="text-center">
                            <h2 className="text-xl sm:text-2xl font-semibold text-green-600 mb-4">
                                Payment Successful!
                            </h2>
                            <p className="text-gray-700 mb-2">
                                Thank you for your payment.
                            </p>
                            <p className="text-gray-800 font-medium mb-6">
                                Order ID: {generateOrderId()}
                            </p>
                            <button
                                onClick={handleGoToHome}
                                className="w-full bg-orange-500 text-white py-2 sm:py-3 rounded-md hover:bg-orange-600 transition-colors duration-200 text-sm sm:text-base font-medium"
                            >
                                Go to Home
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default PaymentGateway;