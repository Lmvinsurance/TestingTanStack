import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import {
  ChevronLeft,
  Clock,
  UtensilsCrossed,
  Award,
  Sparkles,
  Star,
  CheckCircle,
  XCircle,
  Minus,
  Plus,
  ShoppingCart,
  AlertCircle,
  Info,
  Users,
  Tag,
  Heart,
  Share2,
  ChefHat,
} from "lucide-react";
import { menuService, MenuItemWithDetails } from "@/lib/supabase-menu.service";
import { useCart, addToCart, useOutlet } from "@/lib/cart-store";
import { toast } from "sonner";

/* ─────────────────────────  Variant Selector  ───────────────────────── */

interface VariantSelectorProps {
  variants: MenuItemWithDetails['variants'];
  selectedVariantId: string | null;
  onVariantSelect: (variantId: string) => void;
}

function VariantSelector({ variants, selectedVariantId, onVariantSelect }: VariantSelectorProps) {
  return (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold text-maroon-deep flex items-center gap-2">
        <Tag className="h-4 w-4" />
        Select Variant
      </h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {variants.map((variant) => {
          const isSelected = selectedVariantId === variant.id;
          const hasPrice = variant.outlet_price !== null;
          const isAvailable = variant.outlet_price?.is_available ?? false;

          return (
            <motion.button
              key={variant.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => hasPrice && isAvailable && onVariantSelect(variant.id)}
              disabled={!hasPrice || !isAvailable}
              className={`
                relative p-4 rounded-xl border-2 text-left transition-all
                ${isSelected 
                  ? 'border-saffron-deep bg-saffron/10 shadow-md ring-2 ring-saffron-deep/20' 
                  : 'border-gold/20 bg-white hover:border-gold/50'
                }
                ${(!hasPrice || !isAvailable) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              {/* Availability Badge */}
              {!isAvailable && (
                <div className="absolute top-2 right-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700">
                    <XCircle className="h-3 w-3" />
                    Unavailable
                  </span>
                </div>
              )}

              <div className="flex flex-col gap-1">
                <div className="flex items-start justify-between">
                  <span className="font-medium text-maroon-deep">
                    {variant.variant_name}
                  </span>
                  {isSelected && (
                    <CheckCircle className="h-4 w-4 text-saffron-deep" />
                  )}
                </div>
                
                {variant.quantity_label && (
                  <span className="text-xs text-maroon-deep/60">
                    {variant.quantity_label}
                  </span>
                )}

                {variant.serves_count && (
                  <span className="text-xs text-maroon-deep/60 flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    Serves {variant.serves_count}
                  </span>
                )}

                <div className="mt-2 flex items-center gap-3">
                  {hasPrice ? (
                    <>
                      <span className="text-lg font-bold text-maroon">
                        ₹{variant.outlet_price!.selling_price}
                      </span>
                      {variant.outlet_price!.mrp_price && (
                        <span className="text-sm text-maroon-deep/40 line-through">
                          ₹{variant.outlet_price!.mrp_price}
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-sm text-maroon-deep/40">Price not set</span>
                  )}
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────────────────  Add to Cart Section  ───────────────────────── */

interface AddToCartSectionProps {
  itemId: string;
  itemName: string;
  selectedVariantId: string | null;
  variant: MenuItemWithDetails['variants'][0] | null;
  isAvailable: boolean;
  stockStatus: string;
  outletId: string;
  imageUrl: string | null;
}

function AddToCartSection({ 
  itemId,
  itemName,
  selectedVariantId, 
  variant, 
  isAvailable, 
  stockStatus,
  outletId,
  imageUrl
}: AddToCartSectionProps) {
  const [quantity, setQuantity] = useState(1);
  const navigate = useNavigate();

  const handleQuantityChange = (delta: number) => {
    const newQuantity = Math.max(1, Math.min(10, quantity + delta));
    setQuantity(newQuantity);
  };

  const isDisabled = !selectedVariantId || !variant || !isAvailable || stockStatus === 'sold_out';

  const handleAddToCart = () => {
    if (!selectedVariantId || !variant || !variant.outlet_price) return;

    // Add to cart - NO LOGIN REQUIRED
    addToCart({
      id: `${itemId}-${selectedVariantId}-${Date.now()}`,
      outletId: outletId,
      itemId: itemId,
      variantId: selectedVariantId,
      name: itemName,
      variant: variant.variant_name,
      price: variant.outlet_price.selling_price,
      qty: quantity,
      image: imageUrl || undefined,
    });

    toast.success(`Added ${quantity} × ${itemName} to cart!`, {
      action: {
        label: 'View Cart',
        onClick: () => navigate('/cart'),
      },
    });
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gold/20 p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          {/* Quantity Selector */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-maroon-deep">Qty:</span>
            <div className="flex items-center rounded-full border border-gold/30 bg-cream">
              <button
                onClick={() => handleQuantityChange(-1)}
                disabled={quantity <= 1}
                className="p-2 rounded-l-full hover:bg-gold/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Minus className="h-4 w-4 text-maroon-deep" />
              </button>
              <span className="w-10 text-center font-medium text-maroon-deep">
                {quantity}
              </span>
              <button
                onClick={() => handleQuantityChange(1)}
                disabled={quantity >= 10}
                className="p-2 rounded-r-full hover:bg-gold/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Plus className="h-4 w-4 text-maroon-deep" />
              </button>
            </div>
          </div>

          {/* Price Display */}
          {variant && variant.outlet_price && (
            <div className="sm:ml-4">
              <span className="text-2xl font-bold text-maroon">
                ₹{variant.outlet_price.selling_price * quantity}
              </span>
              {quantity > 1 && (
                <span className="ml-2 text-xs text-maroon-deep/40">
                  (₹{variant.outlet_price.selling_price} each)
                </span>
              )}
            </div>
          )}

          {/* Add to Cart Button */}
          <button
            onClick={handleAddToCart}
            disabled={isDisabled}
            className={`
              ml-auto flex items-center gap-2 rounded-full px-6 py-3 font-semibold transition-all
              ${!isDisabled
                ? 'bg-saffron-deep text-cream hover:bg-saffron-deep/90 hover:shadow-lg active:scale-95'
                : 'bg-maroon-deep/20 text-maroon-deep/40 cursor-not-allowed'
              }
            `}
          >
            <ShoppingCart className="h-5 w-5" />
            Add to Cart
          </button>
        </div>

        {/* Availability Status */}
        {!isAvailable && (
          <div className="mt-3 flex items-center gap-2 text-sm text-red-600">
            <AlertCircle className="h-4 w-4" />
            <span>This item is currently unavailable</span>
          </div>
        )}

        {stockStatus === 'limited' && isAvailable && (
          <div className="mt-3 flex items-center gap-2 text-sm text-amber-600">
            <AlertCircle className="h-4 w-4" />
            <span>Limited stock available - order soon!</span>
          </div>
        )}

        {stockStatus === 'sold_out' && (
          <div className="mt-3 flex items-center gap-2 text-sm text-red-600">
            <XCircle className="h-4 w-4" />
            <span>Sold out</span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────  Main Component  ───────────────────────── */

export default function CustomerItemDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const outlet = useOutlet();
  const cart = useCart();
  
  const [item, setItem] = useState<MenuItemWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [isWishlisted, setIsWishlisted] = useState(false);

  // Load item details
  useEffect(() => {
    const loadData = async () => {
      if (!id || !outlet) return;
      
      try {
        setLoading(true);
        
        const itemData = await menuService.getMenuItemWithDetailsById(id, outlet.id);
        if (itemData) {
          setItem(itemData);
          
          // Select first available variant
          const firstAvailable = itemData.variants.find(
            v => v.outlet_price !== null && v.outlet_price.is_available
          );
          if (firstAvailable) {
            setSelectedVariantId(firstAvailable.id);
          } else if (itemData.variants.length > 0) {
            setSelectedVariantId(itemData.variants[0].id);
          }
        } else {
          toast.error('Item not found');
          navigate('/customer/menu');
        }
      } catch (error) {
        console.error('Error loading item:', error);
        toast.error('Failed to load item details');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id, navigate, outlet]);

  const getPrimaryImage = (item: MenuItemWithDetails): string | null => {
    if (item.images && item.images.length > 0) {
      const primary = item.images.find(img => img.is_primary);
      return primary ? primary.image_url : item.images[0].image_url;
    }
    return null;
  };

  // Check if item is already in cart
  const isInCart = cart.some(c => c.itemId === id);
  const cartItem = cart.find(c => c.itemId === id);

  if (!outlet) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto h-16 w-16 text-maroon-deep/30" />
          <p className="mt-4 text-maroon-deep">Please select an outlet first</p>
          <Link to="/customer/outlets" className="mt-4 inline-block text-saffron-deep hover:underline">
            Select Outlet
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-saffron-deep border-t-transparent" />
          <p className="text-sm text-maroon-deep/70">Loading item details...</p>
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="text-center">
          <UtensilsCrossed className="mx-auto h-16 w-16 text-maroon-deep/30" />
          <p className="mt-4 text-maroon-deep">Item not found</p>
          <Link to="/customer/menu" className="mt-4 inline-block text-saffron-deep hover:underline">
            Back to Menu
          </Link>
        </div>
      </div>
    );
  }

  const imageUrl = getPrimaryImage(item);
  const selectedVariant = item.variants.find(v => v.id === selectedVariantId) || null;
  const availability = item.outlet_availability;
  const isAvailable = availability?.is_available ?? false;
  const stockStatus = availability?.stock_status ?? 'available';

  return (
    <div className="min-h-screen bg-cream pb-12">
      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* Back Button */}
        <button
          onClick={() => navigate('/customer/menu')}
          className="inline-flex items-center gap-1 text-sm text-maroon-deep/60 hover:text-maroon transition-colors mb-6"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Menu
        </button>

        {/* Item Header */}
        <div className="bg-white rounded-2xl border border-gold/20 overflow-hidden shadow-sm mb-6">
          {/* Image */}
          <div className="relative h-64 md:h-80 bg-gradient-to-br from-gold/10 to-saffron/10">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={item.item_name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <ChefHat className="h-20 w-20 text-gold/30" />
              </div>
            )}
            
            {/* Badges */}
            <div className="absolute top-4 left-4 flex flex-wrap gap-2">
              {item.is_bestseller && (
                <span className="inline-flex items-center gap-1 rounded-full bg-maroon px-3 py-1 text-xs font-semibold text-cream shadow-md">
                  <Award className="h-3.5 w-3.5" />
                  Bestseller
                </span>
              )}
              {item.is_new && (
                <span className="inline-flex items-center gap-1 rounded-full bg-saffron-deep px-3 py-1 text-xs font-semibold text-cream shadow-md">
                  <Sparkles className="h-3.5 w-3.5" />
                  New
                </span>
              )}
              {isAvailable && stockStatus === 'limited' && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-3 py-1 text-xs font-semibold text-white shadow-md">
                  <AlertCircle className="h-3.5 w-3.5" />
                  Limited
                </span>
              )}
              {item.is_vegetarian && (
                <span className="inline-flex items-center gap-1 rounded-full bg-green-500 px-3 py-1 text-xs font-semibold text-white shadow-md">
                  🌿 Veg
                </span>
              )}
            </div>

            {/* Action Buttons */}
            <div className="absolute top-4 right-4 flex gap-2">
              <button
                onClick={() => setIsWishlisted(!isWishlisted)}
                className="rounded-full bg-white/90 p-2 shadow-md hover:bg-white transition-colors backdrop-blur-sm"
              >
                <Heart className={`h-5 w-5 ${isWishlisted ? 'fill-red-500 text-red-500' : 'text-maroon-deep/60'}`} />
              </button>
              <button
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({
                      title: item.item_name,
                      text: item.short_description || '',
                      url: window.location.href,
                    });
                  }
                }}
                className="rounded-full bg-white/90 p-2 shadow-md hover:bg-white transition-colors backdrop-blur-sm"
              >
                <Share2 className="h-5 w-5 text-maroon-deep/60" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-display text-3xl text-maroon">
                  {item.item_name}
                </h1>
                {item.category_name && (
                  <span className="text-sm text-maroon-deep/60">
                    {item.category_name}
                  </span>
                )}
              </div>
              {item.is_recommended && (
                <span className="flex items-center gap-1 rounded-full bg-gold/10 px-3 py-1 text-xs text-gold whitespace-nowrap">
                  <Star className="h-3.5 w-3.5 fill-current" />
                  Recommended
                </span>
              )}
            </div>

            {item.short_description && (
              <p className="mt-3 text-maroon-deep/80 text-lg">
                {item.short_description}
              </p>
            )}

            {item.long_description && (
              <p className="mt-2 text-sm text-maroon-deep/60 leading-relaxed">
                {item.long_description}
              </p>
            )}

            {/* Details */}
            <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-maroon-deep/60">
              {item.meal_timing && (
                <span className="flex items-center gap-1 bg-cream px-3 py-1 rounded-full">
                  <Clock className="h-3.5 w-3.5" />
                  {item.meal_timing.replace('_', ' ')}
                </span>
              )}
              {item.spice_level && (
                <span className="bg-cream px-3 py-1 rounded-full">
                  {item.spice_level === 'mild' && '🌿 Mild'}
                  {item.spice_level === 'medium' && '🌶️ Medium'}
                  {item.spice_level === 'spicy' && '🌶️🌶️ Spicy'}
                  {item.spice_level === 'extra_spicy' && '🌶️🌶️🌶️ X-Spicy'}
                </span>
              )}
              {item.preparation_time && (
                <span className="flex items-center gap-1 bg-cream px-3 py-1 rounded-full">
                  <Clock className="h-3.5 w-3.5" />
                  {item.preparation_time} min
                </span>
              )}
              {item.dietary_tags && item.dietary_tags.length > 0 && (
                <span className="flex items-center gap-1 bg-cream px-3 py-1 rounded-full">
                  <Info className="h-3.5 w-3.5" />
                  {item.dietary_tags.join(', ')}
                </span>
              )}
            </div>

            {/* In Cart Indicator */}
            {isInCart && (
              <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-green-50 px-3 py-1 text-sm text-green-700">
                <CheckCircle className="h-4 w-4" />
                {cartItem?.qty || 1} in cart
                <button 
                  onClick={() => navigate('/cart')}
                  className="ml-2 text-xs text-saffron-deep hover:underline"
                >
                  View Cart
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Variant Selection */}
        {item.variants.length > 0 ? (
          <div className="mb-6">
            <VariantSelector
              variants={item.variants}
              selectedVariantId={selectedVariantId}
              onVariantSelect={setSelectedVariantId}
            />
          </div>
        ) : (
          <div className="mb-6 p-4 bg-yellow-50 rounded-xl border border-yellow-200 text-yellow-800 text-sm">
            <AlertCircle className="inline h-4 w-4 mr-2" />
            No variants available for this item.
          </div>
        )}

        {/* Add to Cart Section */}
        <AddToCartSection
          itemId={item.id}
          itemName={item.item_name}
          selectedVariantId={selectedVariantId}
          variant={selectedVariant}
          isAvailable={isAvailable}
          stockStatus={stockStatus}
          outletId={outlet.id}
          imageUrl={imageUrl}
        />

        {/* Nutritional Info */}
        {item.nutritional_info && Object.keys(item.nutritional_info).length > 0 && (
          <div className="mt-6 p-4 bg-white rounded-xl border border-gold/20">
            <h4 className="text-sm font-semibold text-maroon-deep mb-3 flex items-center gap-2">
              <Info className="h-4 w-4" />
              Nutritional Information
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              {item.nutritional_info.calories && (
                <div className="bg-cream p-3 rounded-lg">
                  <span className="text-maroon-deep/60 block text-xs">Calories</span>
                  <p className="font-medium text-maroon-deep">{item.nutritional_info.calories}</p>
                </div>
              )}
              {item.nutritional_info.protein && (
                <div className="bg-cream p-3 rounded-lg">
                  <span className="text-maroon-deep/60 block text-xs">Protein</span>
                  <p className="font-medium text-maroon-deep">{item.nutritional_info.protein}</p>
                </div>
              )}
              {item.nutritional_info.carbs && (
                <div className="bg-cream p-3 rounded-lg">
                  <span className="text-maroon-deep/60 block text-xs">Carbs</span>
                  <p className="font-medium text-maroon-deep">{item.nutritional_info.carbs}</p>
                </div>
              )}
              {item.nutritional_info.fat && (
                <div className="bg-cream p-3 rounded-lg">
                  <span className="text-maroon-deep/60 block text-xs">Fat</span>
                  <p className="font-medium text-maroon-deep">{item.nutritional_info.fat}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}