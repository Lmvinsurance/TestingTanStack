import { Routes, Route } from "react-router-dom";
import React, { Suspense } from "react";

// Layouts / Root
import RootLayout from "./pages/__root";
import AdminPaymentTest from "@/pages/admin.payment-test";
import PaymentConfirmation from "@/pages/admin/PaymentConfirmation";
import AdminOrderStatus from "@/pages/admin/AdminOrderStatus"; // This should now work

// Pages
import Index from "./pages/index";
import Brands from "./pages/brands";
import Cart from "./pages/cart";

// Admin routes
import AdminLogin from "./pages/admin.login";
import AdminDashboard from "./pages/admin.dashboard";
import AdminBrands from "./pages/admin.addons";
import AdminCategories from "./pages/admin.categories";
import AdminItems from "./pages/admin.items";
import AdminOrders from "./pages/admin.orders";
import AdminItemDetails from "./pages/admin.items";
import AdminWalkin from "./pages/admin.walkin";
import AdminCustomers from "./pages/admin.customers";
import AdminOutlets from "./pages/admin.outlets";
import AdminSubcategories from "./pages/admin.subcategories";
import AdminVariants from "./pages/admin.variants";
import AdminAddons from "./pages/admin.addons";
import AdminCuisines from "./pages/admin.cuisines";
import AdminDietary from "./pages/admin.dietary";
import AdminImages from "./pages/admin.images";
import AdminPricing from "./pages/admin.pricing";
import AdminAvailability from "./pages/admin.availability";
import AdminPayments from "./pages/admin.payments";
import AdminInvoices from "./pages/admin.invoices";
import AdminReports from "./pages/admin.reports";
import AdminBulkUpload from "./pages/admin.bulk-upload";

// Customer routes
import CustomerSignin from "./pages/customer.signin";
import CustomerSignup from "./pages/customer.signup";
import { CustomerMenuPage } from "./components/CustomerMenuPage";
import CustomerCheckout from "./pages/checkout";
import CustomerOrders from "./pages/customer.my-orders";
import CustomerOrderDetail from "./pages/customer.order-detail.$orderId";
import CustomerOutlets from "./pages/customer.outlets";
import PaymentStatus from "./pages/payment-status";
import AdminInvoice from "./pages/admin.invoice.$orderId";

// Sub-routes for items
import CustomerItemDetails from "./pages/customer.item-detail.$itemId";

import { AdminLayout } from "./components/admin/AdminLayout";
import { CustomerLayout } from "./components/customer/CustomerLayout";
import { Outlet } from "react-router-dom";

function AdminLayoutWrapper() {
  return (
    <AdminLayout>
      <Outlet />
    </AdminLayout>
  );
}

function CustomerLayoutWrapper() {
  return (
    <CustomerLayout>
      <Outlet />
    </CustomerLayout>
  );
}

export default function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Routes>
        <Route element={<RootLayout />}>
          <Route path="/" element={<Index />} />
          <Route path="/brands" element={<Brands />} />
          
          <Route path="/admin/login" element={<AdminLogin />} />
          
          <Route element={<AdminLayoutWrapper />}>
            {/* Payment Routes */}
            <Route path="/admin/payment-test" element={<AdminPaymentTest />} />
            <Route path="/admin/payment-confirmation" element={<PaymentConfirmation />} />
            <Route path="/admin/order-status/:orderId" element={<AdminOrderStatus />} />
            
            {/* Other Admin Routes */}
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/brands" element={<AdminBrands />} />
            <Route path="/admin/categories" element={<AdminCategories />} />
            <Route path="/admin/items" element={<AdminItems />} />
            <Route path="/admin/orders" element={<AdminOrders />} />
            <Route path="/admin/item/:id" element={<AdminItemDetails />} />
            <Route path="/admin/walkin" element={<AdminWalkin />} />
            <Route path="/admin/customers" element={<AdminCustomers />} />
            <Route path="/admin/outlets" element={<AdminOutlets />} />
            <Route path="/admin/subcategories" element={<AdminSubcategories />} />
            <Route path="/admin/variants" element={<AdminVariants />} />
            <Route path="/admin/addons" element={<AdminAddons />} />
            <Route path="/admin/cuisines" element={<AdminCuisines />} />
            <Route path="/admin/dietary" element={<AdminDietary />} />
            <Route path="/admin/images" element={<AdminImages />} />
            <Route path="/admin/pricing" element={<AdminPricing />} />
            <Route path="/admin/availability" element={<AdminAvailability />} />
            <Route path="/admin/payments" element={<AdminPayments />} />
            <Route path="/admin/invoices" element={<AdminInvoices />} />
            <Route path="/admin/reports" element={<AdminReports />} />
            <Route path="/admin/bulk-upload" element={<AdminBulkUpload />} />
          </Route>
          
          {/* Customer routes with layout */}
          <Route element={<CustomerLayoutWrapper />}>
            <Route path="/cart" element={<Cart />} />
            <Route path="/customer/signin" element={<CustomerSignin />} />
            <Route path="/customer/signup" element={<CustomerSignup />} />
            <Route path="/customer/checkout" element={<CustomerCheckout />} />
            <Route path="/customer/orders" element={<CustomerOrders />} />
            <Route path="/customer/profile" element={<CustomerOrders />} />
            <Route path="/customer/outlets" element={<CustomerOutlets />} />
            <Route path="/customer/item/:id" element={<CustomerItemDetails />} />
            <Route path="/customer/order/:orderId" element={<CustomerOrderDetail />} />
            <Route path="/payment-status" element={<PaymentStatus />} />
            <Route path="/customer/menu" element={<CustomerMenuPage />} />
          </Route>
          
          <Route path="/admin/invoice/:orderId" element={<AdminInvoice />} />
        </Route>
      </Routes>
    </Suspense>
  );
}