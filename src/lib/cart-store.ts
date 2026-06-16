import { useEffect, useState, useSyncExternalStore } from "react";

export type CartItem = {
  id: string;
  outletId: string;
  itemId: string;
  variantId: string;
  name: string;
  variant: string;
  price: number;
  qty: number;
  addons?: { name: string; price: number }[];
  notes?: string;
  image?: string;
  dietary?: string | null;
};

export type Outlet = {
  id: string;
  name: string;
  short: string;
  address: string;
};

const CART_KEY = "krr_cart_v1";
const OUTLET_KEY = "krr_outlet_v1";

const listeners = new Set<() => void>();
function emit() { listeners.forEach((l) => l()); }

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) as T : fallback; }
  catch { return fallback; }
}
function write<T>(key: string, v: T) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(v));
  emit();
}

export function getCart(): CartItem[] { return read(CART_KEY, []); }
export function setCart(items: CartItem[]) { write(CART_KEY, items); }
export function addToCart(item: CartItem) {
  const cart = getCart();
  cart.push({ ...item, id: item.id || crypto.randomUUID() });
  setCart(cart);
}

/** Returns the outletId all current cart items belong to, or null. */
export function getCartOutletId(): string | null {
  const items = getCart();
  return items[0]?.outletId ?? null;
}
export function updateQty(id: string, qty: number) {
  const cart = getCart().map((c) => c.id === id ? { ...c, qty } : c).filter((c) => c.qty > 0);
  setCart(cart);
}
export function removeItem(id: string) { setCart(getCart().filter((c) => c.id !== id)); }
export function clearCart() { setCart([]); }

export function getOutlet(): Outlet | null { return read<Outlet | null>(OUTLET_KEY, null); }
export function setOutlet(o: Outlet) { write(OUTLET_KEY, o); }

export function useCart() {
  const subscribe = (cb: () => void) => { listeners.add(cb); return () => listeners.delete(cb); };
  const items = useSyncExternalStore(subscribe, getCart, () => [] as CartItem[]);
  return items;
}
export function useOutlet() {
  const [o, setO] = useState<Outlet | null>(null);
  useEffect(() => {
    setO(getOutlet());
    const cb = () => setO(getOutlet());
    listeners.add(cb);
    return () => { listeners.delete(cb); };
  }, []);
  return o;
}

export function cartTotal(items: CartItem[]) {
  return items.reduce((s, it) => s + (it.price + (it.addons?.reduce((a, b) => a + b.price, 0) ?? 0)) * it.qty, 0);
}
