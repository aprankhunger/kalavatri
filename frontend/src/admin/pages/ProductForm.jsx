import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  FiArrowLeft,
  FiSave,
  FiImage,
  FiPlus,
  FiTrash2,
  FiCheckCircle,
  FiAlertCircle,
  FiPackage,
  FiDollarSign,
  FiGlobe,
} from 'react-icons/fi';
import adminApi from '../services/adminApi';
import { ADMIN_PATH } from '../config/adminConfig';
import './ProductForm.css';

const DEFAULT_SIZES = [5, 6, 7, 8, 9, 10];

const SAMPLE_GALLERY_IMAGES = [
  '/images/hero_banner.jpg',
  '/images/jutti_maroon_gold.jpg',
  '/images/jutti_pink_floral.jpg',
  '/images/jutti_blue_silver.jpg',
  '/images/jutti_green_paisley.jpg',
  '/images/jutti_red_bridal.jpg',
  '/images/jutti_white_pearl.jpg',
  '/images/jutti_yellow_mirror.jpg',
  '/images/jutti_black_leaf.jpg',
];

const ProductForm = () => {
  const { id } = useParams();
  const isEditing = Boolean(id);
  const navigate = useNavigate();

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Form State
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState('festive');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [originalPrice, setOriginalPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [image, setImage] = useState('/images/jutti_maroon_gold.jpg');
  const [images, setImages] = useState([]);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [status, setStatus] = useState('published');
  const [badge, setBadge] = useState('new');
  const [featured, setFeatured] = useState(false);
  const [lowStockThreshold, setLowStockThreshold] = useState(5);
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');

  // Variants state
  const [variants, setVariants] = useState([]);

  // Auto slug generation from title
  const handleNameChange = (val) => {
    setName(val);
    if (!isEditing || !slug) {
      const generatedSlug = val
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
      setSlug(generatedSlug);
    }
  };

  // If editing, load product data
  useEffect(() => {
    if (!isEditing) {
      // Default initial variants for new product
      generateDefaultVariants(2499, 'KV-NEW');
      return;
    }

    const fetchProduct = async () => {
      try {
        setLoading(true);
        const res = await adminApi.get(`/products/${id}`);
        const p = res.data.product;
        setName(p.name || '');
        setSlug(p.slug || '');
        setSku(p.sku || '');
        setCategory(p.category || 'festive');
        setDescription(p.description || '');
        setPrice(p.price || '');
        setOriginalPrice(p.originalPrice || '');
        setCostPrice(p.costPrice || '');
        setImage(p.image || '/images/jutti_maroon_gold.jpg');
        setImages(p.images || []);
        setStatus(p.status || 'published');
        setBadge(p.badge || '');
        setFeatured(Boolean(p.featured));
        setLowStockThreshold(p.lowStockThreshold || 5);
        setMetaTitle(p.metaTitle || '');
        setMetaDescription(p.metaDescription || '');

        if (p.variants && p.variants.length > 0) {
          setVariants(p.variants);
        } else if (p.sizes && p.sizes.length > 0) {
          const perSizeStock = Math.floor((p.stockQuantity || 0) / p.sizes.length);
          setVariants(
            p.sizes.map((size) => ({
              sku: `${p.sku || 'SKU'}-S${size}`,
              size,
              color: p.colors?.[0] || 'Standard',
              price: p.price || 0,
              stockQuantity: perSizeStock,
              inStock: perSizeStock > 0,
            }))
          );
        } else {
          generateDefaultVariants(p.price, p.sku);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load product details.');
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id, isEditing]);

  const generateDefaultVariants = (currentPrice, baseSku) => {
    const list = DEFAULT_SIZES.map((size) => ({
      sku: `${baseSku || 'KV-JUT'}-S${size}`,
      size,
      color: 'Maroon',
      price: Number(currentPrice) || 2499,
      stockQuantity: 5,
      inStock: true,
    }));
    setVariants(list);
  };

  const handleVariantStockChange = (index, newStock) => {
    const updated = [...variants];
    updated[index].stockQuantity = Math.max(0, parseInt(newStock) || 0);
    updated[index].inStock = updated[index].stockQuantity > 0;
    setVariants(updated);
  };

  const handleVariantPriceChange = (index, newPrice) => {
    const updated = [...variants];
    updated[index].price = Math.max(0, parseInt(newPrice) || 0);
    setVariants(updated);
  };

  const handleAddGalleryImage = (url) => {
    if (!url) return;
    if (!images.includes(url)) {
      setImages([...images, url]);
    }
    setNewImageUrl('');
  };

  const handleRemoveGalleryImage = (index) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const totalCalculatedStock = variants.reduce((sum, v) => sum + (v.stockQuantity || 0), 0);

  // Form Submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setSaving(true);

    const payload = {
      name,
      slug,
      sku: sku || undefined,
      category,
      description,
      price: Number(price),
      originalPrice: originalPrice ? Number(originalPrice) : null,
      costPrice: costPrice ? Number(costPrice) : 0,
      image,
      images,
      status,
      badge,
      featured,
      lowStockThreshold: Number(lowStockThreshold),
      variants,
      stockQuantity: totalCalculatedStock,
      sizes: variants.map((v) => v.size),
      colors: Array.from(new Set(variants.map((v) => v.color).filter(Boolean))),
      metaTitle,
      metaDescription,
    };

    try {
      if (isEditing) {
        await adminApi.put(`/products/${id}`, payload);
        setSuccessMsg('Product updated successfully!');
      } else {
        const res = await adminApi.post('/products', payload);
        setSuccessMsg('Product created successfully!');
        setTimeout(() => {
          navigate(`${ADMIN_PATH}/products/${res.data.product?._id}/edit`, { replace: true });
        }, 1000);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to save product.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '60px', textAlign: 'center', color: 'var(--admin-gold)' }}>
        Loading product form...
      </div>
    );
  }

  return (
    <div className="admin-product-form-page">
      {/* Top action bar */}
      <div className="admin-form-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <Link to={`${ADMIN_PATH}/products`} className="admin-btn admin-btn-secondary" style={{ padding: '8px 12px' }}>
            <FiArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="admin-page-title">{isEditing ? `Edit: ${name}` : 'Add New Handcrafted Jutti'}</h1>
            <p className="admin-page-subtitle">
              {isEditing ? `SKU: ${sku || 'Auto'} &bull; Slug: /${slug}` : 'Create a new artisan footwear product entry'}
            </p>
          </div>
        </div>

        <button
          type="button"
          className="admin-btn admin-btn-primary"
          onClick={handleSubmit}
          disabled={saving || !name || !price}
        >
          <FiSave size={16} />
          <span>{saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Publish Product'}</span>
        </button>
      </div>

      {error && (
        <div className="admin-alert admin-alert-danger">
          <FiAlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="admin-alert admin-alert-success">
          <FiCheckCircle size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="admin-form-grid">
        {/* Left Column: General, Pricing, Variants */}
        <div className="admin-form-col-main">
          {/* General Information */}
          <div className="admin-card admin-form-section">
            <div className="admin-card-header">
              <h3 className="admin-card-title">
                <FiPackage color="var(--admin-gold)" /> General Information
              </h3>
            </div>

            <div className="admin-form-group">
              <label className="admin-label">Product Title *</label>
              <input
                type="text"
                placeholder="e.g. Maharani Maroon — Zardozi Kundan"
                className="admin-input"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="admin-form-group">
                <label className="admin-label">URL Slug *</label>
                <input
                  type="text"
                  placeholder="maharani-maroon-zardozi"
                  className="admin-input"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  required
                />
              </div>

              <div className="admin-form-group">
                <label className="admin-label">Product SKU (Stock Code)</label>
                <input
                  type="text"
                  placeholder="e.g. KV-ZAR-001 (Leave empty to auto-generate)"
                  className="admin-input"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                />
              </div>
            </div>

            <div className="admin-form-group">
              <label className="admin-label">Description *</label>
              <textarea
                rows={5}
                placeholder="Describe artisan materials, embroidery technique (zardozi, mirror work, thread art), lining comfort, and occasion styling..."
                className="admin-textarea"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Pricing & Valuation */}
          <div className="admin-card admin-form-section">
            <div className="admin-card-header">
              <h3 className="admin-card-title">
                <FiDollarSign color="var(--admin-gold)" /> Pricing &amp; Profit Margin
              </h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
              <div className="admin-form-group">
                <label className="admin-label">Selling Price (INR ₹) *</label>
                <input
                  type="number"
                  placeholder="2499"
                  className="admin-input"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  required
                  min={0}
                />
              </div>

              <div className="admin-form-group">
                <label className="admin-label">Original Price (Strike-through)</label>
                <input
                  type="number"
                  placeholder="3299"
                  className="admin-input"
                  value={originalPrice}
                  onChange={(e) => setOriginalPrice(e.target.value)}
                  min={0}
                />
              </div>

              <div className="admin-form-group">
                <label className="admin-label">
                  Cost Price (Internal Only)
                </label>
                <input
                  type="number"
                  placeholder="1100"
                  className="admin-input"
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value)}
                  min={0}
                />
                <span style={{ fontSize: '11px', color: 'var(--admin-text-muted)' }}>
                  Used for valuation. Never shown to buyers.
                </span>
              </div>
            </div>
          </div>

          {/* Size Variants & Live Stock Allocation */}
          <div className="admin-card admin-form-section">
            <div className="admin-card-header">
              <div>
                <h3 className="admin-card-title">
                  <FiPackage color="var(--admin-gold)" /> Size Variants &amp; Live Stock
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--admin-text-secondary)', margin: '4px 0 0' }}>
                  Total Catalog Stock: <strong>{totalCalculatedStock} pairs</strong>
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="admin-badge admin-badge-gold">
                  Low Stock Threshold: {lowStockThreshold}
                </span>
              </div>
            </div>

            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Size (India / UK)</th>
                    <th>Variant SKU</th>
                    <th>Color</th>
                    <th>Price (₹)</th>
                    <th>Stock Units</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {variants.map((v, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 600, color: 'var(--admin-gold)' }}>Size {v.size}</td>
                      <td>
                        <input
                          type="text"
                          className="admin-input"
                          style={{ padding: '6px 10px', fontSize: '12px' }}
                          value={v.sku}
                          onChange={(e) => {
                            const updated = [...variants];
                            updated[idx].sku = e.target.value;
                            setVariants(updated);
                          }}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          className="admin-input"
                          style={{ padding: '6px 10px', fontSize: '12px' }}
                          value={v.color}
                          onChange={(e) => {
                            const updated = [...variants];
                            updated[idx].color = e.target.value;
                            setVariants(updated);
                          }}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          className="admin-input"
                          style={{ padding: '6px 10px', fontSize: '12px', width: '90px' }}
                          value={v.price}
                          onChange={(e) => handleVariantPriceChange(idx, e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          className="admin-input"
                          style={{ padding: '6px 10px', fontSize: '12px', width: '80px' }}
                          value={v.stockQuantity}
                          onChange={(e) => handleVariantStockChange(idx, e.target.value)}
                          min={0}
                        />
                      </td>
                      <td>
                        <span
                          className={`admin-badge ${
                            v.stockQuantity > 5
                              ? 'admin-badge-success'
                              : v.stockQuantity > 0
                              ? 'admin-badge-warning'
                              : 'admin-badge-danger'
                          }`}
                        >
                          {v.stockQuantity > 0 ? `${v.stockQuantity} in stock` : 'Out of stock'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Media, Status, Category, SEO */}
        <div className="admin-form-col-side">
          {/* Publishing Status */}
          <div className="admin-card admin-form-section">
            <div className="admin-card-header">
              <h3 className="admin-card-title">Publishing &amp; Status</h3>
            </div>

            <div className="admin-form-group">
              <label className="admin-label">Catalog Status</label>
              <select
                className="admin-select"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="published">Published (Visible on Store)</option>
                <option value="draft">Draft (Internal Review)</option>
              </select>
            </div>

            <div className="admin-form-group">
              <label className="admin-label">Category</label>
              <select
                className="admin-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="bridal">Bridal Collection</option>
                <option value="festive">Festive Collection</option>
                <option value="everyday">Everyday Chic</option>
                <option value="designer">Designer Art</option>
              </select>
            </div>

            <div className="admin-form-group">
              <label className="admin-label">Promotional Badge</label>
              <select
                className="admin-select"
                value={badge}
                onChange={(e) => setBadge(e.target.value)}
              >
                <option value="">No Badge</option>
                <option value="new">New Arrival</option>
                <option value="bestseller">Top Bestseller</option>
                <option value="sale">On Sale</option>
              </select>
            </div>

            <div style={{ marginTop: '14px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={featured}
                  onChange={(e) => setFeatured(e.target.checked)}
                />
                <span style={{ fontSize: '13px', color: 'var(--admin-cream)' }}>
                  Feature this product on Homepage
                </span>
              </label>
            </div>
          </div>

          {/* Primary Media & Gallery */}
          <div className="admin-card admin-form-section">
            <div className="admin-card-header">
              <h3 className="admin-card-title">
                <FiImage color="var(--admin-gold)" /> Product Media
              </h3>
            </div>

            <div className="admin-form-group">
              <label className="admin-label">Primary Image URL / Path</label>
              <input
                type="text"
                placeholder="/images/jutti_maroon_gold.jpg"
                className="admin-input"
                value={image}
                onChange={(e) => setImage(e.target.value)}
                required
              />
            </div>

            {image && (
              <div className="admin-image-preview-box">
                <img
                  src={image}
                  alt="Preview"
                  className="admin-main-preview-img"
                  onError={(e) => { e.target.src = '/favicon.svg'; }}
                />
              </div>
            )}

            {/* Quick sample image picker */}
            <div style={{ marginTop: '12px' }}>
              <span style={{ fontSize: '11px', color: 'var(--admin-text-muted)', display: 'block', marginBottom: '6px' }}>
                Select from existing assets:
              </span>
              <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '6px' }}>
                {SAMPLE_GALLERY_IMAGES.map((sample, i) => (
                  <img
                    key={i}
                    src={sample}
                    alt="sample"
                    style={{
                      width: '36px',
                      height: '36px',
                      objectFit: 'cover',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      border: image === sample ? '2px solid var(--admin-gold)' : '1px solid var(--admin-border)',
                    }}
                    onClick={() => setImage(sample)}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Search Engine Optimization */}
          <div className="admin-card admin-form-section">
            <div className="admin-card-header">
              <h3 className="admin-card-title">
                <FiGlobe color="var(--admin-gold)" /> SEO Metadata
              </h3>
            </div>

            <div className="admin-form-group">
              <label className="admin-label">Meta Title</label>
              <input
                type="text"
                placeholder="e.g. Maharani Maroon Leather Jutti | Kalavatri"
                className="admin-input"
                value={metaTitle}
                onChange={(e) => setMetaTitle(e.target.value)}
              />
            </div>

            <div className="admin-form-group">
              <label className="admin-label">Meta Description</label>
              <textarea
                rows={3}
                placeholder="Brief summary for Google search results..."
                className="admin-textarea"
                value={metaDescription}
                onChange={(e) => setMetaDescription(e.target.value)}
              />
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default ProductForm;
