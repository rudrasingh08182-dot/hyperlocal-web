import { useState } from 'react';
import * as XLSX from 'xlsx';
import API from '../services/api';

const STEPS = ['Template', 'Select Seller', 'Upload Files', 'Preview', 'Import'];

const RETURN_POLICY_LABELS = {
  PERISHABLE_FOOD: 'No returns',
  PACKAGED_FOOD: '2 days — Damaged/Expired',
  STANDARD_ELECTRONICS: '7 days — Replacement only',
  HIGH_VALUE_ELECTRONICS: '7 days — Approval required',
  STATIONERY: '2 days — Damaged only',
  FASHION: '3 days — Wrong size/Damaged',
  GROCERY: '1 day — Damaged/Expired',
  FRESH: 'No returns',
  MEDICAL: 'Return only if expired',
};

export default function BulkProductUpload() {
  const [step, setStep] = useState(0);

  // Seller selection
  const [sellerQuery, setSellerQuery] = useState('');
  const [sellers, setSellers] = useState([]);
  const [selectedSeller, setSelectedSeller] = useState(null);

  // Files
  const [excelFile, setExcelFile] = useState(null);
  const [zipFile, setZipFile] = useState(null);
  const [variantsFile, setVariantsFile] = useState(null);
  const [colorsFile, setColorsFile] = useState(null);

  // Validation / preview
  const [validating, setValidating] = useState(false);
  const [uploadId, setUploadId] = useState(null);
  const [summary, setSummary] = useState(null);
  const [preview, setPreview] = useState([]);
  const [invalidRows, setInvalidRows] = useState([]);
  const [orphanVariantErrors, setOrphanVariantErrors] = useState([]);
  const [orphanColorErrors, setOrphanColorErrors] = useState([]);
  const [rowWarnings, setRowWarnings] = useState([]);

  // Import
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  const resetAll = () => {
  setStep(0);
  setSellerQuery('');
  setSellers([]);
  setSelectedSeller(null);

  setExcelFile(null);
  setZipFile(null);
  setVariantsFile(null);
  setColorsFile(null);

  setUploadId(null);
  setSummary(null);
  setPreview([]);
  setInvalidRows([]);
  setOrphanVariantErrors([]);
  setOrphanColorErrors([]);
  setRowWarnings([]);

  setImportResult(null);
};

  // Step 1: Download Template
  const downloadTemplate = () => {
  const ws = XLSX.utils.aoa_to_sheet([
    ['Product Name', 'Price', 'Category', 'Stock Quantity', 'Sold By', 'Image File Name', 'Description', 'Return Policy'],
    ['Amul Gold Milk 500 ml', 35, 'grocery', 100, 'litre', 'amul_milk.jpg, amul_milk_side.jpg', 'Fresh full cream milk rich in calcium and protein.', 'PERISHABLE_FOOD'],
    ['Apple', 180, 'fresh', 50, 'kg', 'apple.jpg', 'Fresh, juicy apples sourced directly from the farm.', 'FRESH'],
    ['Maggi 70 g', 15, 'grocery', 500, 'packet', 'maggi.jpg', 'Instant noodles ready in 2 minutes.', 'PACKAGED_FOOD'],
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Products');
  XLSX.writeFile(wb, 'zaplo_bulk_upload_template.xlsx');
};
const downloadVariantsTemplate = () => {
  const ws = XLSX.utils.aoa_to_sheet([
    [
      'Product Name',
      'Variant Type',
      'Variant Value',
      'Price',
      'Stock',
      'Display Order'
    ],

    [
      'Veg Cheese Pizza',
      'Size',
      '7 Inch',
      199,
      20,
      1
    ],

    [
      'Veg Cheese Pizza',
      'Size',
      '9 Inch',
      299,
      20,
      2
    ],

    [
      'Veg Cheese Pizza',
      'Size',
      '12 Inch',
      399,
      15,
      3
    ]
  ]);

  // Column Width
  ws['!cols'] = [
    { wch: 28 }, // Product Name
    { wch: 18 }, // Variant Type
    { wch: 18 }, // Variant Value
    { wch: 12 }, // Price
    { wch: 12 }, // Stock
    { wch: 18 }  // Display Order
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Variants');

  XLSX.writeFile(wb, 'zaplo_variants_template.xlsx');
};
  const downloadColorsTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['Product Name', 'Color Name', 'Color Images', 'Size', 'Stock', 'Price'],
      ["Men's Casual Shirt", 'Beige', 'beige_front.jpg, beige_back.jpg', 'S', 10, 499],
      ["Men's Casual Shirt", 'Beige', 'beige_front.jpg, beige_back.jpg', 'M', 5, 499],
      ["Men's Casual Shirt", 'Beige', 'beige_front.jpg, beige_back.jpg', 'L', 0, 499],
      ["Men's Casual Shirt", 'Black', 'black_front.jpg, black_back.jpg', 'S', 4, 499],
      ["Men's Casual Shirt", 'Black', 'black_front.jpg, black_back.jpg', 'M', 7, 499],
    ]);
    ws['!cols'] = [
      { wch: 28 }, { wch: 16 }, { wch: 34 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Colors');
    XLSX.writeFile(wb, 'zaplo_colors_template.xlsx');
  };

  // Step 2: Seller search
  const searchSellers = async () => {
    if (!sellerQuery.trim()) return;
    try {
      const res = await API.get(`/sellers/search?q=${encodeURIComponent(sellerQuery)}`);
      setSellers(res.data);
    } catch (err) {
      alert('Failed to search sellers');
    }
  };

  // Step 3 -> 4: Validate
  const runValidation = async () => {
  if (!excelFile || !zipFile) {
    alert('Please choose both the Excel file and the ZIP file');
    return;
  }

  setValidating(true);

  try {
    const formData = new FormData();

    formData.append('sellerId', selectedSeller.id);
    formData.append('excel', excelFile);
    formData.append('zip', zipFile);

    // 👇 YEH LINE YAHAN ADD KARO
    if (variantsFile) {
      formData.append('variants', variantsFile);
    }
    if (colorsFile) {
      formData.append('colors', colorsFile);
    }

    const res = await API.post('/admin/bulk-upload/validate', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    
      setUploadId(res.data.uploadId);
      setSummary(res.data.summary);
      setPreview(res.data.preview);
      setInvalidRows(res.data.invalid);
      setOrphanVariantErrors(res.data.orphanVariantErrors || []);
      setOrphanColorErrors(res.data.orphanColorErrors || []);
      setRowWarnings(res.data.rowWarnings || []);
      setStep(3);
    } catch (err) {
      alert(err.response?.data?.error || 'Validation failed');
    } finally {
      setValidating(false);
    }
  };

  // Step 5: Import
  const runImport = async () => {
    setImporting(true);
    setStep(4);
    try {
      const res = await API.post(`/admin/bulk-upload/${uploadId}/import`);
      setImportResult(res.data);
    } catch (err) {
      alert(err.response?.data?.error || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const downloadErrorReport = async (rows) => {
    try {
      const encoded = encodeURIComponent(JSON.stringify(rows));
      // Use the authenticated API instance (not window.open) so the JWT
      // token actually gets sent — window.open bypasses axios headers entirely.
      const res = await API.get(`/admin/bulk-upload/error-report?rows=${encoded}`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'bulk_upload_errors.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to download error report');
    }
  };

  return (
    <div style={{ background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', maxWidth: '960px' }}>
      <h2 style={{ margin: '0 0 8px', color: '#1a1a2e' }}>📦 Bulk Product Upload</h2>
      <p style={{ color: '#999', fontSize: '13px', marginBottom: '20px' }}>
        Upload hundreds of products at once using Excel + a ZIP of images. Category, description, and return policy are generated automatically.
      </p>

      {/* Step indicator */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '28px' }}>
        {STEPS.map((label, i) => (
          <div key={label} style={{ flex: 1, textAlign: 'center' }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '50%', margin: '0 auto 6px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '13px',
              background: i <= step ? '#6c63ff' : '#f0f0e8',
              color: i <= step ? 'white' : '#999',
            }}>
              {i < step ? '✓' : i + 1}
            </div>
            <div style={{ fontSize: '11px', color: i <= step ? '#6c63ff' : '#999', fontWeight: i === step ? '700' : '400' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* STEP 0: Template */}
     {/* STEP 0: Template */}
{step === 0 && (
  <div>
    <div style={{ background: '#f8f7ff', borderRadius: '12px', padding: '20px', marginBottom: '20px', border: '1px solid #e8e0ff' }}>
      <p style={{ fontSize: '13px', color: '#666', margin: '0 0 14px' }}>
        The Excel file needs these <strong>8 columns</strong>: Product Name, Price, Category, Stock Quantity, Sold By, Image File Name, Description, Return Policy.
        <br />
        <strong>Note:</strong> Price and Stock Quantity can be left blank for products that have variants (their price/stock get calculated automatically from the Variants file).
        <br />
        <strong>Images:</strong> "Image File Name" accepts one filename, or several separated by commas (e.g. <code>amul_milk.jpg, amul_milk_side.jpg</code>). The first image is required; up to 4 more are optional.
      </p>
      <button onClick={downloadTemplate}
        style={{ background: '#6c63ff', color: 'white', border: 'none', borderRadius: '8px', padding: '12px 24px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>
        ⬇️ Download Products Template
      </button>
    </div>

    <div style={{ background: '#fff8e8', borderRadius: '12px', padding: '20px', marginBottom: '20px', border: '1px solid #ffe0a3' }}>
      <p style={{ fontSize: '13px', color: '#666', margin: '0 0 14px' }}>
        <strong>Optional:</strong> if a product has multiple sizes/weights (e.g. a pizza with 7", 9", 12" options), list them in a separate Variants file. Products without variants don't need this file at all.
      </p>
      <button onClick={downloadVariantsTemplate}
        style={{ background: '#B45309', color: 'white', border: 'none', borderRadius: '8px', padding: '12px 24px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>
        ⬇️ Download Variants Template (Optional)
      </button>
    </div>

    <div style={{ background: '#f8f0ff', borderRadius: '12px', padding: '20px', marginBottom: '20px', border: '1px solid #e0c8ff' }}>
      <p style={{ fontSize: '13px', color: '#666', margin: '0 0 14px' }}>
        <strong>🎨 Optional — Fashion (Color + Size):</strong> for products like shirts/dresses with multiple colors, each with its own images and sizes (e.g. Beige/S, Beige/M, Black/S), list them in the Colors file. Do NOT use this together with the Variants file for the same product — pick one system per product.
      </p>
      <button onClick={downloadColorsTemplate}
        style={{ background: '#6c63ff', color: 'white', border: 'none', borderRadius: '8px', padding: '12px 24px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>
        ⬇️ Download Colors Template (Optional)
      </button>
    </div>

    <button onClick={() => setStep(1)}
      style={{ background: '#00b894', color: 'white', border: 'none', borderRadius: '10px', padding: '12px 28px', cursor: 'pointer', fontWeight: '700' }}>
      Next: Select Seller →
    </button>
  </div>
)}

      {/* STEP 1: Select Seller */}
      {step === 1 && (
        <div>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <input
              placeholder="Search seller by shop name..."
              value={sellerQuery}
              onChange={e => setSellerQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && searchSellers()}
              style={{ flex: 1, padding: '10px 14px', border: '1px solid #e8e8e0', borderRadius: '8px', fontSize: '14px', outline: 'none' }}
            />
            <button onClick={searchSellers}
              style={{ background: '#f0eeff', color: '#6c63ff', border: 'none', borderRadius: '8px', padding: '10px 20px', cursor: 'pointer', fontWeight: '600' }}>
              Search
            </button>
          </div>

          {sellers.length > 0 && !selectedSeller && (
            <div style={{ border: '1px solid #e8e8e0', borderRadius: '10px', overflow: 'hidden', marginBottom: '16px' }}>
              {sellers.map(s => (
                <div key={s.id} onClick={() => { setSelectedSeller(s); setSellers([]); }}
                  style={{ padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid #f0f0e8', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: '600', fontSize: '13px' }}>{s.shop_name}</span>
                  <span style={{ fontSize: '12px', color: '#999' }}>{s.locality}</span>
                </div>
              ))}
            </div>
          )}

          {selectedSeller && (
            <div style={{ background: '#e8fff8', borderRadius: '10px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span style={{ fontWeight: '600', color: '#00b894', fontSize: '13px' }}>✅ Selected: {selectedSeller.shop_name}</span>
              <button onClick={() => setSelectedSeller(null)} style={{ background: 'none', border: 'none', color: '#00b894', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>Change</button>
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => setStep(0)} style={{ background: '#f0f0e8', color: '#666', border: 'none', borderRadius: '10px', padding: '12px 24px', cursor: 'pointer' }}>← Back</button>
            <button onClick={() => setStep(2)} disabled={!selectedSeller}
              style={{ background: selectedSeller ? '#00b894' : '#ccc', color: 'white', border: 'none', borderRadius: '10px', padding: '12px 28px', cursor: selectedSeller ? 'pointer' : 'not-allowed', fontWeight: '700' }}>
              Next: Upload Files →
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Upload Excel + ZIP */}
      {step === 2 && (
        <div>
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontWeight: '700', fontSize: '13px', marginBottom: '8px' }}>Excel File (.xlsx)</div>
            <label style={{ display: 'block', padding: '16px', border: '2px dashed #6c63ff', borderRadius: '10px', textAlign: 'center', cursor: 'pointer', background: '#f8f7ff', color: '#6c63ff', fontWeight: '600', fontSize: '13px' }}>
              {excelFile ? `📄 ${excelFile.name}` : '📁 Choose or drag Excel file here'}
              <input type="file" accept=".xlsx,.xls" onChange={e => setExcelFile(e.target.files[0])} style={{ display: 'none' }} />
            </label>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontWeight: '700', fontSize: '13px', marginBottom: '8px' }}>Images ZIP File</div>
            <label style={{ display: 'block', padding: '16px', border: '2px dashed #00b894', borderRadius: '10px', textAlign: 'center', cursor: 'pointer', background: '#f0fff8', color: '#00b894', fontWeight: '600', fontSize: '13px' }}>
              {zipFile ? `🗜️ ${zipFile.name}` : '📁 Choose or drag ZIP file here'}
              <input type="file" accept=".zip" onChange={e => setZipFile(e.target.files[0])} style={{ display: 'none' }} />
            </label>
            <p style={{ fontSize: '11px', color: '#999', marginTop: '8px' }}>
              Each image should be named after the product, lowercase, spaces as underscores — e.g. "Amul Gold Milk 500 ml" → <code>amul_gold_milk_500_ml.jpg</code>.
              <br />
              Need more than one photo for a product? List several filenames in the Excel cell, separated by commas — e.g. <code>amul_milk.jpg, amul_milk_side.jpg</code>. The first is required, the rest (up to 4 more) are optional.
            </p>
          </div>
          <div style={{ marginBottom: '20px' }}>
  <div style={{ fontWeight: '700', fontSize: '13px', marginBottom: '8px' }}>Variants File (Optional)</div>
  <label style={{ display: 'block', padding: '16px', border: '2px dashed #B45309', borderRadius: '10px', textAlign: 'center', cursor: 'pointer', background: '#fff8e8', color: '#B45309', fontWeight: '600', fontSize: '13px' }}>
    {variantsFile ? `📄 ${variantsFile.name}` : '📁 Choose Variants.xlsx (only if some products have sizes/colors/etc)'}
    <input type="file" accept=".xlsx,.xls" onChange={e => setVariantsFile(e.target.files[0])} style={{ display: 'none' }} />
  </label>
  {variantsFile && (
    <button onClick={() => setVariantsFile(null)}
      style={{ marginTop: '8px', background: 'none', border: 'none', color: '#999', cursor: 'pointer', fontSize: '12px', textDecoration: 'underline' }}>
      Remove file
    </button>
  )}
</div>

<div style={{ marginBottom: '20px' }}>
  <div style={{ fontWeight: '700', fontSize: '13px', marginBottom: '8px' }}>🎨 Colors File — Fashion (Optional)</div>
  <label style={{ display: 'block', padding: '16px', border: '2px dashed #6c63ff', borderRadius: '10px', textAlign: 'center', cursor: 'pointer', background: '#f8f0ff', color: '#6c63ff', fontWeight: '600', fontSize: '13px' }}>
    {colorsFile ? `📄 ${colorsFile.name}` : '📁 Choose Colors.xlsx (only for products with color+size variants)'}
    <input type="file" accept=".xlsx,.xls" onChange={e => setColorsFile(e.target.files[0])} style={{ display: 'none' }} />
  </label>
  {colorsFile && (
    <button onClick={() => setColorsFile(null)}
      style={{ marginTop: '8px', background: 'none', border: 'none', color: '#999', cursor: 'pointer', fontSize: '12px', textDecoration: 'underline' }}>
      Remove file
    </button>
  )}
</div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => setStep(1)} style={{ background: '#f0f0e8', color: '#666', border: 'none', borderRadius: '10px', padding: '12px 24px', cursor: 'pointer' }}>← Back</button>
            <button onClick={runValidation} disabled={validating || !excelFile || !zipFile}
              style={{ background: (!validating && excelFile && zipFile) ? '#00b894' : '#ccc', color: 'white', border: 'none', borderRadius: '10px', padding: '12px 28px', cursor: (!validating && excelFile && zipFile) ? 'pointer' : 'not-allowed', fontWeight: '700' }}>
              {validating ? 'Validating...' : 'Validate & Preview →'}
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Preview */}
      {step === 3 && summary && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '12px' }}>
  <div style={{ background: '#f8f7ff', borderRadius: '10px', padding: '16px', textAlign: 'center' }}>
    <div style={{ fontSize: '24px', fontWeight: '700', color: '#6c63ff' }}>{summary.totalRows}</div>
    <div style={{ fontSize: '12px', color: '#999' }}>Products Found</div>
  </div>
  <div style={{ background: '#e8fff8', borderRadius: '10px', padding: '16px', textAlign: 'center' }}>
    <div style={{ fontSize: '24px', fontWeight: '700', color: '#00b894' }}>{summary.validCount}</div>
    <div style={{ fontSize: '12px', color: '#999' }}>Valid</div>
  </div>
  <div style={{ background: '#fff0f0', borderRadius: '10px', padding: '16px', textAlign: 'center' }}>
    <div style={{ fontSize: '24px', fontWeight: '700', color: '#ff4444' }}>{summary.invalidCount}</div>
    <div style={{ fontSize: '12px', color: '#999' }}>Errors</div>
  </div>
</div>
<div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
  <div style={{ background: '#f8f8f0', borderRadius: '10px', padding: '16px', textAlign: 'center' }}>
    <div style={{ fontSize: '24px', fontWeight: '700', color: '#333' }}>{summary.simpleCount}</div>
    <div style={{ fontSize: '12px', color: '#999' }}>Simple Products</div>
  </div>
  <div style={{ background: '#fff8e8', borderRadius: '10px', padding: '16px', textAlign: 'center' }}>
    <div style={{ fontSize: '24px', fontWeight: '700', color: '#B45309' }}>{summary.variantProductCount}</div>
    <div style={{ fontSize: '12px', color: '#999' }}>Variant Products</div>
  </div>
  <div style={{ background: '#f0eeff', borderRadius: '10px', padding: '16px', textAlign: 'center' }}>
    <div style={{ fontSize: '24px', fontWeight: '700', color: '#6c63ff' }}>{summary.totalVariants}</div>
    <div style={{ fontSize: '12px', color: '#999' }}>Total Variants</div>
  </div>
</div>
<div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '20px' }}>
  <div style={{ background: '#f8f0ff', borderRadius: '10px', padding: '16px', textAlign: 'center' }}>
    <div style={{ fontSize: '24px', fontWeight: '700', color: '#6c63ff' }}>{summary.colorProductCount || 0}</div>
    <div style={{ fontSize: '12px', color: '#999' }}>🎨 Color Products</div>
  </div>
  <div style={{ background: '#f0eeff', borderRadius: '10px', padding: '16px', textAlign: 'center' }}>
    <div style={{ fontSize: '24px', fontWeight: '700', color: '#6c63ff' }}>{summary.totalColors || 0}</div>
    <div style={{ fontSize: '12px', color: '#999' }}>Total Colors</div>
  </div>
</div>

{orphanVariantErrors.length > 0 && (
  <div style={{ background: '#fff8e8', borderRadius: '10px', padding: '14px', marginBottom: '16px' }}>
    <div style={{ fontWeight: '700', color: '#B45309', fontSize: '13px', marginBottom: '8px' }}>⚠️ Variants file notice:</div>
    <ul style={{ margin: 0, paddingLeft: '18px' }}>
      {orphanVariantErrors.map((e, i) => <li key={i} style={{ fontSize: '12px', color: '#666' }}>{e}</li>)}
    </ul>
  </div>
)}

{orphanColorErrors.length > 0 && (
  <div style={{ background: '#f8f0ff', borderRadius: '10px', padding: '14px', marginBottom: '16px' }}>
    <div style={{ fontWeight: '700', color: '#6c63ff', fontSize: '13px', marginBottom: '8px' }}>🎨 Colors file notice:</div>
    <ul style={{ margin: 0, paddingLeft: '18px' }}>
      {orphanColorErrors.map((e, i) => <li key={i} style={{ fontSize: '12px', color: '#666' }}>{e}</li>)}
    </ul>
  </div>
)}

{rowWarnings.length > 0 && (
  <div style={{ background: '#fff8e8', borderRadius: '10px', padding: '14px', marginBottom: '16px' }}>
    <div style={{ fontWeight: '700', color: '#B45309', fontSize: '13px', marginBottom: '8px' }}>⚠️ {rowWarnings.length} product(s) had an optional image that couldn't be matched (product still imports fine with its remaining images):</div>
    <ul style={{ margin: 0, paddingLeft: '18px', maxHeight: '150px', overflowY: 'auto' }}>
      {rowWarnings.map((r, i) => (
        <li key={i} style={{ fontSize: '12px', color: '#666' }}>Row {r.row} ({r.name}): {r.warnings.join('; ')}</li>
      ))}
    </ul>
  </div>
)}

          {invalidRows.length > 0 && (
            <div style={{ background: '#fff0f0', borderRadius: '10px', padding: '14px', marginBottom: '20px' }}>
              <div style={{ fontWeight: '700', color: '#e17055', fontSize: '13px', marginBottom: '8px' }}>⚠️ {invalidRows.length} row(s) will be skipped:</div>
              <ul style={{ margin: 0, paddingLeft: '18px', maxHeight: '150px', overflowY: 'auto' }}>
                {invalidRows.map((r, i) => (
                  <li key={i} style={{ fontSize: '12px', color: '#666' }}>Row {r.row} ({r.name}): {r.errors.join('; ')}</li>
                ))}
              </ul>
              <button onClick={() => downloadErrorReport(invalidRows)}
                style={{ marginTop: '10px', background: 'white', color: '#e17055', border: '1px solid #e17055', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>
                ⬇️ Download Error Report
              </button>
            </div>
          )}

          {preview.length > 0 && (
            <div style={{ overflowX: 'auto', marginBottom: '20px', border: '1px solid #f0f0e8', borderRadius: '10px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ background: '#fafaf5' }}>
                    <th style={{ padding: '8px 10px', textAlign: 'left' }}>Product</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left' }}>Category</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left' }}>Price</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left' }}>Stock</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left' }}>Images</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left' }}>Return Policy</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.slice(0, 10).map((p, i) => (
                    <tr key={i} style={{ borderTop: '1px solid #f8f8f0' }}>
                     <td style={{ padding: '8px 10px' }}>
  {p.name}{p.warnings?.length > 0 && ' ⚠️'}
  {p.variants && <span style={{ marginLeft: '6px', fontSize: '10px', background: '#fff8e8', color: '#B45309', padding: '2px 6px', borderRadius: '6px', fontWeight: '700' }}>{p.variants.length} variants</span>}
  {p.colors && <span style={{ marginLeft: '6px', fontSize: '10px', background: '#f8f0ff', color: '#6c63ff', padding: '2px 6px', borderRadius: '6px', fontWeight: '700' }}>🎨 {p.colors.length} colors</span>}
</td>
                      <td style={{ padding: '8px 10px', textTransform: 'capitalize' }}>{p.category}</td>
                      <td style={{ padding: '8px 10px' }}>₹{p.price}</td>
                      <td style={{ padding: '8px 10px' }}>{p.stock}</td>
                      <td style={{ padding: '8px 10px' }}>
                        🖼️ {p.imageKeys?.length || 1}
                      </td>
                      <td style={{ padding: '8px 10px' }}>
  <div style={{ fontWeight: '600' }}>{p.return_policy}</div>
  <div style={{ fontSize: '10px', color: '#999' }}>{RETURN_POLICY_LABELS[p.return_policy] || ''}</div>
</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {preview.length > 10 && <div style={{ padding: '8px 12px', color: '#999', fontSize: '12px' }}>...and {preview.length - 10} more</div>}
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => setStep(2)} style={{ background: '#f0f0e8', color: '#666', border: 'none', borderRadius: '10px', padding: '12px 24px', cursor: 'pointer' }}>← Back</button>
            <button onClick={runImport} disabled={summary.validCount === 0}
              style={{ background: summary.validCount > 0 ? '#00b894' : '#ccc', color: 'white', border: 'none', borderRadius: '10px', padding: '12px 28px', cursor: summary.validCount > 0 ? 'pointer' : 'not-allowed', fontWeight: '700' }}>
              🚀 Import {summary.validCount} Products
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Import in progress / result */}
      {step === 4 && (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          {importing ? (
            <>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
              <div style={{ fontWeight: '700', fontSize: '16px', color: '#1a1a2e', marginBottom: '8px' }}>Importing products...</div>
              <p style={{ color: '#999', fontSize: '13px' }}>This can take a few minutes for large uploads (images are being uploaded one by one). Please don't close this tab.</p>
            </>
          ) : importResult ? (
            <>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>{importResult.failed === 0 ? '🎉' : '✅'}</div>
              <div style={{ fontWeight: '700', fontSize: '18px', color: '#1a1a2e', marginBottom: '4px' }}>
                {importResult.success} products imported
                {importResult.failed > 0 && `, ${importResult.failed} failed`}
              </div>
              <p style={{ color: '#999', fontSize: '13px', marginBottom: '20px' }}>
                Completed in {(importResult.totalTimeMs / 1000).toFixed(1)}s
              </p>
              {importResult.failed > 0 && (
                <button onClick={() => downloadErrorReport(importResult.errors)}
                  style={{ background: 'white', color: '#e17055', border: '1px solid #e17055', borderRadius: '8px', padding: '10px 20px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', marginRight: '10px' }}>
                  ⬇️ Download Error Report
                </button>
              )}
              <button onClick={resetAll}
                style={{ background: '#6c63ff', color: 'white', border: 'none', borderRadius: '8px', padding: '10px 24px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
                Upload More Products
              </button>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}