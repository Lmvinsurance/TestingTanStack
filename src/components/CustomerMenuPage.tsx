import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import {
  ChevronRight,
  ChevronLeft,
  Clock,
  Search,
  UtensilsCrossed,
  Award,
  Sparkles,
  Star,
  ShoppingBag,
  MapPin,
} from "lucide-react";
import { menuService, MenuCategory, MenuItemWithImages, MenuItemWithDetails, ItemVariant } from "@/lib/supabase-menu.service";
import { toast } from "sonner";
import { useCart, useOutlet, addToCart, setOutlet } from "@/lib/cart-store";
import { VariantSelectionModal } from "./customer/VariantSelectionModal";
import { AuthModal } from "./customer/AuthModal";
import { CartDrawer } from "./customer/CartDrawer";
import { supabase } from "@/integrations/supabase/client";

/* ─────────────────────────  Menu Items List  ───────────────────────── */

function MenuItemsList({ 
  items, 
  onItemClick
}: { 
  items: MenuItemWithImages[]; 
  onItemClick: (itemId: string) => void;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredItems, setFilteredItems] = useState(items);

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredItems(items);
    } else {
      const term = searchTerm.toLowerCase();
      setFilteredItems(
        items.filter(
          (item) =>
            item.item_name.toLowerCase().includes(term) ||
            (item.short_description && item.short_description.toLowerCase().includes(term))
        )
      );
    }
  }, [searchTerm, items]);

  const getPrimaryImage = (item: MenuItemWithImages): string | null => {
    if (item.images && item.images.length > 0) {
      const primary = item.images.find(img => img.is_primary);
      return primary ? primary.image_url : item.images[0].image_url;
    }
    return null;
  };

  if (items.length === 0) {
    return (
      <div className="py-12 text-center text-maroon-deep/70">
        <UtensilsCrossed className="mx-auto h-16 w-16 text-saffron-deep/40" />
        <p className="mt-4 text-lg">No items in this category</p>
        <p className="text-sm">Please select a different category</p>
      </div>
    );
  }

  return (
    <div>
      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-maroon-deep/40" />
          <input
            type="text"
            placeholder="Search menu items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-full border border-gold/30 bg-cream py-2.5 pl-10 pr-4 text-sm text-maroon-deep placeholder-maroon-deep/40 focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20"
          />
        </div>
      </div>

      {filteredItems.length === 0 && searchTerm && (
        <div className="py-8 text-center text-maroon-deep/70">
          <p>No items found matching "{searchTerm}"</p>
        </div>
      )}

      {filteredItems.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredItems.map((item) => {
            const imageUrl = getPrimaryImage(item);
            return (
              <MenuItemCard key={item.id} item={item} imageUrl={imageUrl} onClick={() => onItemClick(item.id)} />
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────  Menu Item Card  ───────────────────────── */

function MenuItemCard({ item, imageUrl, onClick }: { item: MenuItemWithImages; imageUrl: string | null; onClick: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-4 p-3 rounded-xl border border-gold/30 bg-cream hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer"
      onClick={onClick}
    >
      {/* Image */}
      <div className="flex-shrink-0 w-24 h-24 rounded-lg overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={item.item_name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-gold/10 to-saffron/10 flex items-center justify-center">
            <UtensilsCrossed className="h-8 w-8 text-gold/30" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-2">
            <h4 className="text-display text-sm font-semibold text-maroon hover:text-saffron-deep transition-colors truncate">
              {item.item_name}
            </h4>
            <div className="flex flex-wrap gap-1 flex-shrink-0">
              {item.is_bestseller && (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-maroon px-1.5 py-0.5 text-[8px] font-semibold text-cream">
                  <Award className="h-2.5 w-2.5" />
                  Best
                </span>
              )}
              {item.is_new && (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-saffron-deep px-1.5 py-0.5 text-[8px] font-semibold text-cream">
                  <Sparkles className="h-2.5 w-2.5" />
                  New
                </span>
              )}
            </div>
          </div>

          {item.short_description && (
            <p className="mt-1 text-xs text-maroon-deep/70 line-clamp-2">
              {item.short_description}
            </p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-maroon-deep/60">
            {item.meal_timing && (
              <span className="inline-flex items-center gap-0.5">
                <Clock className="h-2.5 w-2.5" />
                {item.meal_timing.replace('_', ' ')}
              </span>
            )}
            {item.spice_level && (
              <span className="capitalize">
                {item.spice_level === 'mild' && '🌿 Mild'}
                {item.spice_level === 'medium' && '🌶️ Medium'}
                {item.spice_level === 'spicy' && '🌶️🌶️ Spicy'}
                {item.spice_level === 'extra_spicy' && '🌶️🌶️🌶️ X-Spicy'}
              </span>
            )}
            {item.is_recommended && (
              <span className="inline-flex items-center gap-0.5 text-gold">
                <Star className="h-2.5 w-2.5 fill-current" />
                Recommended
              </span>
            )}
          </div>
        </div>
        
        <div className="mt-2 text-right">
          <button className="text-xs font-semibold text-saffron-deep bg-saffron/10 px-3 py-1 rounded-full hover:bg-saffron/20 transition-colors">
            View Options
          </button>
        </div>
      </div>
    </motion.div>
  );
}

/* ─────────────────────────  Main Menu Page  ───────────────────────── */

export function CustomerMenuPage() {
  const navigate = useNavigate();
  const cart = useCart();
  const outlet = useOutlet();

  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItemWithImages[]>([]);
  const [loading, setLoading] = useState(true);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [availableOutlets, setAvailableOutlets] = useState<any[]>([]);

  // Modals state
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isVariantModalOpen, setIsVariantModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);
  const [pendingCartItem, setPendingCartItem] = useState<any | null>(null);

  // Redirect if no outlet is selected
  useEffect(() => {
    if (!outlet) {
      toast("Please choose an outlet to view the menu.");
      navigate("/customer/outlets", { replace: true });
    } else {
      // Fetch outlets for the dropdown
      supabase
        .from("outlets")
        .select("id, outlet_name, address, city, pincode")
        .eq("is_active", true)
        .eq("is_deleted", false)
        .order("outlet_name")
        .then(({ data }) => {
          if (data) setAvailableOutlets(data);
        });
    }
  }, [outlet, navigate]);

  const handleOutletChange = (newOutletId: string) => {
    const selected = availableOutlets.find(o => o.id === newOutletId);
    if (selected) {
      setOutlet({
        id: selected.id,
        name: selected.outlet_name,
        short: selected.outlet_name,
        address: [selected.address, selected.city, selected.pincode].filter(Boolean).join(", "),
      });
      toast.success(`Switched to ${selected.outlet_name}`);
    }
  };

  // Load categories on mount
  useEffect(() => {
    if (outlet) {
      loadCategories();
    }
  }, [outlet]);

  // Load items when category or outlet changes
  useEffect(() => {
    if (selectedCategory && outlet) {
      loadItems(selectedCategory, outlet.id);
    }
  }, [selectedCategory, outlet]);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const data = await menuService.getCategories();
      setCategories(data);
      if (data.length > 0) {
        setSelectedCategory(data[0].id);
      }
    } catch (error) {
      console.error("Error loading categories:", error);
      toast.error("Failed to load menu categories");
    } finally {
      setLoading(false);
    }
  };

  const loadItems = async (categoryId: string, outletId?: string) => {
    try {
      setItemsLoading(true);
      const data = await menuService.getMenuItemsByCategory(categoryId, outletId);
      setMenuItems(data);
    } catch (error) {
      console.error("Error loading menu items:", error);
      toast.error("Failed to load menu items");
    } finally {
      setItemsLoading(false);
    }
  };

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategory(categoryId);
  };

  const handleItemClick = (itemId: string) => {
    if (!outlet) {
      toast.error("Please select an outlet first to view pricing and availability.");
      navigate("/customer/outlets");
      return;
    }
    setSelectedItemId(itemId);
    setIsVariantModalOpen(true);
  };

  const handleVariantSelected = async (variant: ItemVariant & { outlet_price: any }, item: MenuItemWithDetails) => {
    setIsVariantModalOpen(false);

    const primaryImage = item.images?.find((img) => img.is_primary)?.image_url || item.images?.[0]?.image_url;

    const cartItemData = {
      outletId: outlet!.id,
      itemId: item.id,
      variantId: variant.id,
      name: item.item_name,
      variant: variant.variant_name,
      price: variant.outlet_price.selling_price,
      qty: 1,
      image: primaryImage,
    };

    // Verify authentication
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      setPendingCartItem(cartItemData);
      setIsAuthModalOpen(true);
      return;
    }

    // User is logged in, add directly to cart
    addToCart(cartItemData);
    toast.success(`${item.item_name} added to cart`);
    setIsCartDrawerOpen(true);
  };

  const handleAuthSuccess = () => {
    setIsAuthModalOpen(false);
    if (pendingCartItem) {
      addToCart(pendingCartItem);
      setPendingCartItem(null);
      toast.success(`${pendingCartItem.name} added to cart`);
      setIsCartDrawerOpen(true);
    }
  };

  // Get current category name
  const currentCategory = categories.find(c => c.id === selectedCategory);

  if (loading) {
    return (
      <div className="min-h-screen bg-cream pb-24 relative">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <div className="h-4 w-24 bg-gold/20 rounded animate-pulse mb-6"></div>
          <div className="h-10 w-48 bg-gold/20 rounded animate-pulse mb-2"></div>
          <div className="h-4 w-64 bg-gold/20 rounded animate-pulse mb-6"></div>
          <div className="h-12 w-full md:w-64 bg-gold/20 rounded-xl animate-pulse mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex gap-4 p-3 rounded-xl border border-gold/10 bg-white/50 animate-pulse">
                <div className="flex-shrink-0 w-24 h-24 rounded-lg bg-gold/20"></div>
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-4 w-3/4 bg-gold/20 rounded"></div>
                  <div className="h-3 w-1/2 bg-gold/20 rounded"></div>
                  <div className="h-3 w-1/4 bg-gold/20 rounded mt-4"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const cartItemsCount = cart.reduce((acc, item) => acc + item.qty, 0);

  return (
    <div className="min-h-screen bg-cream pb-24 relative">
      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* Header with Back & Cart */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-1 text-sm text-maroon-deep/60 hover:text-maroon transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Home
          </button>
          
          <button
            onClick={() => setIsCartDrawerOpen(true)}
            className="inline-flex items-center gap-2 bg-white border border-gold/40 px-4 py-2 rounded-full text-maroon hover:shadow-md transition-shadow relative"
          >
            <ShoppingBag className="h-4 w-4 text-saffron-deep" />
            <span className="text-sm font-semibold">Cart ({cartItemsCount})</span>
            {cartItemsCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-saffron opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-saffron-deep"></span>
              </span>
            )}
          </button>
        </div>

        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-display text-3xl text-maroon sm:text-4xl">
            Our Menu
          </h1>
          <p className="text-sm text-maroon-deep/70 mt-1">
            Explore authentic Telugu flavors from our curated menu
          </p>
        </div>

        {/* Dropdowns */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Outlet Dropdown */}
          {outlet && (
            <div>
              <label className="block text-sm font-medium text-maroon-deep mb-2">
                Ordering From
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-saffron-deep">
                  <MapPin className="h-4 w-4" />
                </div>
                <select
                  value={outlet.id}
                  onChange={(e) => handleOutletChange(e.target.value)}
                  className="w-full appearance-none rounded-xl border border-gold/30 bg-white px-4 py-3 pl-10 pr-10 text-sm font-semibold text-maroon-deep focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20 cursor-pointer shadow-sm truncate"
                >
                  {!availableOutlets.find(o => o.id === outlet.id) && (
                    <option value={outlet.id}>{outlet.short}</option>
                  )}
                  {availableOutlets.map(o => (
                    <option key={o.id} value={o.id}>{o.outlet_name}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-maroon-deep/40">
                  <ChevronRight className="h-4 w-4 rotate-90" />
                </div>
              </div>
            </div>
          )}

          {/* Category Dropdown */}
          <div>
            <label className="block text-sm font-medium text-maroon-deep mb-2">
              Menu Category
            </label>
            <div className="relative">
              <select
                value={selectedCategory || ""}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full appearance-none rounded-xl border border-gold/30 bg-cream px-4 py-3 pr-10 text-sm text-maroon-deep focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20 cursor-pointer shadow-sm"
              >
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.category_name}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-maroon-deep/40">
                <ChevronRight className="h-4 w-4 rotate-90" />
              </div>
            </div>
          </div>
        </div>

        {/* Category Title */}
        {currentCategory && (
          <div className="mb-6">
            <h2 className="text-display text-2xl text-maroon">
              {currentCategory.category_name}
            </h2>
            {currentCategory.description && (
              <p className="text-sm text-maroon-deep/70 mt-1">
                {currentCategory.description}
              </p>
            )}
          </div>
        )}

        {/* Menu Items */}
        {itemsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex gap-4 p-3 rounded-xl border border-gold/10 bg-white/50 animate-pulse">
                <div className="flex-shrink-0 w-24 h-24 rounded-lg bg-gold/20"></div>
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-4 w-3/4 bg-gold/20 rounded"></div>
                  <div className="h-3 w-1/2 bg-gold/20 rounded"></div>
                  <div className="h-3 w-1/4 bg-gold/20 rounded mt-4"></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <MenuItemsList items={menuItems} onItemClick={handleItemClick} />
        )}

        {/* Footer note */}
        <div className="mt-12 text-center text-xs text-maroon-deep/40 border-t border-gold/20 pt-6">
          <p>© {new Date().getFullYear()} Telugu Food Club. All rights reserved.</p>
        </div>
      </div>

      {/* Floating Cart Button for mobile - optional, as we have one in header, but user requested floating cart button */}
      {cartItemsCount > 0 && (
        <div className="fixed bottom-6 right-6 z-40 md:hidden">
          <button
            onClick={() => setIsCartDrawerOpen(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-saffron to-saffron-deep text-cream px-5 py-3 rounded-full shadow-lg hover:shadow-xl transition-shadow font-semibold"
          >
            <ShoppingBag className="h-5 w-5" />
            Cart ({cartItemsCount})
          </button>
        </div>
      )}

      {/* Modals & Drawers */}
      <VariantSelectionModal
        isOpen={isVariantModalOpen}
        onClose={() => setIsVariantModalOpen(false)}
        itemId={selectedItemId}
        outletId={outlet?.id ?? null}
        onVariantSelected={handleVariantSelected}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => {
          setIsAuthModalOpen(false);
          setPendingCartItem(null); // Clear pending item if auth is aborted
        }}
        onSuccess={handleAuthSuccess}
      />

      <CartDrawer
        isOpen={isCartDrawerOpen}
        onClose={() => setIsCartDrawerOpen(false)}
      />
    </div>
  );
}