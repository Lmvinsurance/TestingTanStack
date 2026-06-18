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
function emit() {
  cachedCart = null;
  cachedOutlet = undefined;
  listeners.forEach((l) => l());
}

let cachedCart: CartItem[] | null = null;
let cachedOutlet: Outlet | null | undefined = undefined;

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

export function getCart(): CartItem[] {
  if (cachedCart === null) cachedCart = read<CartItem[]>(CART_KEY, []);
  return cachedCart;
}
export function setCart(items: CartItem[]) { write(CART_KEY, items); }
export function addToCart(item: CartItem) {
  const currentCart = getCart();
  const existing = currentCart.find((c) => c.itemId === item.itemId && c.variantId === item.variantId);
  if (existing) {
    updateQty(existing.id, existing.qty + item.qty);
  } else {
    const id = item.id || (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));
    const cart = [...currentCart, { ...item, id }];
    setCart(cart);
  }
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

export function getOutlet(): Outlet | null {
  if (cachedOutlet === undefined) cachedOutlet = read<Outlet | null>(OUTLET_KEY, null);
  return cachedOutlet;
}
export function setOutlet(o: Outlet) { write(OUTLET_KEY, o); }

const EMPTY_CART: CartItem[] = [];
const subscribeCart = (cb: () => void) => { listeners.add(cb); return () => { listeners.delete(cb); }; };
const getServerCart = () => EMPTY_CART;
export function useCart() {
  return useSyncExternalStore(subscribeCart, getCart, getServerCart);
}
const subscribeOutlet = (cb: () => void) => { listeners.add(cb); return () => { listeners.delete(cb); }; };
const getServerOutlet = () => null;
export function useOutlet() {
  return useSyncExternalStore(subscribeOutlet, getOutlet, getServerOutlet);
}

export function cartTotal(items: CartItem[]) {
  return items.reduce((s, it) => s + (it.price + (it.addons?.reduce((a, b) => a + b.price, 0) ?? 0)) * it.qty, 0);
}
