// src/components/AdminAddProduct.js
//
// The "Intelligent Product Builder" — category (and subcategory) decides
// exactly which fields, units, and variant presets show up. All of that
// logic lives in src/config/categoryConfig.js — this component just
// renders whatever that config says. Adding a new category later should
// mean editing categoryConfig.js, not this file.

import { useState, useEffect } from 'react';
import API from '../services/api';
import { showToast } from './Toast';
import DynamicAttributeFields from './DynamicAttributeFields';
import { CATEGORY_CONFIG, CATEGORY_OPTIONS_LIST, resolveCategoryConfig } from '../config/categoryConfig';

const RETURN_POLICY_OPTIONS = [
  { value: 'PERISHABLE_FOOD', label: '🥬 Perishable Food (No returns)' },
  { value: 'PACKAGED_FOOD', label: '📦 Packaged Food (2 days)' },
  { value: 'STANDARD_ELECTRONICS', label: '📱 Standard Electronics (7 days)' },
  { value: 'HIGH_VALUE_ELECTRONICS', label: '💎 High Value Electronics (7 days)' },
  { value: 'STATIONERY', label: '✏️ Stationery (2 days)' },
  { value: 'FASHION', label: '👕 Fashion (3 days)' },
  { value: 'GROCERY', label: '🛒 Grocery (1 day)' },
  { value: 'FRESH', label: '🥦 Fresh Produce (No returns)' },
  { value: 'MEDICAL', label: '💊 Medical' },
];

const VARIANT_GROUP_SUGGESTIONS = ['Color', 'Size', 'Storage', 'RAM', 'Weight', 'Flavor', 'Pack Size', 'Material', 'Shade', 'Age Group'];

const sigOf = (selections) =>
  Object.entries(selections)
    .map(([k, v]) => [k.trim().toLowerCase(), String(v).trim().toLowerCase()])
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([k, v]) => `${k}=${v}`)
    .join('|');

const cartesianCombinations = (groups) => {
  const usable = groups.filter((g) => g.name.trim() && g.options.some((o) => o.value.trim()));
  if (usable.length === 0) return [];
  return usable.reduce((acc, group) => {
    const opts = group.options.filter((o) => o.value.trim());
    if (acc.length === 0) return opts.map((o) => ({ [group.name.trim()]: o.value.trim() }));
    const next = [];
    for (const combo of acc) for (const o of opts) next.push({ ...combo, [group.name.trim()]: o.value.trim() });
    return next;
  }, []);
};

const groupsFromPreset = (preset) =>
  (preset && preset.length > 0 ? preset : [{ name: '', hasImages: false }]).map((p) => ({
    name: p.name || '',
    showImages: !!p.hasImages,
    options: [{ value: '', images: [] }],
  }));

function errMsg(err, fallback) {
  const e = err.response?.data?.error;
  return (typeof e === 'object' ? e?.message : e) || fallback;
}

// ── Dark admin theme tokens (matches AdminDashboard.js) ──
const CARD_BG = '#1a1a2e';
const PAGE_BG = '#0a0a1a';
const BORDER = '#2a2a4a';
const ACCENT = '#6c63ff';
const TEXT = '#eee';
const TEXT_FAINT = '#999';
const DANGER = '#ff4444';

const inputStyle = { padding: '11px', border: `1px solid ${BORDER}`, borderRadius: '8px', fontSize: '14px', outline: 'none', width: '100%', boxSizing: 'border-box', background: PAGE_BG, color: TEXT };
const labelStyle = { fontSize: '12px', fontWeight: '600', color: TEXT_FAINT, display: 'block', marginBottom: '6px' };
const theme = { inputStyle, labelStyle };

const UNIT_LABELS = {
  piece: 'Piece', pair: 'Pair', set: 'Set', dozen: 'Dozen', box: 'Box', pack: 'Pack',
  packet: 'Packet', pouch: 'Pouch', bottle: 'Bottle', jar: 'Jar', can: 'Can',
  kg: 'KG', g: 'Gram', mg: 'MG', litre: 'Litre', ml: 'ML',
};

