
import React, { useEffect, useState } from 'react';
import { CiSearch } from 'react-icons/ci';
import Logo from '../assets/Logotfc.png';
import axios from 'axios';
import Biryani from "../assets/biryani/b2.jpg";
import { addItem, decrementItem, incrementItem, removeItem } from '../redux/reducers/cartSlice';
import { useDispatch, useSelector } from 'react-redux';
import { MdOutlineDeleteOutline } from "react-icons/md";
import { IoClose } from "react-icons/io5";
import { Backdrop, CircularProgress } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { API_PATH } from '../api/apiPath';

function Orders() {
    const [cardData, setCardData] = useState([]);
    const [menu, setMenu] = useState([]);
    const [selectCategory, setSelectCategory] = useState('');
    const [selectedFilter, setSelectedFilter] = useState('');
    const [openCartModel, setOpenCartModel] = useState(false);
    const dispatch = useDispatch();
    const cartData = useSelector((state) => state.cart);
    const [loading, setLoading] = useState(false);
    const [paymentLoading, setPaymentLoading] = useState(false);
    const [customerDetailsModel, setCustomerDetailsModel] = useState(false);
    const [customerName, setCustomerName] = useState('');
    const [customerMobileNumber, setCustomerMobileNumber] = useState('');
    const [customerNameError, setCustomerNameError] = useState('');
    const [customerMobileNumberError, setCustomerMobileNumberError] = useState('');
    const [customerEmail, setCustomerEmail] = useState('');
    const [isVariantModal, setIsVariantModal] = useState(false);
    const [selectedItem, setSelectedItem] = useState({});
    const [variations, setVariations] = useState([]);
    const [branch, setBranch] = useState('Kompelly');
    const navigate = useNavigate();

    useEffect(() => {
        if (selectCategory !== '') {
            const element = document.getElementById('forScroll');
            filterMenu();
        }
    }, [selectCategory]);

    useEffect(() => {
        if (selectedItem?.variants) {
            const variantArray = Object.entries(selectedItem.variants).map(
                ([name, price]) => ({
                    id: Date.now() + Math.random(),
                    name,
                    price,
                    status: true,
                    isNew: false, // Existing variations are not new
                })
            );
            setVariations(variantArray);
            // console.log("variantArray", Object.entries(selectedItem.variants).sort((a, b) => a[1] - b[1])[0][1])
        }
    }, [selectedItem]);

    useEffect(() => {
        setLoading(true);
        const fetchMenuCardData = async () => {
            try {
                const response = await axios.get(
                    `${API_PATH}api/admin/menu/filtered-by-category/1/null`,
                    {
                        headers: {
                            'Content-Type': 'application/json',
                            token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhZG1pbklkIjoxLCJtb2JpbGVudW1iZXIiOiIxMTExMTExMTExIiwicm9sZSI6ImFkbWluIiwicmVzdGF1cmFudERldGFpbHMiOnsiaWQiOjEsInJlc3RhdXJhbnRfbmFtZSI6IlRlbHVndSBGb29kIENMdWIiLCJjb250YWN0IjoiMTExMTExMTExMSIsImVtYWlsIjoiaW5mb0B0ZWx1Z3Vmb29kY2x1Yi5jb20iLCJwYW5fY2FyZCI6IkFCQ0RFMTIzNEYiLCJnc3RfbnVtYmVyIjoiR1NUMTIzNDVBQkMiLCJhZGRyZXNzIjoiMTIzIEZvb2QgU3QsIENpdHksIFN0YXRlIiwiYWRtaW5faWQiOjEsImNyZWF0ZWRfYXQiOiIyMDI1LTAyLTA2VDA2OjU2OjIxLjk3NFoifSwiaWF0IjoxNzQwOTc3MzkyfQ.D1iO2qvC9r6mnviz6nfsCUJLq9a4MWFUbpTNdeGWoRo',
                        },
                    }
                );
                if (response.status === 200) {
                    setCardData(response.data.data);
                    setSelectCategory(response.data.data[0].item_category);
                    setSelectedFilter(response.data.data[0].item_category);
                    setMenu(response.data.data[0].items);
                    // console.log("menu", response.data.data)
                }
            } catch (error) {
                console.error("error", error);
            } finally {
                setLoading(false);
            }
        };
        fetchMenuCardData();
    }, []);

    const filterMenu = () => {
        const updatedMenu = cardData.find((item) => item.item_category === selectCategory);
        setMenu([...(updatedMenu?.items || [])]);
    };

    const handleSearch = (e) => {
        const searchKey = e.target.value;
        if (searchKey !== '') {
            const updatedMenu = cardData.find((item) => item.item_category === selectCategory).items.filter((item) => item.title.toLowerCase().includes(searchKey.toLowerCase()));
            setMenu([...updatedMenu]);
        } else {
            const updatedMenu = cardData.find((item) => item.item_category === selectCategory);
            setMenu([...(updatedMenu?.items || [])]);
        }
    };

    const debounce = (func, delay) => {
        let timer;
        return function (...args) {
            clearTimeout(timer);
            timer = setTimeout(() => func(...args), delay);
        };
    };

    const debouncedSearch = debounce(handleSearch, 500);

    const onFilterHandler = (filteredItem) => {
        setSelectCategory(filteredItem);
        setSelectedFilter(filteredItem);
    };

    const customerDetails = () => {
        setCustomerDetailsModel(true);
        setOpenCartModel(false);
    };

    const submitHandler = async (e) => {
        e.preventDefault();
        setCustomerNameError('');
        setCustomerMobileNumberError('');

        const nameRegex = /^[a-zA-Z\s]{2,}$/;
        const mobileRegex = /^[0-9]{10}$/;

        let isValid = true;

        if (!nameRegex.test(customerName)) {
            setCustomerNameError("Please enter a valid name (letters only, min 2 characters)");
            isValid = false;
        }

        if (!mobileRegex.test(customerMobileNumber)) {
            setCustomerMobileNumberError("Please enter a valid 10-digit mobile number");
            isValid = false;
        }

        if (isValid) {
            setPaymentLoading(true);
            try {

                const response = await axios.post(`${API_PATH}api/admin/phonepay/order`,
                    {
                        mobilenumber: customerMobileNumber,
                        customer_name: customerName,
                        total_amount: (parseFloat(cartData.totalValue) + parseFloat((cartData.totalValue * 0.18).toFixed(2))),
                        order_status: 'PENDING',
                        order_items: cartData.cartItems,
                        order_type: `Online-${branch}`,
                        restaurant_id: 1,
                        payment_status: 'PENDING'
                    }
                );
                // console.log("phonepeResponse", response);
                if (response.status === 200) {
                    window.localStorage.setItem("orderdetails", JSON.stringify(response.data.result));
                    window.open(response.data.result.redirectUrl);
                }

            } catch (error) {
                console.log("error1", error);
            } finally {
                setPaymentLoading(false);
            }

        }
    };

    const createCustomer = async (data) => {
        try {
            const response = await axios.post(`${API_PATH}api/customer/create`,
                {
                    "customer_name": data.customerName,
                    "mobile_number": data.customerMobileNumber
                }
            );
            if (response.status === 201) {
                // Handle successful customer creation
            }
        } catch (error) {
            console.log("error", error.response);
        }
    };
    const handleBranchChange = (e) => {
        setBranch(e.target.value);
        console.log("Selected branch:", e.target.value); // You can use it anywhere now
    };

    return (
        <div className='min-h-screen bg-white' onClick={(e) => {
            setOpenCartModel(false);
        }} >
            {/* Header Section - Mobile Optimized */}
            <div className='w-full fixed top-0 shadow-md z-10'>
                <div className='h-1 w-full bg-orange-400'></div>
                <div className='bg-white px-4 py-3'>
                    {/* Logo and Branch Selection - Mobile Stacked */}
                    <div className='flex flex-col space-y-3 mb-4'>
                        <div className='flex items-center justify-between'>
                            <div className='flex items-center'>
                                <img src={Logo} className='w-12 h-12' alt='Logo' />
                                <div className='ml-3'>
                                    <h1 className='text-lg font-semibold text-gray-800'>Telugu Food Club</h1>
                                </div>
                            </div>
                            {/* Cart Button - Top Right */}
                            <div className='relative'>
                                {cartData?.cartItems?.length > 0 && (
                                    <span className='absolute -top-2 -right-2 bg-red-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center'>
                                        {cartData.cartItems.length}
                                    </span>
                                )}
                                <button
                                    className='bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 text-sm transition-colors duration-200'
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setOpenCartModel(!openCartModel);
                                        setCustomerDetailsModel(false);
                                    }}
                                >
                                    Cart ({cartData.cartItems?.length || 0})
                                </button>
                            </div>
                        </div>
                        
                        {/* Branch Selection - Full Width */}
                        <select
                            value={branch}
                            onChange={handleBranchChange}
                            className="w-full p-3 border-2 border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-orange-400 transition text-base"
                        >
                            <option value="Kompally">Kompally</option>
                            <option value="Dhullapally">Dhullapally</option>
                        </select>
                    </div>

                    {/* Search Bar - Full Width */}
                    <div className='flex items-center border-2 border-gray-300 rounded-lg w-full'>
                        <CiSearch className='text-gray-500 ml-3' size={20} />
                        <input
                            className='p-3 outline-none w-full text-base'
                            type='text'
                            placeholder='Search for items...'
                            onChange={(e) => debouncedSearch(e)}
                        />
                    </div>
                </div>
            </div>

            {/* Main Content - Mobile Optimized */}
            <div className='mt-32 flex flex-col lg:flex-row lg:p-4'>
                {loading ? (
                    <Backdrop
                        sx={(theme) => ({ color: '#fff', zIndex: theme.zIndex.drawer + 1 })}
                        open={loading}
                    >
                        <CircularProgress color="inherit" />
                    </Backdrop>
                ) : (
                    <>
                        {/* Category Filters - Horizontal Scroll on Mobile, Vertical on Desktop */}
                        <div className='w-full lg:w-64 p-4 lg:pb-20 bg-white lg:fixed lg:h-[calc(100vh-5rem)] lg:overflow-y-auto lg:border-r lg:border-gray-200'>
                            <h1 className='text-lg font-semibold mb-4 lg:mb-5'>Menu Categories</h1>
                            <div className='lg:hidden'>
                                {/* Mobile: Horizontal Scroll */}
                                <div className='flex space-x-3 overflow-x-auto pb-2 scrollbar-hide'>
                                    {cardData?.map((filter) => (
                                        !["Veg Pickles", "Sweets", "Snacks", "Roti & Chapathi", "Meals", "NonVeg Pickles"].includes(filter.item_category) &&
                                        <button
                                            key={filter.item_category}
                                            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${
                                                selectedFilter === filter.item_category
                                                    ? 'bg-orange-500 text-white'
                                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                            }`}
                                            onClick={() => onFilterHandler(filter.item_category)}
                                        >
                                            {filter.item_category}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className='hidden lg:block'>
                                {/* Desktop: Vertical List */}
                                <ul className='space-y-3'>
                                    {cardData?.map((filter) => (
                                        !["Veg Pickles", "Sweets", "Snacks", "Roti & Chapathi", "Meals", "NonVeg Pickles"].includes(filter.item_category) &&
                                        <li
                                            key={filter.item_category}
                                            className={`font-sans text-lg font-medium cursor-pointer p-3 rounded-lg transition-colors ${
                                                selectedFilter === filter.item_category
                                                    ? 'bg-gray-100 border-l-4 border-orange-500 text-orange-600'
                                                    : 'hover:bg-gray-50 text-gray-800'
                                            }`}
                                            onClick={() => onFilterHandler(filter.item_category)}
                                        >
                                            {filter.item_category}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        {/* Customer Details Modal - Mobile Optimized */}
                        {customerDetailsModel && (
                            <>
                                <div
                                    className="fixed inset-0 bg-gray-300 bg-opacity-50 z-20"
                                    onClick={() => setCustomerDetailsModel(false)}
                                ></div>

                                <div className="fixed inset-0 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 w-full sm:w-[450px] h-full sm:h-auto bg-white sm:rounded-lg shadow-xl z-30 overflow-y-auto">
                                    <div className="p-4 sm:p-6">
                                        <div className="flex justify-between items-center mb-4">
                                            <h2 className="text-xl font-semibold text-gray-800">Confirm Your Order</h2>
                                            <button
                                                onClick={() => setCustomerDetailsModel(false)}
                                                className="text-gray-500 hover:text-gray-700 p-1"
                                            >
                                                <IoClose size={24} />
                                            </button>
                                        </div>

                                        <form onSubmit={submitHandler} className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                                                <input
                                                    className="w-full p-3 border-2 rounded-lg border-gray-300 outline-none focus:border-orange-500 transition-colors text-base"
                                                    type="text"
                                                    value={customerName}
                                                    onChange={(e) => setCustomerName(e.target.value)}
                                                    placeholder="Enter your name"
                                                    required
                                                />
                                                {customerNameError && (
                                                    <span className="text-red-500 text-sm mt-1 block">
                                                        {customerNameError}
                                                    </span>
                                                )}
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number *</label>
                                                <input
                                                    className="w-full p-3 border-2 rounded-lg border-gray-300 outline-none focus:border-orange-500 transition-colors text-base"
                                                    type="tel"
                                                    maxLength={10}
                                                    value={customerMobileNumber}
                                                    onChange={(e) => setCustomerMobileNumber(e.target.value)}
                                                    placeholder="Enter mobile number"
                                                    required
                                                />
                                                {customerMobileNumberError && (
                                                    <span className="text-red-500 text-sm mt-1 block">
                                                        {customerMobileNumberError}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Order Summary */}
                                            <div className="mt-6 border-t pt-4">
                                                <h3 className="text-lg font-semibold text-gray-700 mb-3">Order Summary</h3>
                                                <div className="space-y-2">
                                                    {cartData.cartItems.map((item) => (
                                                        <div
                                                            key={item.item_id}
                                                            className="flex justify-between items-center py-2 border-b border-gray-100"
                                                        >
                                                            <div className="flex-1">
                                                                <p className="text-sm text-gray-800">{item.title}</p>
                                                                <p className="text-xs text-gray-500">{item.variant}</p>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="text-sm font-medium text-gray-800">
                                                                    ₹{item.price * item.quantity}
                                                                </p>
                                                                <p className="text-xs text-gray-600">Qty: {item.quantity}</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="mt-4 space-y-2">
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-gray-600">Subtotal:</span>
                                                        <span className="font-medium text-gray-800">₹{cartData.totalValue}</span>
                                                    </div>
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-gray-600">GST (18%):</span>
                                                        <span className="font-medium text-gray-800">
                                                            ₹{(cartData.totalValue * 0.18).toFixed(2)}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between text-base font-semibold pt-2 border-t">
                                                        <span className="text-gray-700">Grand Total:</span>
                                                        <span className="text-orange-600">
                                                            ₹{(parseFloat(cartData.totalValue) + parseFloat((cartData.totalValue * 0.18).toFixed(2))).toFixed(2)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <button
                                                type="submit"
                                                className="w-full bg-orange-500 text-white py-3 rounded-lg hover:bg-orange-600 transition-colors duration-200 text-base font-medium mt-6"
                                                disabled={paymentLoading}
                                            >
                                                {paymentLoading ? "Processing..." : "Confirm & Pay"}
                                            </button>
                                        </form>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Menu Items - Mobile Optimized Grid */}
                        <div className="flex-1 p-4 lg:ml-64 overflow-y-auto bg-gray-50 min-h-screen">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {menu?.map((item) => (
                                    <div
                                        key={item.item_id}
                                        className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-200 p-4 flex flex-col justify-between min-h-[200px]"
                                    >
                                        <div className="flex flex-col h-full">
                                            {/* Item Image */}
                                            <div className="flex justify-center mb-3">
                                                {item.image_url ? (
                                                    <img
                                                        src={item.image_url}
                                                        className="w-24 h-24 sm:w-28 sm:h-28 object-cover rounded-lg shadow-sm"
                                                        alt={item.title}
                                                    />
                                                ) : (
                                                    <div className="w-24 h-24 sm:w-28 sm:h-28 bg-gray-200 flex items-center justify-center text-gray-500 rounded-lg text-sm">
                                                        No Image
                                                    </div>
                                                )}
                                            </div>
                                            
                                            {/* Item Details */}
                                            <div className="flex-1 flex flex-col">
                                                <h4 className="text-base sm:text-lg font-semibold text-gray-800 mb-1 line-clamp-2">{item.title}</h4>
                                                <p className="text-sm text-gray-500 mb-2">{item.variant}</p>
                                                <p className="text-base font-semibold text-green-600 mb-3">
                                                    {Object.entries(item.variants).length > 0
                                                        ? `₹${Object.entries(item.variants).sort((a, b) => a[1] - b[1])[0][1]}`
                                                        : 'Price Unavailable'}
                                                </p>
                                                
                                                {/* Add Button */}
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedItem(item);
                                                        setIsVariantModal(true);
                                                    }}
                                                    className="mt-auto w-full bg-orange-500 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors duration-200"
                                                >
                                                    Add to Cart
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Variant Modal - Mobile Optimized */}
                            {isVariantModal && (
                                <div
                                    onClick={() => setIsVariantModal(false)}
                                    className="fixed inset-0 z-50 bg-black bg-opacity-50 flex justify-center items-center p-4"
                                >
                                    <div
                                        onClick={(e) => e.stopPropagation()}
                                        className="bg-white w-full max-w-md rounded-xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto"
                                    >
                                        <div className="flex justify-between items-center">
                                            <h3 className="text-lg font-bold text-gray-800">
                                                {selectedItem?.title || 'Dish Name'}
                                            </h3>
                                            <button
                                                onClick={() => setIsVariantModal(false)}
                                                className="text-gray-500 hover:text-gray-700 p-1"
                                            >
                                                <IoClose size={20} />
                                            </button>
                                        </div>

                                        {/* Variant Options */}
                                        <div className="space-y-3">
                                            {variations.map((variant, index) => {
                                                const cartItem = cartData.cartItems.find(
                                                    (cart) => cart.item_id === selectedItem.item_id && cart.variant === variant.name
                                                );

                                                return (
                                                    <div
                                                        key={index}
                                                        className="flex justify-between items-center bg-gray-50 p-4 rounded-lg"
                                                    >
                                                        <div>
                                                            <p className="font-medium text-gray-800">{variant.name}</p>
                                                            <p className="text-sm text-gray-500">₹{variant.price}</p>
                                                        </div>

                                                        {cartItem ? (
                                                            <div className="flex items-center gap-3">
                                                                <button
                                                                    className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center hover:bg-gray-300 transition-colors"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        dispatch(
                                                                            decrementItem({
                                                                                ...selectedItem,
                                                                                variant: variant.name,
                                                                                price: variant.price,
                                                                            })
                                                                        );
                                                                    }}
                                                                >
                                                                    −
                                                                </button>
                                                                <span className="w-8 text-center font-medium">{cartItem.quantity}</span>
                                                                <button
                                                                    className="w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center hover:bg-orange-600 transition-colors"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        dispatch(
                                                                            incrementItem({
                                                                                ...selectedItem,
                                                                                variant: variant.name,
                                                                                price: variant.price,
                                                                            })
                                                                        );
                                                                    }}
                                                                >
                                                                    +
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    dispatch(
                                                                        addItem({
                                                                            ...selectedItem,
                                                                            variant: variant.name,
                                                                            price: variant.price,
                                                                        })
                                                                    );
                                                                }}
                                                                className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 text-sm font-medium transition-colors"
                                                            >
                                                                Add
                                                            </button>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Cart Modal - Mobile Optimized */}
                        <div
                            className={`fixed inset-0 z-20 transition-all duration-300 ${
                                openCartModel ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                            }`}
                        >
                            <div
                                className={`fixed inset-0 bg-black bg-opacity-50 transition-opacity duration-300 ${
                                    openCartModel ? 'opacity-100' : 'opacity-0'
                                }`}
                                onClick={() => setOpenCartModel(false)}
                            ></div>
                            
                            <div
                                className={`fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl transition-transform duration-300 transform ${
                                    openCartModel ? 'translate-y-0' : 'translate-y-full'
                                } max-h-[85vh] overflow-hidden`}
                            >
                                <div className='p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center'>
                                    <div>
                                        <h2 className='text-lg font-semibold text-gray-800'>Your Cart</h2>
                                        <p className='text-sm text-gray-600'>{cartData.cartItems?.length} Items</p>
                                    </div>
                                    <button 
                                        onClick={() => setOpenCartModel(false)} 
                                        className='p-2 hover:bg-gray-200 rounded-full transition-colors'
                                    >
                                        <IoClose size={20} />
                                    </button>
                                </div>
                                
                                <div className='max-h-[60vh] overflow-y-auto p-4 space-y-3'>
                                    {cartData.cartItems?.length > 0 ? (
                                        cartData.cartItems.map((item) => (
                                            <div
                                                key={item.item_id + item.variant}
                                                className='flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors duration-150'
                                            >
                                                <img
                                                    src={Biryani}
                                                    className='w-16 h-16 object-cover rounded-lg flex-shrink-0'
                                                    alt={item.title}
                                                />
                                                <div className='flex-1 min-w-0'>
                                                    <p className='text-sm font-medium text-gray-800 truncate'>{item.title}</p>
                                                    <p className='text-xs text-gray-500'>{item.variant}</p>
                                                    <p className='text-sm font-semibold text-orange-600'>₹{item.price * item.quantity}</p>
                                                </div>
                                                <div className='flex items-center gap-2'>
                                                    <button
                                                        className='w-8 h-8 flex items-center justify-center bg-gray-200 rounded-full text-gray-700 hover:bg-gray-300 transition-colors'
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            dispatch(decrementItem(item))
                                                        }}
                                                    >
                                                        -
                                                    </button>
                                                    <span className='w-8 text-center text-sm font-medium'>{item.quantity}</span>
                                                    <button
                                                        className='w-8 h-8 flex items-center justify-center bg-orange-500 text-white rounded-full hover:bg-orange-600 transition-colors'
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            dispatch(incrementItem(item))
                                                        }}
                                                    >
                                                        +
                                                    </button>
                                                    <button
                                                        className='w-8 h-8 flex items-center justify-center text-gray-700 rounded-full hover:text-orange-600 transition-colors'
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            dispatch(removeItem({ "id": item.item_id, "variant": item.variant }))
                                                        }}
                                                    >
                                                        <MdOutlineDeleteOutline className='w-4 h-4' />
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className='p-8 text-center text-gray-500'>
                                            <div className='text-4xl mb-2'>🛒</div>
                                            <p className='text-lg'>Your cart is empty</p>
                                            <p className='text-sm'>Add some delicious items to get started!</p>
                                        </div>
                                    )}
                                </div>
                                
                                {cartData.cartItems?.length > 0 && (
                                    <div className='p-4 bg-gray-50 border-t border-gray-200 space-y-3'>
                                        <div className='flex justify-between items-center'>
                                            <span className='text-gray-700 font-medium'>Subtotal:</span>
                                            <span className='text-base font-semibold text-gray-800'>
                                                ₹{cartData.totalValue}
                                            </span>
                                        </div>
                                        <div className='flex justify-between items-center'>
                                            <span className='text-gray-700 font-medium'>GST (18%):</span>
                                            <span className='text-base font-semibold text-gray-800'>
                                                ₹{(cartData.totalValue * 0.18).toFixed(2)}
                                            </span>
                                        </div>
                                        <div className='flex justify-between items-center pt-2 border-t border-gray-300'>
                                            <span className='text-gray-700 font-medium text-lg'>Grand Total:</span>
                                            <span className='text-lg font-bold text-orange-600'>
                                                ₹{(parseFloat(cartData.totalValue) + parseFloat((cartData.totalValue * 0.18).toFixed(2))).toFixed(2)}
                                            </span>
                                        </div>
                                        <button 
                                            onClick={() => customerDetails()} 
                                            className='w-full bg-orange-500 text-white py-3 rounded-lg hover:bg-orange-600 transition-colors duration-200 font-medium text-base'
                                        >
                                            Proceed to Checkout
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

export default Orders;