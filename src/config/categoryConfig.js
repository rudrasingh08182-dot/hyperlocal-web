// src/config/categoryConfig.js
//
// The "brain" of the Intelligent Product Builder. Adding a new category
// later should mean adding a new entry here — NOT touching the Add/Edit
// Product UI components.
//
// Field shape: { key, label, type: 'text'|'number'|'select'|'textarea', options?, required? }
// stockMode:
//   'managed'   — plain required stock number (default for anything unlisted)
//   'optional'  — stock is optional; blank = always "In Stock" (sweets rule)
//   'variant'   — stock lives on variant combinations; base stock defaults to 0
//
// NOTE: gender/footwear_type stay as their own dedicated product columns
// (not inside `attributes`) because existing buyer-side filtering already
// depends on those exact columns — see `extraFields` below.

export const CATEGORY_CONFIG = {
  fashion: {
    label: '👕 Fashion / Clothing',
    units: ['piece', 'pair', 'set'],
    defaultReturnPolicy: 'FASHION',
    stockMode: 'variant',
    attributeFields: [
      { key: 'brand', label: 'Brand', type: 'text' },
      { key: 'material', label: 'Fabric / Material', type: 'text' },
      { key: 'pattern', label: 'Pattern', type: 'text' },
      { key: 'fit', label: 'Fit', type: 'select', options: ['Regular', 'Slim', 'Loose', 'Relaxed'] },
      { key: 'gender', label: 'Gender', type: 'select', options: ['Men', 'Women', 'Unisex', 'Kids'] },
      { key: 'sleeve_type', label: 'Sleeve Type', type: 'text' },
      { key: 'neck_type', label: 'Neck Type', type: 'text' },
      { key: 'occasion', label: 'Occasion', type: 'text' },
      { key: 'season', label: 'Season', type: 'select', options: ['Summer', 'Winter', 'All Season'] },
    ],
    variantPreset: [
      { name: 'Color', hasImages: true },
      { name: 'Size', hasImages: false },
    ],
  },

  footwear: {
    label: '👟 Footwear',
    units: ['pair', 'piece'],
    defaultReturnPolicy: 'FASHION',
    stockMode: 'variant',
    extraFields: ['gender', 'footwear_type'], // existing dedicated columns — not in attributes
    attributeFields: [
      { key: 'brand', label: 'Brand', type: 'text' },
      { key: 'material', label: 'Material', type: 'text' },
      { key: 'sole_material', label: 'Sole Material', type: 'text' },
      { key: 'closure_type', label: 'Closure Type', type: 'text' },
      { key: 'occasion', label: 'Occasion', type: 'text' },
      { key: 'pattern', label: 'Pattern', type: 'text' },
    ],
    variantPreset: [
      { name: 'Color', hasImages: true },
      { name: 'Size', hasImages: false },
    ],
  },

  supplements: {
    label: '💊 Supplements',
    units: ['jar', 'bottle', 'pouch', 'packet', 'box', 'pack', 'piece', 'kg', 'g'],
    defaultReturnPolicy: 'PACKAGED_FOOD',
    stockMode: 'managed',
    attributeFields: [
      { key: 'brand', label: 'Brand', type: 'text' },
      { key: 'supplement_type', label: 'Supplement Type', type: 'select', options: [
        'Protein', 'Mass Gainer', 'Creatine', 'Pre-Workout', 'BCAA / EAA', 'Multivitamin',
        'Vitamins & Minerals', 'Omega-3 / Fish Oil', 'Ayurvedic / Herbal', 'Fat Burner', 'Health Drink', 'Other',
      ] },
      { key: 'product_form', label: 'Form', type: 'select', options: ['Powder', 'Capsule', 'Tablet', 'Softgel', 'Gummies', 'Liquid', 'Bar'] },
      { key: 'net_quantity', label: 'Net Quantity (e.g. 1 kg / 60 capsules)', type: 'text' },
      { key: 'serving_size', label: 'Serving Size (e.g. 33 g / 1 scoop)', type: 'text' },
      { key: 'servings_per_container', label: 'Servings per Container', type: 'number' },
      { key: 'flavour', label: 'Flavour', type: 'text' },
      { key: 'dietary_type', label: 'Dietary Type', type: 'select', options: ['Veg', 'Non-Veg'] },
      { key: 'suitable_for', label: 'Suitable For', type: 'select', options: ['Men', 'Women', 'Unisex', 'Adults', 'Kids'] },
      { key: 'key_ingredients', label: 'Key Ingredients', type: 'textarea' },
      { key: 'nutrition_info', label: 'Nutrition / Supplement Facts (per serving)', type: 'textarea' },
      { key: 'directions', label: 'Directions for Use', type: 'textarea' },
      { key: 'warnings', label: 'Warnings / Allergen Info', type: 'textarea' },
      { key: 'manufacturer', label: 'Manufacturer / Marketed By', type: 'text' },
      { key: 'fssai_license', label: 'FSSAI License No.', type: 'text' },
      { key: 'batch_number', label: 'Batch No.', type: 'text' },
      { key: 'mfg_date', label: 'Manufacturing Date (MM/YYYY)', type: 'text' },
      { key: 'expiry_date', label: 'Expiry Date (MM/YYYY)', type: 'text' },
      { key: 'country_of_origin', label: 'Country of Origin', type: 'text' },
      { key: 'storage', label: 'Storage Instructions', type: 'text' },
    ],
    variantPreset: [
      { name: 'Flavor', hasImages: false },
      { name: 'Pack Size', hasImages: false },
    ],
  },

  sweets: {
    label: '🍬 Sweets & Confectionery',
    units: ['piece', 'box', 'kg', 'g', 'dozen'],
    defaultReturnPolicy: 'PACKAGED_FOOD',
    stockMode: 'optional', // ← mandatory rule: stock optional, defaults to In Stock
    attributeFields: [
      { key: 'ingredients', label: 'Ingredients', type: 'textarea' },
      { key: 'flavour', label: 'Flavour', type: 'text' },
      { key: 'box_size', label: 'Box Size', type: 'text' },
      { key: 'pieces_per_box', label: 'Pieces per Box', type: 'number' },
      { key: 'packaging_type', label: 'Packaging Type', type: 'text' },
      { key: 'shelf_life', label: 'Shelf Life', type: 'text' },
      { key: 'storage_instructions', label: 'Storage Instructions', type: 'textarea' },
      { key: 'is_veg', label: 'Vegetarian', type: 'select', options: ['Veg', 'Non-Veg'] },
    ],
    // Optional — lets a seller do "250g / 500g / 1kg" style multi-pricing
    // if they want to, without forcing it.
    variantPreset: [{ name: 'Weight', hasImages: false }],
  },

  grocery: {
    label: '🛒 Grocery',
    units: ['g', 'kg', 'ml', 'litre', 'piece', 'pack', 'packet', 'bottle', 'jar', 'box', 'dozen'],
    defaultReturnPolicy: 'GROCERY',
    stockMode: 'managed',
    attributeFields: [
      { key: 'brand', label: 'Brand', type: 'text' },
      { key: 'net_quantity', label: 'Net Quantity', type: 'text' },
      { key: 'ingredients', label: 'Ingredients', type: 'textarea' },
      { key: 'manufacturer', label: 'Manufacturer', type: 'text' },
      { key: 'country_of_origin', label: 'Country of Origin', type: 'text' },
      { key: 'expiry', label: 'Expiry / Best Before', type: 'text' },
      { key: 'storage', label: 'Storage Instructions', type: 'text' },
    ],
    variantPreset: [{ name: 'Pack Size', hasImages: false }],
  },
};

