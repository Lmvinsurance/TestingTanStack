import { Outlet, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { CustomerLayout } from "@/components/customer/CustomerLayout";

const CUSTOMER_PATHS = ["/customer/menu", "/customer/outlets", "/customer/my-orders", "/customer/item-detail", "/customer/order-detail", "/cart"];

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0 });
  }, [pathname]);
  return null;
}

function ShellSwitch({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const isCustomerShell = CUSTOMER_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
  if (isCustomerShell) return <CustomerLayout>{children}</CustomerLayout>;
  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <>
      <ScrollToTop />
      <ShellSwitch>
        <Outlet />
      </ShellSwitch>
      <Toaster />
    </>
  );
}
