import React, { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { useCart, useOutlet, updateQty, removeItem, cartTotal, clearCart } from "@/lib/cart-store";
import { Minus, Plus, Trash2, ShoppingBag, ChefHat, MapPin, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const cart = useCart();
  const outlet = useOutlet();
  const navigate = useNavigate();

  const cartOutletId = cart[0]?.outletId ?? null;
  const outletMismatch = !!cartOutletId && !!outlet && cartOutletId !== outlet.id;

  const itemsTotal = useMemo(() => cartTotal(cart), [cart]);

  // If cart is empty
  if (cart.length === 0) {
    return (
      <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <SheetContent className="w-full sm:max-w-md bg-cream border-l-gold/30 p-0 flex flex-col">
          <SheetHeader className="p-4 border-b border-gold/20 bg-white/50">
            <SheetTitle className="text-maroon text-left">Your Cart</SheetTitle>
          </SheetHeader>
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <div className="grid h-20 w-20 place-items-center rounded-full bg-saffron/15 text-saffron-deep mb-4">
              <ShoppingBag className="h-8 w-8" />
            </div>
            <h3 className="text-display text-xl text-maroon mb-2">Cart is empty</h3>
            <p className="text-sm text-maroon-deep/60">
              Add some delicious items from our menu!
            </p>
            <Button
              onClick={onClose}
              className="mt-6 bg-gradient-to-r from-saffron to-saffron-deep text-cream hover:opacity-90"
            >
              Browse Menu
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-md bg-cream border-l-gold/30 p-0 flex flex-col max-h-screen">
        <SheetHeader className="p-4 border-b border-gold/20 bg-white/50 shrink-0">
          <SheetTitle className="text-maroon text-left flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-saffron-deep" />
            Your Cart
            <span className="text-xs bg-saffron-deep text-cream px-2 py-0.5 rounded-full ml-auto font-normal">
              {cart.reduce((acc, item) => acc + item.qty, 0)} Items
            </span>
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {outletMismatch && (
            <div className="rounded-xl border border-amber-300/60 bg-amber-50 p-3 text-amber-900 mb-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="text-xs font-semibold">Different Outlet</p>
                  <p className="mt-0.5 text-[10px]">Your cart contains items from another outlet. Please clear it to order here.</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => { clearCart(); toast.success("Cart cleared"); }}
                className="mt-2 w-full text-xs h-7 border-amber-300 text-amber-900 hover:bg-amber-100"
              >
                Clear Cart
              </Button>
            </div>
          )}

          {!outletMismatch && outlet && (
            <div className="flex items-center gap-2 rounded-xl border border-gold/25 bg-white/60 p-2 text-xs text-maroon-deep">
              <MapPin className="h-3.5 w-3.5 text-saffron-deep" />
              <span className="font-medium truncate">Ordering from {outlet.short}</span>
            </div>
          )}

          <div className="space-y-3">
            {cart.map((it) => (
              <div key={it.id} className="flex gap-3 bg-white/80 border border-gold/20 rounded-xl p-3 shadow-sm">
                <div className="h-16 w-16 shrink-0 rounded-lg overflow-hidden bg-gradient-to-br from-saffron/20 to-maroon/10">
                  {it.image ? (
                    <img src={it.image} alt={it.name} className="h-full w-full object-cover" />
                  ) : (
                    <ChefHat className="h-full w-full p-4 text-maroon/30" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <p className="font-semibold text-maroon text-sm truncate">{it.name}</p>
                      <p className="text-[11px] text-maroon-deep/60 mt-0.5">{it.variant}</p>
                    </div>
                    <p className="font-bold text-saffron-deep text-sm shrink-0">
                      ₹{it.price * it.qty}
                    </p>
                  </div>
                  
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center gap-3 bg-cream rounded-lg border border-gold/30 px-1 py-0.5">
                      <button
                        onClick={() => updateQty(it.id, it.qty - 1)}
                        className="h-6 w-6 grid place-items-center text-maroon hover:bg-white rounded-md transition-colors"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="text-xs font-semibold w-4 text-center">{it.qty}</span>
                      <button
                        onClick={() => updateQty(it.id, it.qty + 1)}
                        className="h-6 w-6 grid place-items-center text-maroon hover:bg-white rounded-md transition-colors"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                    
                    <button
                      onClick={() => removeItem(it.id)}
                      className="text-maroon-deep/40 hover:text-red-500 transition-colors p-1"
                      aria-label="Remove item"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <SheetFooter className="p-4 border-t border-gold/30 bg-white shadow-[0_-4px_10px_-4px_rgba(0,0,0,0.05)] shrink-0 flex-col sm:flex-col gap-3">
          <div className="flex justify-between items-center w-full">
            <span className="text-sm text-maroon-deep/70">Subtotal</span>
            <span className="text-lg font-bold text-maroon">₹{itemsTotal}</span>
          </div>
          
          <Button
            className="w-full bg-gradient-to-r from-saffron to-saffron-deep text-cream font-semibold py-6 shadow-md hover:opacity-90"
            disabled={outletMismatch || !outlet}
            onClick={() => {
              onClose();
              navigate("/customer/checkout");
            }}
          >
            Checkout
          </Button>
          
          <Button
            variant="ghost"
            className="w-full text-xs text-maroon-deep/60 h-8 hover:text-maroon"
            onClick={onClose}
          >
            Continue Browsing
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