// Fallback for any category not yet given a rich definition (fresh, food,
// beauty, kids_zone) — keeps AdminAddProduct working for them without
// forcing a rebuild every time a new category is data-defined later.
export const DEFAULT_CATEGORY_CONFIG = {
  label: 'Other',
  units: ['piece'],
  defaultReturnPolicy: 'GROCERY',
  stockMode: 'managed',
  attributeFields: [{ key: 'brand', label: 'Brand', type: 'text' }],
  variantPreset: [],
  maxImages: 5,
};

// Resolves the final, flat config an item should render from — merging a
// chosen subcategory over its parent's defaults where the subcategory
// doesn't override something.
export function resolveCategoryConfig(category, subcategory) {
  const base = CATEGORY_CONFIG[category] || DEFAULT_CATEGORY_CONFIG;

  if (base.subcategories) {
    if (!subcategory) return null; // caller must ask for a subcategory first
    const sub = base.subcategories[subcategory];
    if (!sub) return null;
    return {
      label: sub.label || base.label,
      units: sub.units || base.units || ['piece'],
      defaultReturnPolicy: sub.defaultReturnPolicy || base.defaultReturnPolicy || 'GROCERY',
      stockMode: sub.stockMode || base.stockMode || 'managed',
      attributeFields: sub.attributeFields || base.attributeFields || [],
      variantPreset: sub.variantPreset || base.variantPreset || [],
      extraFields: sub.extraFields || base.extraFields || [],
      maxImages: sub.maxImages || base.maxImages || 5,
    };
  }

  return {
    maxImages: 5,
    extraFields: [],
    ...DEFAULT_CATEGORY_CONFIG,
    ...base,
  };
}

export const CATEGORY_OPTIONS_LIST = [
  { value: 'grocery', label: '🛒 Grocery' },
  { value: 'fresh', label: '🥬 Fresh' },
  { value: 'supplements', label: '💊 Supplements' },
  { value: 'fashion', label: '👕 Fashion' },
  { value: 'food', label: '🍔 Food' },
  { value: 'sweets', label: '🍬 Sweets & Confectionery' },
  { value: 'beauty', label: '💄 Beauty & Accessories' },
  { value: 'footwear', label: '👟 Footwear' },
  { value: 'kids_zone', label: "🧸 Kid's Zone" },
];