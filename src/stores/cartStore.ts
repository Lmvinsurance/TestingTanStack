import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { menuService } from '@/lib/supabase-menu.service';

export interface CartItem {
  id?: string; // Database ID (if synced)
  itemId: string;
  variantId: string;
  outletId: string;
  quantity: number;
  name: string;
  variantName: string;
  price: number;
  imageUrl?: string;
  specialInstructions?: string;
}

interface CartStore {
  items: CartItem[];
  isLoading: boolean;
  
  // Actions
  addItem: (item: Omit<CartItem, 'id'>, userId?: string) => Promise<void>;
  removeItem: (itemId: string, variantId: string, userId?: string) => Promise<void>;
  updateQuantity: (itemId: string, variantId: string, quantity: number, userId?: string) => Promise<void>;
  clearCart: (userId?: string) => Promise<void>;
  syncWithDatabase: (userId: string) => Promise<void>;
  
  // Getters
  getTotalItems: () => number;
  getTotalPrice: () => number;
  getItemCount: (itemId: string, variantId: string) => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isLoading: false,

      addItem: async (newItem, userId) => {
        set({ isLoading: true });
        
        // Update local state
        set((state) => {
          const existingIndex = state.items.findIndex(
            (item) => item.itemId === newItem.itemId && item.variantId === newItem.variantId
          );

          if (existingIndex >= 0) {
            const updatedItems = [...state.items];
            updatedItems[existingIndex] = {
              ...updatedItems[existingIndex],
              quantity: updatedItems[existingIndex].quantity + newItem.quantity,
            };
            return { items: updatedItems };
          } else {
            return { items: [...state.items, { ...newItem, id: undefined }] };
          }
        });

        // Sync with database if user is logged in
        if (userId) {
          try {
            await menuService.addToCart(
              userId,
              newItem.outletId,
              newItem.itemId,
              newItem.variantId,
              newItem.quantity,
              newItem.price,
              newItem.specialInstructions
            );
          } catch (error) {
            console.error('Error syncing cart to database:', error);
          }
        }

        set({ isLoading: false });
      },

      removeItem: async (itemId, variantId, userId) => {
        set((state) => {
          const itemToRemove = state.items.find(
            (item) => item.itemId === itemId && item.variantId === variantId
          );

          // Remove from database if synced
          if (userId && itemToRemove?.id) {
            menuService.removeFromCart(itemToRemove.id);
          }

          return {
            items: state.items.filter(
              (item) => !(item.itemId === itemId && item.variantId === variantId)
            ),
          };
        });
      },

      updateQuantity: async (itemId, variantId, quantity, userId) => {
        set((state) => {
          const updatedItems = state.items.map((item) =>
            item.itemId === itemId && item.variantId === variantId
              ? { ...item, quantity: Math.max(1, quantity) }
              : item
          );

          // Update in database
          const updatedItem = updatedItems.find(
            (item) => item.itemId === itemId && item.variantId === variantId
          );

          if (userId && updatedItem?.id) {
            menuService.addToCart(
              userId,
              updatedItem.outletId,
              updatedItem.itemId,
              updatedItem.variantId,
              updatedItem.quantity,
              updatedItem.price,
              updatedItem.specialInstructions
            );
          }

          return { items: updatedItems };
        });
      },

      clearCart: async (userId) => {
        if (userId) {
          await menuService.clearCart(userId);
        }
        set({ items: [] });
      },

      syncWithDatabase: async (userId) => {
        if (!userId) return;
        
        set({ isLoading: true });
        try {
          const dbItems = await menuService.getCartItems(userId);
          
          // Convert database items to cart items
          const syncedItems: CartItem[] = dbItems.map((dbItem) => ({
            id: dbItem.id,
            itemId: dbItem.item_id,
            variantId: dbItem.variant_id,
            outletId: dbItem.outlet_id,
            quantity: dbItem.quantity,
            name: dbItem.menu_item?.item_name || 'Unknown Item',
            variantName: dbItem.variant?.variant_name || 'Standard',
            price: dbItem.unit_price,
            imageUrl: dbItem.menu_item?.images?.find((img: any) => img.is_primary)?.image_url,
            specialInstructions: dbItem.special_instructions,
          }));

          // Merge with local items (prefer database)
          set((state) => {
            // If there are local items not in database, add them
            const localItems = state.items.filter(
              (item) => !syncedItems.some(
                (dbItem) => dbItem.itemId === item.itemId && dbItem.variantId === item.variantId
              )
            );
            
            return { items: [...syncedItems, ...localItems] };
          });
        } catch (error) {
          console.error('Error syncing cart:', error);
        } finally {
          set({ isLoading: false });
        }
      },

      getTotalItems: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0);
      },

      getTotalPrice: () => {
        return get().items.reduce((total, item) => total + item.price * item.quantity, 0);
      },

      getItemCount: (itemId, variantId) => {
        const item = get().items.find(
          (i) => i.itemId === itemId && i.variantId === variantId
        );
        return item?.quantity || 0;
      },
    }),
    {
      name: 'cart-storage',
      partialize: (state) => ({
        items: state.items,
      }),
    }
  )
);