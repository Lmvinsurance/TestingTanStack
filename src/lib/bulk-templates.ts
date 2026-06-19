// Shared module registry used by the Bulk Upload UI for templates,
// column hints, and client-side validation. Server bulk-insert reads
// the same key and validates again. Keep in sync with
// src/lib/admin-bulk.functions.ts.

export type ColumnType = "string" | "number" | "boolean" | "time" | "enum";

export interface ColumnSpec {
  name: string;
  type: ColumnType;
  required?: boolean;
  hint?: string;
  example?: string | number | boolean;
  enumValues?: string[];
  /** When set, value is an FK reference looked up by this human key on the server. */
  fk?: string;
}

export interface ModuleSpec {
  key: BulkModuleKey;
  label: string;
  table: string;
  description: string;
  columns: ColumnSpec[];
}

export type BulkModuleKey =
  | "outlets"
  | "cuisines"
  | "dietary"
  | "categories"
  | "subcategories"
  | "items"
  | "variants"
  | "addons"
  | "item_addons";

export const BULK_MODULES: Record<BulkModuleKey, ModuleSpec> = {
  outlets: {
    key: "outlets",
    label: "Outlets",
    table: "outlets",
    description: "Restaurant outlets / branches.",
    columns: [
      { name: "outlet_name", type: "string", required: true, example: "TFC Hyderabad" },
      { name: "outlet_code", type: "string", required: true, example: "TFC-HYD" },
      { name: "phone", type: "string", example: "9876543210" },
      { name: "email", type: "string", example: "hyd@example.com" },
      { name: "address", type: "string", example: "Road No 12, Banjara Hills" },
      { name: "city", type: "string", example: "Hyderabad" },
      { name: "state", type: "string", example: "Telangana" },
      { name: "pincode", type: "string", example: "500034" },
      { name: "latitude", type: "number", example: 17.4126 },
      { name: "longitude", type: "number", example: 78.4071 },
      { name: "opening_time", type: "time", hint: "HH:MM (24h)", example: "10:00" },
      { name: "closing_time", type: "time", hint: "HH:MM (24h)", example: "23:00" },
      { name: "is_active", type: "boolean", example: true },
    ],
  },
  cuisines: {
    key: "cuisines",
    label: "Cuisine Types",
    table: "cuisine_types",
    description: "Cuisine tags for menu items.",
    columns: [
      { name: "cuisine_name", type: "string", required: true, example: "Andhra" },
      { name: "is_active", type: "boolean", example: true },
    ],
  },
  dietary: {
    key: "dietary",
    label: "Dietary Types",
    table: "dietary_types",
    description: "Veg / Non-veg / Vegan style dietary tags.",
    columns: [
      { name: "dietary_name", type: "string", required: true, example: "Vegetarian" },
      { name: "dietary_code", type: "string", required: true, hint: "Short code, uppercased", example: "VEG" },
      { name: "is_active", type: "boolean", example: true },
    ],
  },
  categories: {
    key: "categories",
    label: "Menu Categories",
    table: "menu_categories",
    description: "Top-level menu categories (e.g. Biryani, Starters).",
    columns: [
      { name: "category_name", type: "string", required: true, example: "Biryani" },
      { name: "slug", type: "string", required: true, example: "biryani" },
      { name: "description", type: "string", example: "House special biryanis" },
      { name: "display_order", type: "number", example: 1 },
      { name: "image_url", type: "string", example: "https://..." },
      { name: "is_active", type: "boolean", example: true },
    ],
  },
  subcategories: {
    key: "subcategories",
    label: "Menu Subcategories",
    table: "menu_subcategories",
    description: "Subcategories nested under a category.",
    columns: [
      { name: "category_slug", type: "string", required: true, fk: "categories.slug", example: "biryani" },
      { name: "subcategory_name", type: "string", required: true, example: "Veg Biryani" },
      { name: "slug", type: "string", required: true, example: "veg-biryani" },
      { name: "description", type: "string" },
      { name: "display_order", type: "number", example: 1 },
      { name: "is_active", type: "boolean", example: true },
    ],
  },
  items: {
    key: "items",
    label: "Menu Items",
    table: "menu_items",
    description: "Menu items. Links via slugs / codes (resolved server-side).",
    columns: [
      { name: "category_slug", type: "string", required: true, fk: "categories.slug", example: "biryani" },
      { name: "subcategory_slug", type: "string", fk: "subcategories.slug", example: "veg-biryani" },
      { name: "cuisine_name", type: "string", fk: "cuisine_types.cuisine_name", example: "Andhra" },
      { name: "dietary_code", type: "string", fk: "dietary_types.dietary_code", example: "VEG" },
      { name: "item_name", type: "string", required: true, example: "Hyderabadi Veg Dum Biryani" },
      { name: "slug", type: "string", required: true, example: "hyderabadi-veg-dum-biryani" },
      { name: "short_description", type: "string" },
      { name: "full_description", type: "string" },
      { name: "ingredients", type: "string" },
      { name: "spice_level", type: "enum", enumValues: ["mild", "medium", "spicy", "extra_spicy"], example: "medium" },
      { name: "preparation_type", type: "string", example: "Dum cooked" },
      { name: "meal_timing", type: "enum", enumValues: ["breakfast", "lunch", "dinner", "all_day"], example: "all_day" },
      { name: "is_bestseller", type: "boolean", example: false },
      { name: "is_recommended", type: "boolean", example: false },
      { name: "is_new", type: "boolean", example: false },
      { name: "is_active", type: "boolean", example: true },
    ],
  },
  variants: {
    key: "variants",
    label: "Item Variants",
    table: "item_variants",
    description: "Variants per item (e.g. Half/Full, Regular/Family Pack).",
    columns: [
      { name: "item_slug", type: "string", required: true, fk: "menu_items.slug", example: "hyderabadi-veg-dum-biryani" },
      { name: "variant_name", type: "string", required: true, example: "Full" },
      { name: "quantity_label", type: "string", example: "750g" },
      { name: "serves_count", type: "number", example: 2 },
      { name: "base_price", type: "number", required: true, example: 299 },
      { name: "is_active", type: "boolean", example: true },
    ],
  },
  addons: {
    key: "addons",
    label: "Add-ons",
    table: "addons",
    description: "Item add-ons (e.g. Extra Raita, Boiled Egg).",
    columns: [
      { name: "addon_name", type: "string", required: true, example: "Extra Raita" },
      { name: "description", type: "string" },
      { name: "price", type: "number", required: true, example: 30 },
      { name: "is_active", type: "boolean", example: true },
    ],
  },
  item_addons: {
    key: "item_addons",
    label: "Item ↔ Add-on Mapping",
    table: "item_addons",
    description: "Attach add-ons to items by slug / name.",
    columns: [
      { name: "item_slug", type: "string", required: true, fk: "menu_items.slug", example: "hyderabadi-veg-dum-biryani" },
      { name: "addon_name", type: "string", required: true, fk: "addons.addon_name", example: "Extra Raita" },
      { name: "is_required", type: "boolean", example: false },
      { name: "max_quantity", type: "number", example: 2 },
    ],
  },
};

