// src/components/VariantManagerModal.js
//
// Universal (V2) variant builder — opened from the seller's Products tab.
// Works for ANY category: Color+Size, RAM+Storage, Flavor+Pack Size, or a
// single custom group. Does not touch the old Fashion-only Color modal —
// that keeps working for legacy products exactly as before.
//
// IMPORTANT: groups/options/images that already exist on the server carry a
// real `id`. Removing one of those calls the backend immediately (with a
// confirm dialog) — it does NOT wait for "Save Variants". Only brand-new,
// not-yet-saved groups/options/images (id === null) are removed purely
// client-side, since there's nothing on the server to delete yet.

import { useState, useEffect } from 'react';
import API from '../services/api';
import { showToast } from './Toast';

const SUGGESTED_GROUP_NAMES = ['Color', 'Size', 'Storage', 'RAM', 'Weight', 'Flavor', 'Pack Size', 'Material'];

function sigOf(selections) {
  return Object.entries(selections)
    .map(([k, v]) => [k.trim().toLowerCase(), String(v).trim().toLowerCase()])
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([k, v]) => `${k}=${v}`)
    .join('|');
}

function cartesianCombinations(groups) {
  const usable = groups.filter((g) => g.name.trim() && g.options.some((o) => o.value.trim()));
  if (usable.length === 0) return [];
  return usable.reduce((acc, group) => {
    const opts = group.options.filter((o) => o.value.trim());
    if (acc.length === 0) return opts.map((o) => ({ [group.name.trim()]: o.value.trim() }));
    const next = [];
    for (const combo of acc) {
      for (const o of opts) next.push({ ...combo, [group.name.trim()]: o.value.trim() });
    }
    return next;
  }, []);
}

function errMsg(err, fallback) {
  const e = err.response?.data?.error;
  return (typeof e === 'object' ? e?.message : e) || fallback;
}

const EMPTY_GROUP = () => ({ id: null, name: '', showImages: false, options: [{ id: null, value: '', images: [] }] });

