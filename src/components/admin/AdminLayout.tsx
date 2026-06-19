import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, ShoppingBag, Utensils, Users, Store, Tag, Layers,
  Leaf, Soup, Sliders, DollarSign, PackageCheck, Image as ImageIcon,
  CreditCard, Receipt, BarChart3, Plus, LogOut, ChefHat, ConciergeBell,
  Upload, Smartphone,
} from "lucide-react";
import type { ReactNode } from "react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarProvider, SidebarTrigger, useSidebar,
} from "@/components/ui/sidebar";
import { adminSignOut } from "@/lib/auth-helpers";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import kostaLogo from "@/assets/kosta-rajula-ruchulu-logo.asset.json";

const NAV_GROUPS = [
  {
    label: "Overview",
    items: [
      { title: "Dashboard", to: "/admin/dashboard", icon: LayoutDashboard },
      { title: "Orders", to: "/admin/orders", icon: ShoppingBag },
      { title: "Walk-in Order", to: "/admin/walkin", icon: ConciergeBell },
      { title: "Customers", to: "/admin/customers", icon: Users },
      { title: "Outlets", to: "/admin/outlets", icon: Store },
    ],
  },
  {
    label: "Menu",
    items: [
      { title: "Items", to: "/admin/items", icon: Utensils },
      { title: "Categories", to: "/admin/categories", icon: Tag },
      { title: "Subcategories", to: "/admin/subcategories", icon: Layers },
      { title: "Variants", to: "/admin/variants", icon: Sliders },
      { title: "Add-ons", to: "/admin/addons", icon: Plus },
      { title: "Cuisines", to: "/admin/cuisines", icon: ChefHat },
      { title: "Dietary", to: "/admin/dietary", icon: Leaf },
      { title: "Images", to: "/admin/images", icon: ImageIcon },
    ],
  },
  {
    label: "Operations",
    items: [
      { title: "Pricing", to: "/admin/pricing", icon: DollarSign },
      { title: "Availability", to: "/admin/availability", icon: PackageCheck },
      { title: "Payments", to: "/admin/payments", icon: CreditCard },
      { title: "Invoices", to: "/admin/invoices", icon: Receipt },
      { title: "Reports", to: "/admin/reports", icon: BarChart3 },
      { title: "Bulk Upload", to: "/admin/bulk-upload", icon: Upload },
      { title: "Payment Test", to: "/admin/payment-test", icon: Smartphone },
    ],
  },
] as const;

function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await adminSignOut();
    toast.success("Signed out");
    navigate("/admin/login", { replace: true });
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-gold/20">
      <SidebarHeader className="border-b border-gold/20 bg-cream">
        <Link to="/admin/dashboard" className="flex items-center gap-2 px-2 py-2">
          <div className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-xl bg-cream ring-1 ring-gold/30">
            <img src={kostaLogo.url} alt="Kosta Rajula Ruchulu" className="h-full w-full object-cover" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-display truncate text-sm leading-tight text-maroon">KRR Admin</p>
              <p className="truncate text-[10px] text-maroon-deep/60">Telugu Food Club</p>
            </div>
          )}
        </Link>
      </SidebarHeader>
      <SidebarContent className="bg-cream">
        {NAV_GROUPS.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className="text-maroon-deep/60">{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const active = pathname === item.to;
                  const isTest = item.title === "Payment Test";
                  return (
                    <SidebarMenuItem key={item.to}>
                      <SidebarMenuButton asChild isActive={active}>
                        <Link
                          to={item.to}
                          className={`flex items-center gap-2 ${active ? "bg-saffron/15 text-maroon" : "text-maroon-deep/80 hover:bg-saffron/10"}`}
                        >
                          <item.icon className="h-4 w-4 shrink-0" />
                          {!collapsed && (
                            <>
                              <span className="truncate">{item.title}</span>
                              {isTest && (
                                <span className="ml-auto text-[10px] bg-blue-500 text-white px-1.5 py-0.5 rounded">
                                  Test
                                </span>
                              )}
                            </>
                          )}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={handleSignOut} className="text-maroon hover:bg-saffron/10">
                  <LogOut className="h-4 w-4 shrink-0" />
                  {!collapsed && <span>Sign out</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

export function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <div className="admin-surface flex min-h-screen w-full bg-cream">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-12 items-center gap-2 border-b border-gold/20 bg-cream/95 px-3 backdrop-blur md:hidden">
            <SidebarTrigger className="text-maroon" />
            <Link to="/admin/dashboard" className="flex items-center gap-2 text-display truncate text-sm text-maroon">
              <img src={kostaLogo.url} alt="KRR" className="h-7 w-7 rounded-md object-cover ring-1 ring-gold/30" />
              <span className="truncate">KRR Admin</span>
            </Link>
          </header>
          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}