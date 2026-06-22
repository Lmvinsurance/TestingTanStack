import { createServerFn } from "./react-start-mock";
import type { MenuItemWithDetails, MenuItemWithImages, ItemVariant, OutletVariantPrice } from "./supabase-menu.service";

export const getPublicMenuByCategory = createServerFn({ method: "POST" })
  .inputValidator((data: { categoryId: string; outletId: string }) => data)
  .handler(async ({ data }) => {
    const { categoryId, outletId } = data;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Get active items in this category
    const { data: items, error: itemsError } = await supabaseAdmin
      .from('menu_items')
      .select('*')
      .eq('category_id', categoryId)
      .eq('is_active', true)
      .eq('is_deleted', false)
      .order('item_name');

    if (itemsError) throw itemsError;
    if (!items || items.length === 0) return [];

    let filteredItems = items;
    if (outletId) {
      const itemIds = items.map(item => item.id);
      const { data: availabilityData, error: availabilityError } = await supabaseAdmin
        .from('outlet_item_availability')
        .select('item_id, is_available')
        .eq('outlet_id', outletId)
        .in('item_id', itemIds);

      if (!availabilityError && availabilityData) {
        const availableItemIds = new Set(
          availabilityData
            .filter(a => a.is_available)
            .map(a => a.item_id)
        );
        filteredItems = items.filter(item => availableItemIds.has(item.id));
      } else {
        filteredItems = [];
      }
    }

    if (filteredItems.length === 0) return [];

    const filteredItemIds = filteredItems.map(item => item.id);
    const { data: images } = await supabaseAdmin
      .from('item_images')
      .select('*')
      .in('item_id', filteredItemIds)
      .order('display_order');

    const { data: category } = await supabaseAdmin
      .from('menu_categories')
      .select('category_name')
      .eq('id', categoryId)
      .single();

    return filteredItems.map(item => ({
      ...item,
      category_name: category?.category_name,
      images: (images || []).filter(img => img.item_id === item.id)
    })) as unknown as MenuItemWithImages[];
  });

export const getPublicMenuItemWithDetailsById = createServerFn({ method: "POST" })
  .inputValidator((data: { itemId: string; outletId: string }) => data)
  .handler(async ({ data }) => {
    const { itemId, outletId } = data;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: item, error: itemError } = await supabaseAdmin
      .from('menu_items')
      .select('*')
      .eq('id', itemId)
      .eq('is_active', true)
      .eq('is_deleted', false)
      .single();

    if (itemError || !item) return null;

    const { data: images } = await supabaseAdmin
      .from('item_images')
      .select('*')
      .eq('item_id', itemId)
      .order('display_order');

    const { data: category } = await supabaseAdmin
      .from('menu_categories')
      .select('category_name')
      .eq('id', item.category_id)
      .single();

    const { data: variants, error: variantsError } = await supabaseAdmin
      .from('item_variants')
      .select('*')
      .eq('item_id', item.id)
      .eq('is_active', true)
      .order('variant_name');

    if (variantsError) return null;

    const variantIds = variants.map(v => v.id);
    let outletPrices: OutletVariantPrice[] = [];
    
    if (variantIds.length > 0) {
      const { data: prices, error: pricesError } = await supabaseAdmin
        .from('outlet_variant_prices')
        .select('*')
        .eq('outlet_id', outletId)
        .in('variant_id', variantIds);

      if (!pricesError && prices) {
        outletPrices = prices;
      }
    }

    const { data: availability, error: availabilityError } = await supabaseAdmin
      .from('outlet_item_availability')
      .select('*')
      .eq('outlet_id', outletId)
      .eq('item_id', item.id)
      .single();

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
    } as unknown as MenuItemWithDetails;
  });
