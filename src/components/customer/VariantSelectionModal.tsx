import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { menuService, MenuItemWithDetails, ItemVariant } from "@/lib/supabase-menu.service";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { UtensilsCrossed, AlertCircle, ShoppingBag } from "lucide-react";

interface VariantSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemId: string | null;
  outletId: string | null;
  onVariantSelected: (variant: ItemVariant & { outlet_price: any }, item: MenuItemWithDetails) => void;
}

export function VariantSelectionModal({
  isOpen,
  onClose,
  itemId,
  outletId,
  onVariantSelected,
}: VariantSelectionModalProps) {
  const [loading, setLoading] = useState(false);
  const [itemDetails, setItemDetails] = useState<MenuItemWithDetails | null>(null);

  useEffect(() => {
    if (isOpen && itemId && outletId) {
      loadVariants();
    }
  }, [isOpen, itemId, outletId]);

  const loadVariants = async () => {
    try {
      setLoading(true);
      const data = await menuService.getMenuItemWithDetailsById(itemId!, outletId!);
      if (data) {
        setItemDetails(data);
      } else {
        toast.error("Failed to load item details.");
        onClose();
      }
    } catch (error) {
      console.error(error);
      toast.error("Error loading variants.");
    } finally {
      setLoading(false);
    }
  };

  const isTimeWithinRange = (from: string | null | undefined, to: string | null | undefined): boolean => {
    if (!from && !to) return true;
    
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const parseTime = (timeStr: string) => {
      const [h, m] = timeStr.split(':').map(Number);
      return h * 60 + m;
    };

    if (from && to) {
      const fromMin = parseTime(from);
      const toMin = parseTime(to);
      if (fromMin <= toMin) {
        return currentMinutes >= fromMin && currentMinutes <= toMin;
      } else {
        // Crosses midnight
        return currentMinutes >= fromMin || currentMinutes <= toMin;
      }
    }
    if (from) return currentMinutes >= parseTime(from);
    if (to) return currentMinutes <= parseTime(to);
    return true;
  };

  const handleSelect = (variant: any) => {
    if (!variant.outlet_price?.is_available || variant.outlet_price.selling_price === undefined || variant.outlet_price.selling_price <= 0) {
      toast.error("This variant is currently unavailable.");
      return;
    }
    
    // Check main item availability
    const avail = itemDetails?.outlet_availability;
    if (avail?.stock_status === 'sold_out' || avail?.is_available === false) {
      toast.error("This item is sold out.");
      return;
    }

    if (!isTimeWithinRange(avail?.available_from, avail?.available_to)) {
      toast.error("This item is not available at this time.");
      return;
    }

    onVariantSelected(variant, itemDetails!);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md bg-cream border-gold/30 p-0 overflow-hidden sm:rounded-2xl">
        <DialogTitle className="sr-only">Variant Selection</DialogTitle>
        <DialogDescription className="sr-only">Choose options for your item</DialogDescription>
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-saffron-deep border-t-transparent" />
            <p className="text-sm text-maroon-deep/70">Loading options...</p>
          </div>
        ) : itemDetails ? (
          <>
            {/* Header Image */}
            <div className="h-40 w-full bg-gradient-to-br from-saffron/20 to-maroon/20 relative">
              {itemDetails.images && itemDetails.images.length > 0 ? (
                <img
                  src={itemDetails.images.find((i) => i.is_primary)?.image_url || itemDetails.images[0].image_url}
                  alt={itemDetails.item_name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-maroon/20">
                  <UtensilsCrossed className="h-12 w-12" />
                </div>
              )}
              {/* Item Availability Badge */}
              {itemDetails.outlet_availability?.stock_status === 'sold_out' && (
                <div className="absolute top-3 left-3 bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">
                  Sold Out
                </div>
              )}
            </div>

            <div className="p-4 sm:p-6">
              <DialogHeader className="mb-4">
                <DialogTitle className="text-display text-xl text-maroon text-left">
                  {itemDetails.item_name}
                </DialogTitle>
                <DialogDescription className="text-sm text-maroon-deep/70 text-left">
                  Select your preferred option to proceed.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-1">
                {itemDetails.variants.length === 0 ? (
                  <p className="text-sm text-maroon-deep/60 italic text-center py-4">No variants available for this item.</p>
                ) : (
                  itemDetails.variants.map((variant) => {
                    const price = variant.outlet_price;
                    const avail = itemDetails.outlet_availability;
                    const timeAvail = isTimeWithinRange(avail?.available_from, avail?.available_to);
                    const stockAvail = avail?.is_available !== false && avail?.stock_status !== 'sold_out';
                    
                    const isValidPrice = price?.selling_price !== undefined && price.selling_price > 0;
                    const isAvailable = price?.is_available && stockAvail && timeAvail && isValidPrice;
                    
                    return (
                      <div
                        key={variant.id}
                        className={`flex items-center justify-between p-3 rounded-xl border ${
                          isAvailable
                            ? "border-gold/40 bg-card hover:border-saffron hover:bg-saffron/5"
                            : "border-gray-200 bg-gray-50/50 opacity-60"
                        }`}
                      >
                        <div>
                          <p className="font-semibold text-maroon text-sm flex items-center gap-2">
                            {variant.variant_name}
                            {!isAvailable && !timeAvail && stockAvail ? (
                               <span className="text-[9px] uppercase tracking-wider text-amber-600 font-bold bg-amber-100 px-1.5 py-0.5 rounded-sm">
                                 Outside Hours
                               </span>
                            ) : !isAvailable ? (
                              <span className="text-[9px] uppercase tracking-wider text-red-600 font-bold bg-red-100 px-1.5 py-0.5 rounded-sm">
                                Unavailable
                              </span>
                            ) : null}
                            {isAvailable && avail?.stock_status === 'limited' && (
                              <span className="text-[9px] uppercase tracking-wider text-amber-600 font-bold bg-amber-100 px-1.5 py-0.5 rounded-sm flex items-center gap-1">
                                <AlertCircle className="w-2 h-2" /> Limited Stock
                              </span>
                            )}
                          </p>
                          <div className="text-[11px] text-maroon-deep/60 mt-0.5 flex gap-2">
                            {variant.serves_count && <span>Serves: {variant.serves_count}</span>}
                            {variant.quantity_label && <span>Qty: {variant.quantity_label}</span>}
                          </div>
                          
                          <div className="mt-1 flex items-baseline gap-2">
                            <span className="text-sm font-bold text-saffron-deep">
                              ₹{price?.selling_price ?? "N/A"}
                            </span>
                            {price?.mrp_price && price.mrp_price > price.selling_price && (
                              <>
                                <span className="text-[10px] text-maroon-deep/50 line-through">
                                  ₹{price.mrp_price}
                                </span>
                                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-sm">
                                  {Math.round(((price.mrp_price - price.selling_price) / price.mrp_price) * 100)}% OFF
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        <Button
                          size="sm"
                          disabled={!isAvailable}
                          onClick={() => handleSelect(variant)}
                          className="bg-maroon hover:bg-maroon-deep text-cream h-8 text-xs px-4 rounded-lg shadow-sm"
                        >
                          <ShoppingBag className="w-3 h-3 mr-1.5" />
                          Add
                        </Button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="p-6 text-center text-maroon-deep/70">Item not found.</div>
        )}
      </DialogContent>
    </Dialog>
  );
}