export const MODULE_LIST: ModuleSpec[] = Object.values(BULK_MODULES);

// --------- Parsing helpers (client-side) ---------

export function coerceCell(value: unknown, type: ColumnType): unknown {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  if (s === "") return null;
  switch (type) {
    case "number": {
      const n = Number(s);
      return Number.isFinite(n) ? n : null;
    }
    case "boolean": {
      const v = s.toLowerCase();
      if (["true", "1", "yes", "y"].includes(v)) return true;
      if (["false", "0", "no", "n"].includes(v)) return false;
      return null;
    }
    case "time": {
      // accept HH:MM or HH:MM:SS
      const m = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
      if (!m) return null;
      const hh = String(Math.min(23, parseInt(m[1], 10))).padStart(2, "0");
      const mm = m[2];
      return `${hh}:${mm}`;
    }
    case "enum":
    case "string":
    default:
      return s;
  }
}

export function parseRow(
  raw: Record<string, unknown>,
  spec: ModuleSpec,
): { row: Record<string, unknown>; errors: string[] } {
  const row: Record<string, unknown> = {};
  const errors: string[] = [];
  for (const col of spec.columns) {
    const val = coerceCell(raw[col.name], col.type);
    if (col.required && (val === null || val === "")) {
      errors.push(`${col.name} is required`);
    }
    if (col.type === "enum" && val != null && col.enumValues && !col.enumValues.includes(String(val))) {
      errors.push(`${col.name} must be one of ${col.enumValues.join(", ")}`);
    }
    row[col.name] = val;
  }
  return { row, errors };
}

// --------- Template generators ---------

export function buildCsvTemplate(spec: ModuleSpec): string {
  const header = spec.columns.map((c) => c.name).join(",");
  const example = spec.columns
    .map((c) => csvCell(c.example ?? ""))
    .join(",");
  return `${header}\n${example}\n`;
}

function csvCell(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
