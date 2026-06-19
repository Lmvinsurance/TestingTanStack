import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { ChevronRight, UtensilsCrossed } from "lucide-react";
import { menuService, MenuCategory } from "@/lib/supabase-menu.service";
import { toast } from "sonner";

interface MenuCategoriesProps {
  onCategorySelect?: (categoryId: string) => void;
}

export function MenuCategories({ onCategorySelect }: MenuCategoriesProps) {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const data = await menuService.getCategories();
      setCategories(data);
      
      // Auto-select first category if available
      if (data.length > 0 && !selectedCategory) {
        setSelectedCategory(data[0].id);
        if (onCategorySelect) onCategorySelect(data[0].id);
      }
    } catch (error) {
      console.error("Error loading categories:", error);
      toast.error("Failed to load menu categories");
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryClick = (categoryId: string) => {
    setSelectedCategory(categoryId);
    if (onCategorySelect) onCategorySelect(categoryId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-saffron-deep border-t-transparent" />
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className="py-12 text-center text-maroon-deep/70">
        <UtensilsCrossed className="mx-auto h-12 w-12 text-saffron-deep/40" />
        <p className="mt-4">No menu categories available</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {categories.map((category) => (
          <motion.button
            key={category.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleCategoryClick(category.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              selectedCategory === category.id
                ? "bg-maroon text-cream shadow-md"
                : "border border-gold/30 bg-cream text-maroon-deep hover:border-gold hover:bg-cream-warm"
            }`}
          >
            {category.category_name}
          </motion.button>
        ))}
      </div>

      {/* View All link */}
      <div className="text-right">
        <Link
          to="/customer/menu"
          className="inline-flex items-center gap-1 text-sm font-medium text-maroon hover:text-saffron-deep transition-colors"
        >
          View all categories
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}