export default function VariantManagerModal({ product, onClose, onSaved }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [blocked, setBlocked] = useState(false); // true if product uses the legacy variant system
  const [variantSystem, setVariantSystem] = useState(null); // null | 'v2'

  // groups: [{ id, name, showImages, options: [{ id, value, images: [{id, url}] }] }]
  const [groups, setGroups] = useState([EMPTY_GROUP()]);
  // combos: [{ selections, price, stock, sku, is_active }]
  const [combos, setCombos] = useState([]);
  const [uploadingFor, setUploadingFor] = useState(null); // "gi-oi" key while an image uploads

  useEffect(() => {
    loadVariants();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id]);

  const loadVariants = async () => {
    setLoading(true);
    try {
      const res = await API.get(`/products/${product.id}/variants`);
      const data = res.data.data;

      if (data.variantSystem === 'legacy') {
        setBlocked(true);
        setLoading(false);
        return;
      }

      setVariantSystem(data.variantSystem); // null (fresh) or 'v2' (existing)
      setGroups(
        data.variantGroups.length > 0
          ? data.variantGroups.map((g) => ({
              id: g.id,
              name: g.name,
              showImages: g.name.toLowerCase().includes('color') || g.options.some((o) => o.images.length > 0),
              options: g.options.map((o) => ({ id: o.id, value: o.value, images: o.images })), // images already [{id,url}]
            }))
          : [EMPTY_GROUP()]
      );
      setCombos(
        data.combinations.map((c) => ({
          selections: c.selections,
          price: c.price ?? '',
          stock: c.stock ?? '',
          sku: c.sku ?? '',
          is_active: c.is_active,
        }))
      );
    } catch (err) {
      showToast('Failed to load variants', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ── Group editing ──
  const addGroup = () => setGroups((prev) => [...prev, EMPTY_GROUP()]);

  const removeGroup = async (gi) => {
    const group = groups[gi];
    if (group.id) {
      if (
        !window.confirm(
          'This group is already saved. Removing it will delete ALL combinations for this product (or deactivate the ones that already have orders). Continue?'
        )
      )
        return;
      try {
        await API.delete(`/products/variants/groups/${group.id}?confirm=true`);
        showToast('Group removed', 'info');
        await loadVariants(); // combos/other groups may have shifted — resync everything
      } catch (err) {
        showToast(errMsg(err, 'Failed to remove group'), 'error');
      }
      return;
    }
    // Never saved — just drop it locally
    setGroups((prev) => prev.filter((_, i) => i !== gi));
  };

  const updateGroupName = (gi, name) =>
    setGroups((prev) => prev.map((g, i) => (i === gi ? { ...g, name, showImages: name.toLowerCase().includes('color') } : g)));
  const toggleGroupImages = (gi) => setGroups((prev) => prev.map((g, i) => (i === gi ? { ...g, showImages: !g.showImages } : g)));

  // ── Option editing ──
  const addOption = (gi) =>
    setGroups((prev) => prev.map((g, i) => (i === gi ? { ...g, options: [...g.options, { id: null, value: '', images: [] }] } : g)));

  const removeOption = async (gi, oi) => {
    const option = groups[gi].options[oi];
    if (option.id) {
      if (
        !window.confirm(
          'This option is already saved. Removing it will delete the combinations that use it (or deactivate the ones that already have orders). Continue?'
        )
      )
        return;
      try {
        await API.delete(`/products/variants/options/${option.id}?confirm=true`);
        showToast('Option removed', 'info');
        await loadVariants();
      } catch (err) {
        showToast(errMsg(err, 'Failed to remove option'), 'error');
      }
      return;
    }
    setGroups((prev) => prev.map((g, i) => (i === gi ? { ...g, options: g.options.filter((_, j) => j !== oi) } : g)));
  };

  const updateOptionValue = (gi, oi, value) =>
    setGroups((prev) =>
      prev.map((g, i) => (i === gi ? { ...g, options: g.options.map((o, j) => (j === oi ? { ...o, value } : o)) } : g))
    );

  // ── Images ──
  // Existing option (has a real id) -> upload persists immediately via the
  // dedicated endpoint. New/unsaved option -> just gets a Cloudinary URL,
  // saved for real when "Save Variants" runs.
  const uploadOptionImage = async (gi, oi, file) => {
    const option = groups[gi].options[oi];
    const key = `${gi}-${oi}`;
    setUploadingFor(key);
    try {
      if (option.id) {
        const formData = new FormData();
        formData.append('image', file);
        const res = await API.post(`/products/${product.id}/variants/options/${option.id}/images`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        const saved = res.data.data;
        setGroups((prev) =>
          prev.map((g, i) =>
            i === gi
              ? { ...g, options: g.options.map((o, j) => (j === oi ? { ...o, images: [...o.images, { id: saved.id, url: saved.image_url }] } : o)) }
              : g
          )
        );
      } else {
        const formData = new FormData();
        formData.append('image', file);
        const res = await API.post('/uploads/product-image', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        setGroups((prev) =>
          prev.map((g, i) =>
            i === gi
              ? { ...g, options: g.options.map((o, j) => (j === oi ? { ...o, images: [...o.images, { id: null, url: res.data.url }] } : o)) }
              : g
          )
        );
      }
    } catch (err) {
      showToast(errMsg(err, 'Image upload failed'), 'error');
    } finally {
      setUploadingFor(null);
    }
  };

  const removeOptionImage = async (gi, oi, imgIdx) => {
    const img = groups[gi].options[oi].images[imgIdx];
    if (img.id) {
      if (!window.confirm('Delete this image permanently?')) return;
      try {
        await API.delete(`/products/variants/options/images/${img.id}`);
      } catch (err) {
        showToast(errMsg(err, 'Failed to delete image'), 'error');
        return;
      }
    }
    setGroups((prev) =>
      prev.map((g, i) =>
        i === gi ? { ...g, options: g.options.map((o, j) => (j === oi ? { ...o, images: o.images.filter((_, k) => k !== imgIdx) } : o)) } : g
      )
    );
  };

  // ── Combination generation — preserves existing price/stock/sku by signature ──
  const generateCombinations = () => {
    const generated = cartesianCombinations(groups);
    if (generated.length === 0) {
      showToast('Add at least one group with a filled-in option first', 'error');
      return;
    }
    const existingBySig = new Map(combos.map((c) => [sigOf(c.selections), c]));
    const next = generated.map((selections) => {
      const sig = sigOf(selections);
      const existing = existingBySig.get(sig);
      return existing
        ? { ...existing, selections } // preserve seller-entered price/stock/sku
        : { selections, price: '', stock: '', sku: '', is_active: true };
    });
    setCombos(next);
    showToast(`${next.length} combination(s) generated`, 'success');
  };

  const updateCombo = (idx, field, value) => setCombos((prev) => prev.map((c, i) => (i === idx ? { ...c, [field]: value } : c)));

  // ── Save — only handles ADDING groups/options/combos and editing combo
  // price/stock/sku/active. Removals already happened immediately above. ──
  const save = async (confirmDeletions = false) => {
    for (const g of groups) {
      if (!g.name.trim()) return showToast('Every group needs a name', 'error');
      if (g.options.filter((o) => o.value.trim()).length === 0) return showToast(`Group "${g.name}" needs at least one option`, 'error');
    }
    if (combos.length === 0) return showToast('Click "Generate Combinations" first', 'error');
    for (const c of combos) {
      if (c.stock === '' || parseInt(c.stock) < 0) return showToast('Every combination needs a valid stock number', 'error');
    }

    const payload = {
      variantGroups: groups.map((g, gi) => ({
        name: g.name.trim(),
        displayOrder: gi,
        options: g.options
          .filter((o) => o.value.trim())
          .map((o, oi) => ({
            value: o.value.trim(),
            displayOrder: oi,
            // Only NEW (not-yet-persisted) images belong here — existing
            // images were already saved the moment they were uploaded above.
            images: o.images.filter((img) => !img.id).map((img) => img.url),
          })),
      })),
      combinations: combos.map((c, ci) => ({
        selections: c.selections,
        price: c.price !== '' ? parseFloat(c.price) : null,
        stock: parseInt(c.stock),
        sku: c.sku || null,
        displayOrder: ci,
      })),
      confirmDeletions,
    };

    setSaving(true);
    try {
      const url = `/products/${product.id}/variants`;
      const res = variantSystem === 'v2' ? await API.put(url, payload) : await API.post(url, payload);
      showToast('Variants saved!', 'success');
      setVariantSystem(res.data.data.variantSystem);
      onSaved?.();
      onClose();
    } catch (err) {
      const errBody = err.response?.data?.error;
      if (errBody?.code === 'CONFIRMATION_REQUIRED') {
        if (window.confirm(`${errBody.message}\n\nProceed anyway?`)) {
          return save(true);
        }
      } else {
        showToast(errMsg(err, 'Failed to save variants'), 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: '20px' }}
      onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        style={{ background: 'white', borderRadius: '16px', padding: '24px', maxWidth: '760px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <h3 style={{ margin: 0, color: '#1a1a2e' }}>🧬 Variants</h3>
          <button onClick={onClose} style={{ background: '#f0f0e8', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', fontSize: '16px' }}>✕</button>
        </div>
        <p style={{ color: '#999', fontSize: '13px', marginBottom: '20px' }}>{product.name}</p>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>Loading...</div>
        ) : blocked ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>🎨</div>
            <p>This product already uses the Color/Size system.<br />Manage it from the <strong>🎨 Colors</strong> button instead.</p>
          </div>
        ) : (
          <>
            {/* Variant Groups */}
            {groups.map((g, gi) => (
              <div key={g.id || `new-${gi}`} style={{ border: '1px solid #f0f0e8', borderRadius: '12px', padding: '16px', marginBottom: '16px', background: '#fafaf5' }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '12px' }}>
                  <input list={`group-suggestions-${gi}`} placeholder="Group name (e.g. Color, RAM, Flavor)" value={g.name}
                    onChange={(e) => updateGroupName(gi, e.target.value)}
                    style={{ flex: 1, padding: '10px 12px', border: '1px solid #e8e8e0', borderRadius: '8px', fontSize: '14px', outline: 'none' }} />
                  <datalist id={`group-suggestions-${gi}`}>
                    {SUGGESTED_GROUP_NAMES.map((n) => <option key={n} value={n} />)}
                  </datalist>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#666', whiteSpace: 'nowrap' }}>
                    <input type="checkbox" checked={g.showImages} onChange={() => toggleGroupImages(gi)} />
                    Has images
                  </label>
                  {groups.length > 1 && (
                    <button onClick={() => removeGroup(gi)} style={{ background: '#fff0f0', color: '#ff4444', border: 'none', borderRadius: '8px', padding: '8px 12px', cursor: 'pointer' }}>✕</button>
                  )}
                </div>

                {g.options.map((o, oi) => (
                  <div key={o.id || `new-${oi}`} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <input placeholder="Option value (e.g. Black, 128GB)" value={o.value}
                      onChange={(e) => updateOptionValue(gi, oi, e.target.value)}
                      style={{ width: '220px', padding: '9px 10px', border: '1px solid #e8e8e0', borderRadius: '8px', fontSize: '13px', outline: 'none' }} />

                    {g.showImages && (
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', flex: 1 }}>
                        {o.images.map((img, ii) => (
                          <div key={img.id || `new-${ii}`} style={{ position: 'relative' }}>
                            <img src={img.url} alt="" style={{ width: '44px', height: '44px', borderRadius: '6px', objectFit: 'cover', border: '1px solid #e8e8e0' }} />
                            <button onClick={() => removeOptionImage(gi, oi, ii)}
                              style={{ position: 'absolute', top: '-6px', right: '-6px', background: '#ff4444', color: 'white', border: 'none', borderRadius: '50%', width: '16px', height: '16px', cursor: 'pointer', fontSize: '9px' }}>✕</button>
                          </div>
                        ))}
                        <label style={{ width: '44px', height: '44px', border: '2px dashed #6c63ff', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#6c63ff', fontSize: '16px' }}>
                          {uploadingFor === `${gi}-${oi}` ? '⏳' : '+'}
                          <input type="file" accept="image/*" style={{ display: 'none' }}
                            onChange={(e) => { const f = e.target.files[0]; if (f) uploadOptionImage(gi, oi, f); e.target.value = ''; }} />
                        </label>
                      </div>
                    )}

                    <button onClick={() => removeOption(gi, oi)} disabled={g.options.length === 1}
                      style={{ background: '#fff0f0', color: '#ff4444', border: 'none', borderRadius: '8px', padding: '8px 10px', cursor: g.options.length === 1 ? 'not-allowed' : 'pointer', opacity: g.options.length === 1 ? 0.4 : 1 }}>✕</button>
                  </div>
                ))}
                <button onClick={() => addOption(gi)} style={{ background: 'none', border: '1px dashed #6c63ff', color: '#6c63ff', borderRadius: '8px', padding: '6px 14px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>
                  + Add Option
                </button>
              </div>
            ))}

            <button onClick={addGroup} style={{ background: '#6c63ff15', color: '#6c63ff', border: 'none', borderRadius: '8px', padding: '10px 18px', cursor: 'pointer', fontWeight: '600', fontSize: '13px', marginBottom: '20px' }}>
              + Add Variant Group
            </button>

            <div style={{ borderTop: '1px solid #f0f0e8', paddingTop: '16px', marginBottom: '16px' }}>
              <button onClick={generateCombinations} style={{ background: '#6c63ff', color: 'white', border: 'none', borderRadius: '10px', padding: '10px 20px', cursor: 'pointer', fontWeight: '700', fontSize: '13px' }}>
                ⚙️ Generate Combinations
              </button>
            </div>

            {/* Combinations table */}
            {combos.length > 0 && (
              <div style={{ overflowX: 'auto', marginBottom: '20px' }}>
                <table style={{ width: '100%', minWidth: '520px', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#fafaf5' }}>
                      <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: '11px', color: '#999' }}>Combination</th>
                      <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: '11px', color: '#999' }}>Price (₹)</th>
                      <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: '11px', color: '#999' }}>Stock</th>
                      <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: '11px', color: '#999' }}>SKU</th>
                      <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: '11px', color: '#999' }}>Active</th>
                    </tr>
                  </thead>
                  <tbody>
                    {combos.map((c, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f8f8f0' }}>
                        <td style={{ padding: '8px 10px', fontSize: '12px', fontWeight: '600' }}>
                          {Object.entries(c.selections).map(([k, v]) => `${k}: ${v}`).join(' / ')}
                        </td>
                        <td style={{ padding: '8px 10px' }}>
                          <input type="number" placeholder={`base ₹${product.price}`} value={c.price}
                            onChange={(e) => updateCombo(i, 'price', e.target.value)}
                            style={{ width: '90px', padding: '6px 8px', border: '1px solid #e8e8e0', borderRadius: '6px', fontSize: '12px' }} />
                        </td>
                        <td style={{ padding: '8px 10px' }}>
                          <input type="number" value={c.stock}
                            onChange={(e) => updateCombo(i, 'stock', e.target.value)}
                            style={{ width: '70px', padding: '6px 8px', border: '1px solid #e8e8e0', borderRadius: '6px', fontSize: '12px' }} />
                        </td>
                        <td style={{ padding: '8px 10px' }}>
                          <input value={c.sku} placeholder="optional"
                            onChange={(e) => updateCombo(i, 'sku', e.target.value)}
                            style={{ width: '110px', padding: '6px 8px', border: '1px solid #e8e8e0', borderRadius: '6px', fontSize: '12px' }} />
                        </td>
                        <td style={{ padding: '8px 10px' }}>
                          <input type="checkbox" checked={c.is_active} onChange={(e) => updateCombo(i, 'is_active', e.target.checked)} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => save(false)} disabled={saving}
                style={{ background: '#6c63ff', color: 'white', border: 'none', borderRadius: '10px', padding: '12px 28px', cursor: 'pointer', fontWeight: '700', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Saving...' : '💾 Save Variants'}
              </button>
              <button onClick={onClose} style={{ background: '#f0f0e8', color: '#666', border: 'none', borderRadius: '10px', padding: '12px 28px', cursor: 'pointer' }}>Cancel</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}