export default function AdminAddProduct() {
  const [sellers, setSellers] = useState([]);
  const [loadingSellers, setLoadingSellers] = useState(true);
  const [shopId, setShopId] = useState('');

  const [category, setCategory] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const parentCfg = category ? (CATEGORY_CONFIG[category] || null) : null;
  const needsSubcategory = !!parentCfg?.subcategories;
  const cfg = category ? resolveCategoryConfig(category, needsSubcategory ? subcategory : undefined) : null;

  const [form, setForm] = useState({ name: '', description: '', sku: '', price: '', stock: '' });
  const [unit, setUnit] = useState('');
  const [returnPolicy, setReturnPolicy] = useState('');
  const [gender, setGender] = useState('');
  const [footwearType, setFootwearType] = useState('');
  const [attributeValues, setAttributeValues] = useState({});

  const [images, setImages] = useState([]);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [hasVariants, setHasVariants] = useState(false);
  const [variantGroups, setVariantGroups] = useState([{ name: '', showImages: false, options: [{ value: '', images: [] }] }]);
  const [variantCombos, setVariantCombos] = useState([]);
  const [variantUploadingFor, setVariantUploadingFor] = useState(null);

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    API.get('/admin/sellers')
      .then((res) => setSellers((res.data || []).filter((s) => s.status === 'approved')))
      .catch(() => showToast('Failed to load shops', 'error'))
      .finally(() => setLoadingSellers(false));
  }, []);

  // Category changed -> subcategory must be re-picked (if applicable)
  useEffect(() => {
    setSubcategory('');
  }, [category]);

  // Config resolved (category, or category+subcategory) -> reset the form to match
  useEffect(() => {
    if (!cfg) return;
    setReturnPolicy(cfg.defaultReturnPolicy);
    setUnit(cfg.units[0]);
    setAttributeValues({});
    setHasVariants(cfg.stockMode === 'variant');
    setVariantGroups(groupsFromPreset(cfg.variantPreset));
    setVariantCombos([]);
    setForm((f) => ({ ...f, stock: '' }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, subcategory]);

  const resetForm = () => {
    setShopId('');
    setCategory('');
    setSubcategory('');
    setForm({ name: '', description: '', sku: '', price: '', stock: '' });
    setUnit('');
    setReturnPolicy('');
    setGender('');
    setFootwearType('');
    setAttributeValues({});
    setImages([]);
    setHasVariants(false);
    setVariantGroups([{ name: '', showImages: false, options: [{ value: '', images: [] }] }]);
    setVariantCombos([]);
  };

  const uploadProductImage = async (file) => {
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const res = await API.post('/uploads/product-image', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setImages((prev) => [...prev, res.data.url]);
    } catch (err) {
      showToast('Image upload failed', 'error');
    } finally {
      setUploadingImage(false);
    }
  };

  const addVariantGroup = () => setVariantGroups((prev) => [...prev, { name: '', showImages: false, options: [{ value: '', images: [] }] }]);
  const removeVariantGroup = (gi) => setVariantGroups((prev) => prev.filter((_, i) => i !== gi));
  const updateVariantGroupName = (gi, name) =>
    setVariantGroups((prev) => prev.map((g, i) => (i === gi ? { ...g, name, showImages: g.showImages || name.toLowerCase().includes('color') } : g)));
  const toggleVariantGroupImages = (gi) => setVariantGroups((prev) => prev.map((g, i) => (i === gi ? { ...g, showImages: !g.showImages } : g)));
  const addVariantOption = (gi) =>
    setVariantGroups((prev) => prev.map((g, i) => (i === gi ? { ...g, options: [...g.options, { value: '', images: [] }] } : g)));
  const removeVariantOption = (gi, oi) =>
    setVariantGroups((prev) => prev.map((g, i) => (i === gi ? { ...g, options: g.options.filter((_, j) => j !== oi) } : g)));
  const updateVariantOptionValue = (gi, oi, value) =>
    setVariantGroups((prev) => prev.map((g, i) => (i === gi ? { ...g, options: g.options.map((o, j) => (j === oi ? { ...o, value } : o)) } : g)));

  const uploadVariantOptionImage = async (gi, oi, file) => {
    const key = `${gi}-${oi}`;
    setVariantUploadingFor(key);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const res = await API.post('/uploads/product-image', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setVariantGroups((prev) =>
        prev.map((g, i) => (i === gi ? { ...g, options: g.options.map((o, j) => (j === oi ? { ...o, images: [...o.images, res.data.url] } : o)) } : g))
      );
    } catch (err) {
      showToast('Image upload failed', 'error');
    } finally {
      setVariantUploadingFor(null);
    }
  };
  const removeVariantOptionImage = (gi, oi, imgIdx) =>
    setVariantGroups((prev) =>
      prev.map((g, i) => (i === gi ? { ...g, options: g.options.map((o, j) => (j === oi ? { ...o, images: o.images.filter((_, k) => k !== imgIdx) } : o)) } : g))
    );

  const generateVariantCombinations = () => {
    const generated = cartesianCombinations(variantGroups);
    if (generated.length === 0) return showToast('Add at least one group with a filled-in option first', 'error');
    const existingBySig = new Map(variantCombos.map((c) => [sigOf(c.selections), c]));
    const next = generated.map((selections) => {
      const sig = sigOf(selections);
      const existing = existingBySig.get(sig);
      return existing ? { ...existing, selections } : { selections, price: '', stock: '', sku: '', is_active: true };
    });
    setVariantCombos(next);
    showToast(`${next.length} combination(s) generated`, 'success');
  };
  const updateVariantCombo = (idx, field, value) => setVariantCombos((prev) => prev.map((c, i) => (i === idx ? { ...c, [field]: value } : c)));

  const submit = async () => {
    if (!shopId) return showToast('Please select a shop', 'error');
    if (!category) return showToast('Please select a category', 'error');
    if (needsSubcategory && !subcategory) return showToast('Please select a product type', 'error');
    if (!cfg) return;
    if (!form.name.trim()) return showToast('Please enter a product name', 'error');
    if (!form.price) return showToast('Please enter a price', 'error');

    const isOptionalStock = cfg.stockMode === 'optional';
    if (!hasVariants && cfg.stockMode !== 'variant' && !isOptionalStock && !form.stock) {
      return showToast('Please enter stock', 'error');
    }
    if (images.length === 0) return showToast('Please add at least one photo', 'error');
    if (cfg.extraFields?.includes('gender') && !gender) return showToast('Please select gender', 'error');
    if (cfg.extraFields?.includes('footwear_type') && !footwearType) return showToast('Please select footwear type', 'error');

    if (hasVariants) {
      for (const g of variantGroups) {
        if (!g.name.trim()) return showToast('Every variant group needs a name', 'error');
        if (g.options.filter((o) => o.value.trim()).length === 0) return showToast(`Group "${g.name}" needs at least one option`, 'error');
      }
      if (variantCombos.length === 0) return showToast('Click "Generate Combinations" first', 'error');
      for (const c of variantCombos) {
        if (c.stock === '' || parseInt(c.stock) < 0) return showToast('Every combination needs a valid stock number', 'error');
      }
    }

    setSaving(true);
    try {
      const createRes = await API.post('/admin/products', {
        seller_id: shopId,
        name: form.name,
        description: form.description,
        sku: form.sku || null,
        price: parseFloat(form.price),
        price_per_kg: unit === 'kg' ? parseFloat(form.price) : null,
        unit_type: unit,
        category,
        subcategory: subcategory || null,
        attributes: attributeValues,
        image_urls: images,
        return_policy: returnPolicy,
        stock: hasVariants ? 0 : (form.stock ? parseInt(form.stock) : (isOptionalStock ? '' : 0)),
        gender: cfg.extraFields?.includes('gender') ? gender : null,
        footwear_type: cfg.extraFields?.includes('footwear_type') ? footwearType : null,
        variants: [],
      });
      const product = createRes.data.product;

      if (hasVariants) {
        await API.post(`/admin/products/${product.id}/variants`, {
          variantGroups: variantGroups.map((g, gi) => ({
            name: g.name.trim(),
            displayOrder: gi,
            options: g.options.filter((o) => o.value.trim()).map((o, oi) => ({ value: o.value.trim(), displayOrder: oi, images: o.images })),
          })),
          combinations: variantCombos.map((c, ci) => ({
            selections: c.selections,
            price: c.price !== '' ? parseFloat(c.price) : null,
            stock: parseInt(c.stock),
            sku: c.sku || null,
            displayOrder: ci,
          })),
        });
      }

      showToast('Product added to shop! 🎉', 'success');
      resetForm();
    } catch (err) {
      showToast(errMsg(err, 'Failed to add product'), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ background: CARD_BG, borderRadius: '16px', padding: '24px', border: `1px solid ${BORDER}`, maxWidth: '740px' }}>
      <h2 style={{ margin: '0 0 6px', color: 'white' }}>➕ Add Product to a Shop</h2>
      <p style={{ color: TEXT_FAINT, fontSize: '13px', marginBottom: '20px' }}>
        Category decides the fields — select a shop and category to see exactly what this product type needs.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: needsSubcategory ? '1fr 1fr 1fr' : '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
        <div>
          <label style={labelStyle}>Shop *</label>
          <select value={shopId} onChange={(e) => setShopId(e.target.value)} style={inputStyle} disabled={loadingSellers}>
            <option value="">{loadingSellers ? 'Loading shops...' : 'Select a shop...'}</option>
            {sellers.map((s) => (
              <option key={s.id} value={s.id}>{s.shop_name}{s.locality ? ` — ${s.locality}` : ''}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={labelStyle}>Category *</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)} style={inputStyle}>
            <option value="">Select category...</option>
            {CATEGORY_OPTIONS_LIST.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>

        {needsSubcategory && (
          <div>
            <label style={labelStyle}>Product Type *</label>
            <select value={subcategory} onChange={(e) => setSubcategory(e.target.value)} style={inputStyle}>
              <option value="">Select type...</option>
              {Object.entries(parentCfg.subcategories).map(([key, s]) => (
                <option key={key} value={key}>{s.label}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {cfg && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={labelStyle}>Product Name *</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={inputStyle} />
            </div>

            <div>
              <label style={labelStyle}>SKU (optional)</label>
              <input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} style={inputStyle} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={labelStyle}>Price (₹) *</label>
                <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Unit</label>
                <select value={unit} onChange={(e) => setUnit(e.target.value)} style={inputStyle}>
                  {cfg.units.map((u) => <option key={u} value={u}>{UNIT_LABELS[u] || u}</option>)}
                </select>
              </div>
            </div>

            {!hasVariants && cfg.stockMode !== 'variant' && (
              <div>
                <label style={labelStyle}>
                  Stock {cfg.stockMode === 'optional' ? '(optional — leave blank for always In Stock)' : '*'}
                </label>
                <input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })}
                  placeholder={cfg.stockMode === 'optional' ? 'Leave blank = In Stock' : ''} style={inputStyle} />
              </div>
            )}

            {cfg.extraFields?.includes('gender') && (
              <div>
                <label style={labelStyle}>Gender *</label>
                <select value={gender} onChange={(e) => setGender(e.target.value)} style={inputStyle}>
                  <option value="">Select...</option>
                  <option value="men">Men</option>
                  <option value="women">Women</option>
                </select>
              </div>
            )}
            {cfg.extraFields?.includes('footwear_type') && (
              <div>
                <label style={labelStyle}>Footwear Type *</label>
                <select value={footwearType} onChange={(e) => setFootwearType(e.target.value)} style={inputStyle}>
                  <option value="">Select...</option>
                  <option value="slippers">Slippers</option>
                  <option value="sandals">Sandals</option>
                  <option value="shoes">Shoes</option>
                </select>
              </div>
            )}
          </div>

          {/* Category-specific attributes — fully dynamic, driven by categoryConfig.js */}
          {cfg.attributeFields.length > 0 && (
            <div style={{ marginBottom: '4px' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: ACCENT, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '10px' }}>
                {cfg.label} Details
              </div>
              <DynamicAttributeFields
                fields={cfg.attributeFields}
                values={attributeValues}
                onChange={(key, value) => setAttributeValues((prev) => ({ ...prev, [key]: value }))}
                theme={theme}
              />
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={labelStyle}>Description</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                style={{ ...inputStyle, height: '70px', resize: 'none' }} />
            </div>

            <div style={{ gridColumn: 'span 2' }}>
              <label style={labelStyle}>Return Policy</label>
              <select value={returnPolicy} onChange={(e) => setReturnPolicy(e.target.value)} style={inputStyle}>
                {RETURN_POLICY_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle}>📷 Product Photos * (max {cfg.maxImages})</label>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {images.map((url, i) => (
                <div key={i} style={{ position: 'relative' }}>
                  <img src={url} alt="" style={{ width: '80px', height: '80px', borderRadius: '10px', objectFit: 'cover', border: `2px solid ${BORDER}` }} />
                  <button onClick={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
                    style={{ position: 'absolute', top: '-8px', right: '-8px', background: DANGER, color: 'white', border: 'none', borderRadius: '50%', width: '22px', height: '22px', cursor: 'pointer', fontSize: '13px' }}>✕</button>
                </div>
              ))}
              {images.length < cfg.maxImages && (
                <label style={{ width: '80px', height: '80px', border: `2px dashed ${ACCENT}`, borderRadius: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: uploadingImage ? 'not-allowed' : 'pointer', color: ACCENT, background: PAGE_BG }}>
                  {uploadingImage ? <span style={{ fontSize: '20px' }}>⏳</span> : <span style={{ fontSize: '24px' }}>📷</span>}
                  <input type="file" accept="image/*" style={{ display: 'none' }} disabled={uploadingImage}
                    onChange={(e) => { const f = e.target.files[0]; if (f) uploadProductImage(f); e.target.value = ''; }} />
                </label>
              )}
            </div>
          </div>

          <div style={{ marginBottom: '20px', borderTop: `1px solid ${BORDER}`, paddingTop: '16px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: '600', fontSize: '14px', color: 'white', marginBottom: '12px' }}>
              <input type="checkbox" checked={hasVariants} onChange={(e) => setHasVariants(e.target.checked)} style={{ width: '18px', height: '18px' }} />
              This Product Has Variants (Color, Size, RAM, Weight — any combination)
            </label>

            {hasVariants && (
              <>
                {variantGroups.map((g, gi) => (
                  <div key={gi} style={{ border: `1px solid ${BORDER}`, borderRadius: '12px', padding: '16px', marginBottom: '14px', background: PAGE_BG }}>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '12px' }}>
                      <input list={`admin-group-suggestions-${gi}`} placeholder="Group name (e.g. Color, Size, RAM)" value={g.name}
                        onChange={(e) => updateVariantGroupName(gi, e.target.value)}
                        style={{ flex: 1, padding: '10px 12px', border: `1px solid ${BORDER}`, borderRadius: '8px', fontSize: '14px', background: CARD_BG, color: TEXT }} />
                      <datalist id={`admin-group-suggestions-${gi}`}>
                        {VARIANT_GROUP_SUGGESTIONS.map((n) => <option key={n} value={n} />)}
                      </datalist>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: TEXT_FAINT, whiteSpace: 'nowrap' }}>
                        <input type="checkbox" checked={g.showImages} onChange={() => toggleVariantGroupImages(gi)} /> Has images
                      </label>
                      {variantGroups.length > 1 && (
                        <button onClick={() => removeVariantGroup(gi)} style={{ background: '#ff444422', color: DANGER, border: 'none', borderRadius: '8px', padding: '8px 12px', cursor: 'pointer' }}>✕</button>
                      )}
                    </div>

                    {g.options.map((o, oi) => (
                      <div key={oi} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', marginBottom: '10px' }}>
                        <input placeholder="Option value (e.g. Black, 128GB)" value={o.value}
                          onChange={(e) => updateVariantOptionValue(gi, oi, e.target.value)}
                          style={{ width: '200px', padding: '9px 10px', border: `1px solid ${BORDER}`, borderRadius: '8px', fontSize: '13px', background: CARD_BG, color: TEXT }} />

                        {g.showImages && (
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', flex: 1 }}>
                            {o.images.map((img, ii) => (
                              <div key={ii} style={{ position: 'relative' }}>
                                <img src={img} alt="" style={{ width: '44px', height: '44px', borderRadius: '6px', objectFit: 'cover', border: `1px solid ${BORDER}` }} />
                                <button onClick={() => removeVariantOptionImage(gi, oi, ii)}
                                  style={{ position: 'absolute', top: '-6px', right: '-6px', background: DANGER, color: 'white', border: 'none', borderRadius: '50%', width: '16px', height: '16px', cursor: 'pointer', fontSize: '9px' }}>✕</button>
                              </div>
                            ))}
                            <label style={{ width: '44px', height: '44px', border: `2px dashed ${ACCENT}`, borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: ACCENT }}>
                              {variantUploadingFor === `${gi}-${oi}` ? '⏳' : '+'}
                              <input type="file" accept="image/*" style={{ display: 'none' }}
                                onChange={(e) => { const f = e.target.files[0]; if (f) uploadVariantOptionImage(gi, oi, f); e.target.value = ''; }} />
                            </label>
                          </div>
                        )}

                        <button onClick={() => removeVariantOption(gi, oi)} disabled={g.options.length === 1}
                          style={{ background: '#ff444422', color: DANGER, border: 'none', borderRadius: '8px', padding: '8px 10px', cursor: g.options.length === 1 ? 'not-allowed' : 'pointer', opacity: g.options.length === 1 ? 0.4 : 1 }}>✕</button>
                      </div>
                    ))}
                    <button onClick={() => addVariantOption(gi)} style={{ background: 'none', border: `1px dashed ${ACCENT}`, color: ACCENT, borderRadius: '8px', padding: '6px 14px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>
                      + Add Option
                    </button>
                  </div>
                ))}

                <button onClick={addVariantGroup} style={{ background: '#6c63ff22', color: ACCENT, border: 'none', borderRadius: '8px', padding: '10px 18px', cursor: 'pointer', fontWeight: '600', fontSize: '13px', marginBottom: '16px' }}>
                  + Add Variant Group
                </button>

                <div style={{ marginBottom: '16px' }}>
                  <button onClick={generateVariantCombinations} style={{ background: ACCENT, color: 'white', border: 'none', borderRadius: '10px', padding: '10px 20px', cursor: 'pointer', fontWeight: '700', fontSize: '13px' }}>
                    ⚙️ Generate Combinations
                  </button>
                </div>

                {variantCombos.length > 0 && (
                  <div style={{ overflowX: 'auto', marginBottom: '8px' }}>
                    <table style={{ width: '100%', minWidth: '480px', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: '#6c63ff22' }}>
                          <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: '11px', color: TEXT_FAINT }}>Combination</th>
                          <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: '11px', color: TEXT_FAINT }}>Price (₹)</th>
                          <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: '11px', color: TEXT_FAINT }}>Stock</th>
                          <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: '11px', color: TEXT_FAINT }}>SKU</th>
                        </tr>
                      </thead>
                      <tbody>
                        {variantCombos.map((c, i) => (
                          <tr key={i} style={{ borderBottom: `1px solid ${BORDER}` }}>
                            <td style={{ padding: '8px 10px', fontSize: '12px', fontWeight: '600', color: TEXT }}>
                              {Object.entries(c.selections).map(([k, v]) => `${k}: ${v}`).join(' / ')}
                            </td>
                            <td style={{ padding: '8px 10px' }}>
                              <input type="number" placeholder="base price" value={c.price} onChange={(e) => updateVariantCombo(i, 'price', e.target.value)}
                                style={{ width: '90px', padding: '6px 8px', border: `1px solid ${BORDER}`, borderRadius: '6px', fontSize: '12px', background: PAGE_BG, color: TEXT }} />
                            </td>
                            <td style={{ padding: '8px 10px' }}>
                              <input type="number" value={c.stock} onChange={(e) => updateVariantCombo(i, 'stock', e.target.value)}
                                style={{ width: '70px', padding: '6px 8px', border: `1px solid ${BORDER}`, borderRadius: '6px', fontSize: '12px', background: PAGE_BG, color: TEXT }} />
                            </td>
                            <td style={{ padding: '8px 10px' }}>
                              <input value={c.sku} placeholder="optional" onChange={(e) => updateVariantCombo(i, 'sku', e.target.value)}
                                style={{ width: '110px', padding: '6px 8px', border: `1px solid ${BORDER}`, borderRadius: '6px', fontSize: '12px', background: PAGE_BG, color: TEXT }} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>

          <button onClick={submit} disabled={saving}
            style={{ background: ACCENT, color: 'white', border: 'none', borderRadius: '10px', padding: '12px 32px', cursor: 'pointer', fontWeight: '700', fontSize: '14px', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Adding...' : '💾 Add Product to Shop'}
          </button>
        </>
      )}
    </div>
  );
}