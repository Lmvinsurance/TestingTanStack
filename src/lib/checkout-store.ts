import { useEffect, useState } from "react";

export type OrderType = "delivery" | "pickup" | "dine_in";
export type PaymentMethod = "phonepe" | "upi" | "cod";

export type CheckoutState = {
  orderType: OrderType;
  notes: string;
  coupon: string | null;
  addressId: string | null;
  paymentMethod: PaymentMethod;
  scheduleAt: string | null;
  guests: number;
  arrivalTime: string;
  dineInRequest: string;
};

const KEY = "krr_checkout_v1";
const DEFAULT: CheckoutState = {
  orderType: "delivery",
  notes: "",
  coupon: null,
  addressId: null,
  paymentMethod: "phonepe",
  scheduleAt: null,
  guests: 2,
  arrivalTime: "",
  dineInRequest: "",
};

const listeners = new Set<() => void>();
function emit() { listeners.forEach((l) => l()); }

export function getCheckout(): CheckoutState {
  if (typeof window === "undefined") return DEFAULT;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? { ...DEFAULT, ...(JSON.parse(raw) as Partial<CheckoutState>) } : DEFAULT;
  } catch { return DEFAULT; }
}
export function setCheckout(patch: Partial<CheckoutState>) {
  if (typeof window === "undefined") return;
  const next = { ...getCheckout(), ...patch };
  window.localStorage.setItem(KEY, JSON.stringify(next));
  emit();
}
export function clearCheckout() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
  emit();
}

export function useCheckout(): CheckoutState {
  const [s, setS] = useState<CheckoutState>(DEFAULT);
  useEffect(() => {
    setS(getCheckout());
    const cb = () => setS(getCheckout());
    listeners.add(cb);
    return () => { listeners.delete(cb); };
  }, []);
  return s;
}