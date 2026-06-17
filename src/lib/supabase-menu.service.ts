import { supabase } from "@/integrations/supabase/client";

// Types
export interface MenuCategory {
  id: string;
  category_name: string;
  description?: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MenuItemImage {
  id: string;
  item_id: string;
  image_url: string;
  is_primary: boolean;
  alt_text?: string;
  display_order: number;
}

export interface MenuItemWithImages {
  id: string;
  item_name: string;
  slug: string;
  category_id: string;
  category_name?: string;
  short_description?: string;
  long_description?: string;
  is_vegetarian: boolean;
  is_vegan: boolean;
  is_gluten_free: boolean;
  spice_level?: 'mild' | 'medium' | 'spicy' | 'extra_spicy';
  meal_timing?: 'breakfast' | 'lunch' | 'dinner' | 'all_day';
  is_recommended: boolean;
  is_bestseller: boolean;
  is_new: boolean;
  is_active: boolean;
  is_deleted: boolean;
  preparation_time?: number;
  dietary_tags?: string[];
  nutritional_info?: {
    calories?: string;
    protein?: string;
    carbs?: string;
    fat?: string;
  };
  images: MenuItemImage[];
  created_at: string;
  updated_at: string;
}

export interface ItemVariant {
  id: string;
  item_id: string;
  variant_name: string;
  quantity_label: string | null;
  serves_count: number | null;
  base_price: number;
  is_active: boolean;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface OutletVariantPrice {
  id: string;
  outlet_id: string;
  item_id: string;
  variant_id: string;
  selling_price: number;
  mrp_price: number | null;
  is_available: boolean;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface OutletItemAvailability {
  id: string;
  outlet_id: string;
  item_id: string;
  is_available: boolean;
  stock_status: 'available' | 'limited' | 'sold_out';
  available_from: string | null;
  available_to: string | null;
  updated_by: string | null;
  updated_at: string;
}

export interface MenuItemWithDetails extends MenuItemWithImages {
  variants: (ItemVariant & {
    outlet_price: OutletVariantPrice | null;
  })[];
  outlet_availability: OutletItemAvailability | null;
}

class MenuService {
  /**
   * Get all active categories
   */
  async getCategories(): Promise<MenuCategory[]> {
    const { data, error } = await supabase
      .from('menu_categories')
      .select('*')
      .eq('is_active', true)
      .order('display_order');

    if (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Get menu items by category with images
   */
  async getMenuItemsByCategory(categoryId: string): Promise<MenuItemWithImages[]> {
    // First get the menu items
    const { data: items, error: itemsError } = await supabase
      .from('menu_items')
      .select('*')
      .eq('category_id', categoryId)
      .eq('is_active', true)
      .eq('is_deleted', false)
      .order('item_name');

    if (itemsError) {
      console.error('Error fetching menu items:', itemsError);
      throw itemsError;
    }

    if (!items || items.length === 0) {
      return [];
    }

    // Get images for these items
    const itemIds = items.map(item => item.id);
    const { data: images, error: imagesError } = await supabase
      .from('item_images')
      .select('*')
      .in('item_id', itemIds)
      .order('display_order');

    if (imagesError) {
      console.error('Error fetching images:', imagesError);
      // Continue without images
    }

    // Get category name
    const { data: category } = await supabase
      .from('menu_categories')
      .select('category_name')
      .eq('id', categoryId)
      .single();

    // Combine items with their images
    return items.map(item => ({
      ...item,
      category_name: category?.category_name,
      images: (images || []).filter(img => img.item_id === item.id)
    }));
  }

  /**
   * Get a single menu item by ID with variants and pricing
   */
  async getMenuItemWithDetailsById(itemId: string, outletId: string): Promise<MenuItemWithDetails | null> {
    try {
      // 1. Get the menu item
      const { data: item, error: itemError } = await supabase
        .from('menu_items')
        .select('*')
        .eq('id', itemId)
        .eq('is_active', true)
        .eq('is_deleted', false)
        .single();

      if (itemError || !item) {
        console.error('Error fetching menu item:', itemError);
        return null;
      }

      // Get images for this item
      const { data: images, error: imagesError } = await supabase
        .from('item_images')
        .select('*')
        .eq('item_id', itemId)
        .order('display_order');

      if (imagesError) {
        console.error('Error fetching images:', imagesError);
      }

      // Get category name
      const { data: category } = await supabase
        .from('menu_categories')
        .select('category_name')
        .eq('id', item.category_id)
        .single();

      // 2. Get variants for this item
      const { data: variants, error: variantsError } = await supabase
        .from('item_variants')
        .select('*')
        .eq('item_id', item.id)
        .eq('is_active', true)
        .order('variant_name');

      if (variantsError) {
        console.error('Error fetching variants:', variantsError);
        return null;
      }

      // 3. Get outlet prices for these variants
      const variantIds = variants.map(v => v.id);
      let outletPrices: OutletVariantPrice[] = [];
      
      if (variantIds.length > 0) {
        const { data: prices, error: pricesError } = await supabase
          .from('outlet_variant_prices')
          .select('*')
          .eq('outlet_id', outletId)
          .in('variant_id', variantIds);

        if (!pricesError && prices) {
          outletPrices = prices;
        }
      }

      // 4. Get outlet availability
      const { data: availability, error: availabilityError } = await supabase
        .from('outlet_item_availability')
        .select('*')
        .eq('outlet_id', outletId)
        .eq('item_id', item.id)
        .single();

      // Combine data
      const variantsWithPrices = variants.map(variant => ({
        ...variant,
        outlet_price: outletPrices.find(p => p.variant_id === variant.id) || null
      }));

      return {
        ...item,
        category_name: category?.category_name,
        images: images || [],
        variants: variantsWithPrices,
        outlet_availability: availabilityError ? null : availability
      };
    } catch (error) {
      console.error('Error in getMenuItemWithDetailsById:', error);
      return null;
    }
  }

  /**
   * Get a single menu item by slug with variants and pricing
   */
  async getMenuItemWithDetails(slug: string, outletId: string): Promise<MenuItemWithDetails | null> {
    try {
      // 1. Get the menu item
      const { data: item, error: itemError } = await supabase
        .from('menu_items')
        .select('*')
        .eq('slug', slug)
        .eq('is_active', true)
        .eq('is_deleted', false)
        .single();

      if (itemError || !item) {
        console.error('Error fetching menu item:', itemError);
        return null;
      }

      // Get images for this item
      const { data: images, error: imagesError } = await supabase
        .from('item_images')
        .select('*')
        .eq('item_id', item.id)
        .order('display_order');

      if (imagesError) {
        console.error('Error fetching images:', imagesError);
      }

      // Get category name
      const { data: category } = await supabase
        .from('menu_categories')
        .select('category_name')
        .eq('id', item.category_id)
        .single();

      // 2. Get variants for this item
      const { data: variants, error: variantsError } = await supabase
        .from('item_variants')
        .select('*')
        .eq('item_id', item.id)
        .eq('is_active', true)
        .order('variant_name');

      if (variantsError) {
        console.error('Error fetching variants:', variantsError);
        return null;
      }

      // 3. Get outlet prices for these variants
      const variantIds = variants.map(v => v.id);
      let outletPrices: OutletVariantPrice[] = [];
      
      if (variantIds.length > 0) {
        const { data: prices, error: pricesError } = await supabase
          .from('outlet_variant_prices')
          .select('*')
          .eq('outlet_id', outletId)
          .in('variant_id', variantIds);

        if (!pricesError && prices) {
          outletPrices = prices;
        }
      }

      // 4. Get outlet availability
      const { data: availability, error: availabilityError } = await supabase
        .from('outlet_item_availability')
        .select('*')
        .eq('outlet_id', outletId)
        .eq('item_id', item.id)
        .single();

      // Combine data
      const variantsWithPrices = variants.map(variant => ({
        ...variant,
        outlet_price: outletPrices.find(p => p.variant_id === variant.id) || null
      }));

      return {
        ...item,
        category_name: category?.category_name,
        images: images || [],
        variants: variantsWithPrices,
        outlet_availability: availabilityError ? null : availability
      };
    } catch (error) {
      console.error('Error in getMenuItemWithDetails:', error);
      return null;
    }
  }
}

export const menuService = new MenuService();