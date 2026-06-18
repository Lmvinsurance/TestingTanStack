import { createSlice } from "@reduxjs/toolkit";

const calculateTotal = (cartItems) => {
    return cartItems.reduce((total, item) => total + item.price * item.quantity, 0);
}

export const cartSlice = createSlice({
    name: "cart",
    initialState: {
        cartItems: [],
        totalValue: 0,
        loading: false,
        error: '',
    },
    reducers: {
        addItem: (state, action) => {
            if (!state.cartItems.find((item) => item.item_id === action.payload.item_id && item.variant === action.payload.variant)) {
                state.cartItems = [...state.cartItems, {...action.payload, quantity: 1, description: ""}];
                state.totalValue = calculateTotal(state.cartItems);
            } else {
                alert("Item alredy added to the cart");
            }
        },
        incrementItem: (state, action) => {
            const { item_id, quantity, price, totalPrice } = action.payload;
            state.cartItems = state.cartItems.map((item) =>
                (item.item_id === item_id && item.variant === action.payload.variant) ? { ...item, quantity: item.quantity + 1, price: price, totalPrice: totalPrice } : item,
            );
            state.totalValue = calculateTotal(state.cartItems);
        },
        decrementItem: (state, action) => {
            const { item_id, quantity, price, totalPrice } = action.payload;

            // Map through cartItems and handle decrement or removal
            state.cartItems = state.cartItems
                .map((item) => {
                    if (item.item_id === item_id && item.variant === action.payload.variant) {
                        const newQuantity = item.quantity - 1;
                        if (newQuantity < 1) {
                            // Return null or undefined to filter out later
                            return null;
                        }
                        return { ...item, quantity: newQuantity, price: price };
                    }
                    return item;
                })
                .filter(Boolean); // Remove null/undefined items (i.e., items with quantity < 1)

            // Recalculate total value
            state.totalValue = calculateTotal(state.cartItems);
        },
        removeItem: (state, action) => {
            // console.log(action.payload);
            const { id, variant } = action.payload;
            state.cartItems = state.cartItems.filter((item) => (item.item_id !== parseInt(id) || item.variant!==variant));
            state.totalValue = calculateTotal(state.cartItems);
        },
    },
});


export const { addItem, incrementItem, decrementItem, removeItem } = cartSlice.actions
export default cartSlice.reducer