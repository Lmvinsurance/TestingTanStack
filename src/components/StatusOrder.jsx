// import React, { useEffect, useState } from 'react'
// import CircularProgress from '@mui/material/CircularProgress';
// import Box from '@mui/material/Box';
// import axios from 'axios';
// import { API_PATH } from '../api/apiPath';
// import { Typography } from '@mui/material';

// function OrderStatus() {
//     const [loading, setLoading] = useState(false);

//     useEffect(() => {
//         fetchOrderStatus();
//     }, [])

//     const fetchOrderStatus = async () => {
//         setLoading(true);
//         try {
//             const orderDetails = JSON.parse(window.localStorage.getItem('orderdetails'));
//             console.log("details",);
//             const response = await axios.get(`${API_PATH}api/admin/phonepay/order-status/${orderDetails.order.order_id}`,
//                 {
//                     headers: {
//                         "Content-Type": "application/json",
//                         token: orderDetails.token
//                     }
//                 }
//             );
//             console.log("status", response);
//             if (response.status === 200) {

//             }


//         } catch (error) {
//             console.log("error", error.response)
//         } finally {
//             setLoading(false);
//         }
//     }
//     return (
//         <div style={{ display: 'flex', width: '100vw', height: '100vh', alignItems: 'center', justifyContent: 'center' }} >
//             {
//                 loading ?
//                     <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
//                         <CircularProgress />
//                         <Typography variant={'caption'} > Please Wait a moment while we process you order. </Typography>
//                     </Box> :
//                     <div>
//                         <p>Details Fetched</p>
//                     </div>
//             }
//         </div>
//     )
// }

// export default OrderStatus


import React, { useEffect, useState } from 'react';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import axios from 'axios';
import { API_PATH } from '../api/apiPath';
import { Link } from 'react-router-dom';
import { CheckCircle, Cancel, HourglassEmpty } from '@mui/icons-material'; // Material-UI icons

function OrderStatus() {
    const [loading, setLoading] = useState(false);
    const [orderData, setOrderData] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchOrderStatus();
    }, []);

    const fetchOrderStatus = async () => {
        setLoading(true);
        setError(null);
        try {
            const orderDetails = JSON.parse(window.localStorage.getItem('orderdetails'));
            if (!orderDetails?.order?.order_id || !orderDetails?.token) {
                throw new Error('Missing order details or token in local storage');
            }
            console.log(orderDetails,"orderDetails");
            console.log("token",orderDetails?.token)
            const response = await axios.get(
                `${API_PATH}api/admin/phonepay/orderstatus/${orderDetails.order.order_id}`,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        token: orderDetails.token,
                    },
                }
            );

            if (response.status === 200 && response.data?.data) {
                setOrderData(response.data.data);
            } else {
                throw new Error('Invalid response from server');
            }
        } catch (error) {
            setError(error.response?.data?.message || error.message || 'Failed to fetch order status');
        } finally {
            setLoading(false);
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'COMPLETED':
                return <CheckCircle sx={{ color: 'success.main', ml: 1 }} />;
            case 'FAILED':
                return <Cancel sx={{ color: 'error.main', ml: 1 }} />;
            case 'PENDING':
                return <HourglassEmpty sx={{ color: 'warning.main', ml: 1 }} />;
            default:
                return null;
        }
    };

    return (
        <Box
            sx={{
                minHeight: '100vh',
                bgcolor: '#f5f5f5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                p: 2, // Padding for smaller screens
            }}
        >
            {loading ? (
                <Box sx={{ textAlign: 'center' }}>
                    <CircularProgress size={50} sx={{ mb: 2 }} />
                    <Typography variant="body1" color="text.secondary">
                        Processing your order, please wait...
                    </Typography>
                </Box>
            ) : error ? (
                <Alert
                    severity="error"
                    sx={{ maxWidth: '500px', width: '100%', m: 2 }}
                    action={
                        <>
                            <Button color="inherit" size="small" onClick={fetchOrderStatus}>
                                Retry
                            </Button>
                            <Link to='/' >
                                <Button color="inherit" size="small" >
                                    go to home
                                </Button>
                            </Link>
                        </>
                    }
                >
                    {error}
                </Alert>
            ) : orderData ? (
                <Card sx={{ maxWidth: '600px', width: '100%', m: 2, boxShadow: 3 }}>
                    <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                            <Typography variant="h5" component="h1">
                                Order Status: {orderData.payment_status}
                            </Typography>
                            {getStatusIcon(orderData.payment_status)}
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                            Order ID: {orderData.order_id}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Total Amount: ₹{orderData.total_amount}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            Order Date: {new Date(orderData.order_date).toLocaleString()}
                        </Typography>

                        <Typography variant="h6" sx={{ mb: 1 }}>
                            Items Ordered:
                        </Typography>
                        <List dense sx={{ bgcolor: '#fafafa', borderRadius: 1 }}>
                            {orderData.order_items.map((item) => (
                                <ListItem key={item.item_id}>
                                    <ListItemText
                                        primary={
                                            <Typography variant="subtitle2">
                                                {item.title} ({item.variant})
                                            </Typography>
                                        }
                                        secondary={
                                            <Typography variant="caption" color="text.secondary">
                                                ₹{item.price} x {item.quantity} - {item.description}
                                            </Typography>
                                        }
                                    />
                                </ListItem>
                            ))}
                        </List>

                        <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
                            <Button variant="contained" component={Link} to="/" color="primary">
                                Go to Home
                            </Button>
                            <Button variant="outlined" component={Link} to="/orders" color="primary">
                                View Orders
                            </Button>
                        </Stack>
                    </CardContent>
                </Card>
            ) : (
                <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
                        No order data available.
                    </Typography>
                    <Stack direction="row" spacing={2} justifyContent="center">
                        <Button variant="contained" component={Link} to="/" color="primary">
                            Go to Home
                        </Button>
                        <Button variant="outlined" component={Link} to="/orders" color="primary">
                            View Orders
                        </Button>
                    </Stack>
                </Box>
            )}
        </Box>
    );
}

export default OrderStatus;
