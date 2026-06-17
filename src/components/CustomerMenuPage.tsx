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
} from "lucide-react";
import { menuService, MenuCategory, MenuItemWithImages } from "@/lib/supabase-menu.service";
import { toast } from "sonner";
import { useCartStore } from "@/stores/cartStore";

/* ─────────────────────────  Menu Items List  ───────────────────────── */

function MenuItemsList({ 
  items, 
  categoryName 
}: { 
  items: MenuItemWithImages[]; 
  categoryName: string;
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
              <MenuItemCard key={item.id} item={item} imageUrl={imageUrl} />
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────  Menu Item Card  ───────────────────────── */

function MenuItemCard({ item, imageUrl }: { item: MenuItemWithImages; imageUrl: string | null }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-4 p-3 rounded-xl border border-gold/30 bg-cream hover:shadow-md transition-all hover:-translate-y-0.5"
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
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <Link to={`/customer/item/${item.id}`} className="flex-1">
            <h4 className="text-display text-sm font-semibold text-maroon hover:text-saffron-deep transition-colors">
              {item.item_name}
            </h4>
          </Link>
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
    </motion.div>
  );
}

/* ─────────────────────────  Main Menu Page  ───────────────────────── */

export function CustomerMenuPage() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItemWithImages[]>([]);
  const [loading, setLoading] = useState(true);
  const [itemsLoading, setItemsLoading] = useState(false);

  // Load categories on mount
  useEffect(() => {
    loadCategories();
  }, []);

  // Load items when category changes
  useEffect(() => {
    if (selectedCategory) {
      loadItems(selectedCategory);
    }
  }, [selectedCategory]);

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

  const loadItems = async (categoryId: string) => {
    try {
      setItemsLoading(true);
      const data = await menuService.getMenuItemsByCategory(categoryId);
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

  // Get current category name
  const currentCategory = categories.find(c => c.id === selectedCategory);

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-saffron-deep border-t-transparent" />
          <p className="text-sm text-maroon-deep/70">Loading menu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream">
      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* Back to Home */}
        <button
          onClick={() => navigate("/")}
          className="inline-flex items-center gap-1 text-sm text-maroon-deep/60 hover:text-maroon transition-colors mb-4"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Home
        </button>

        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-display text-3xl text-maroon sm:text-4xl">
            Our Menu
          </h1>
          <p className="text-sm text-maroon-deep/70 mt-1">
            Explore authentic Telugu flavors from our curated menu
          </p>
        </div>

        {/* Category Dropdown */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-maroon-deep mb-2">
            Select Category
          </label>
          <div className="relative">
            <select
              value={selectedCategory || ""}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="w-full md:w-64 appearance-none rounded-xl border border-gold/30 bg-cream px-4 py-3 pr-10 text-sm text-maroon-deep focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20 cursor-pointer"
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
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-saffron-deep border-t-transparent" />
              <p className="text-sm text-maroon-deep/70">Loading items...</p>
            </div>
          </div>
        ) : (
          <MenuItemsList items={menuItems} categoryName={currentCategory?.category_name || ""} />
        )}

        {/* Footer note */}
        <div className="mt-12 text-center text-xs text-maroon-deep/40 border-t border-gold/20 pt-6">
          <p>© {new Date().getFullYear()} Telugu Food Club. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}