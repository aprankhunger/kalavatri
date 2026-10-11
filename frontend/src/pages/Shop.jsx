import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FiX } from 'react-icons/fi';
import ProductCard from '../components/ProductCard';
import { useProducts } from '../hooks/useProducts';
import { useStoreConfig } from '../hooks/useStoreConfig';
import './Shop.css';

const SORTS = [
  { value: 'featured', label: 'Featured' },
  { value: 'newest', label: 'Newest' },
  { value: 'popular', label: 'Most Popular' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
];

const BADGES = [
  { value: '', label: 'All' },
  { value: 'new', label: 'New' },
  { value: 'bestseller', label: 'Bestsellers' },
  { value: 'sale', label: 'On Sale' },
];

const sortProducts = (list, sort) => {
  const sorted = [...list];
  switch (sort) {
    case 'newest':
      return sorted.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0) || (b.badge === 'new') - (a.badge === 'new'));
    case 'popular':
      return sorted.sort((a, b) => (b.reviewCount || 0) - (a.reviewCount || 0));
    case 'price-asc':
      return sorted.sort((a, b) => a.price - b.price);
    case 'price-desc':
      return sorted.sort((a, b) => b.price - a.price);
    default:
      return sorted.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
  }
};

const Shop = () => {
  const [params, setParams] = useSearchParams();
  const { products, isLoading: loading } = useProducts();
  const { config } = useStoreConfig();

  const category = params.get('category') || '';
  const badge = params.get('badge') || '';
  const search = params.get('search') || '';
  const sort = params.get('sort') || 'featured';

  const updateParam = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    const list = products.filter((p) => {
      if (category && p.category !== category) return false;
      if (badge === 'sale' && !(p.badge === 'sale' || p.discount > 0)) return false;
      if (badge && badge !== 'sale' && p.badge !== badge) return false;
      if (term && !`${p.name} ${p.description || ''} ${p.category || ''}`.toLowerCase().includes(term)) return false;
      return true;
    });
    return sortProducts(list, sort);
  }, [products, category, badge, search, sort]);

  const activeCategory = config.categories.find((c) => c.slug === category);
  const heading = search ? `Results for "${search}"` : activeCategory?.name || (badge === 'sale' ? 'On Sale' : 'All Juttis');

  return (
    <div className="shop-page">
      <div className="container">
        <nav className="breadcrumbs" aria-label="Breadcrumb">
          <Link to="/">Home</Link> &gt; <span>Shop</span>
        </nav>

        <header className="shop-header">
          <h1 className="shop-title text-balance">{heading}</h1>
          {activeCategory?.description && <p className="shop-subtitle text-pretty">{activeCategory.description}</p>}
        </header>

        <div className="shop-toolbar">
          <div className="chip-row" role="group" aria-label="Filter by collection">
            <button className={`chip ${!category ? 'active' : ''}`} onClick={() => updateParam('category', '')}>All</button>
            {config.categories.map((c) => (
              <button
                key={c.slug}
                className={`chip ${category === c.slug ? 'active' : ''}`}
                onClick={() => updateParam('category', c.slug)}
              >
                {c.name}
              </button>
            ))}
          </div>

          <div className="shop-toolbar-right">
            <label className="sr-only" htmlFor="badge-filter">Filter</label>
            <select id="badge-filter" value={badge} onChange={(e) => updateParam('badge', e.target.value)}>
              {BADGES.map((b) => (
                <option key={b.value} value={b.value}>{b.label}</option>
              ))}
            </select>
            <label className="sr-only" htmlFor="sort-select">Sort by</label>
            <select id="sort-select" value={sort} onChange={(e) => updateParam('sort', e.target.value === 'featured' ? '' : e.target.value)}>
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>

        {search && (
          <button className="search-pill" onClick={() => updateParam('search', '')}>
            Search: {search} <FiX aria-hidden="true" />
            <span className="sr-only">Clear search</span>
          </button>
        )}

        {loading ? (
          <div className="loading-screen"><div className="loader" /></div>
        ) : filtered.length === 0 ? (
          <div className="shop-empty">
            <h2>No juttis found</h2>
            <p>Try a different collection or clear your filters.</p>
            <Link to="/shop" className="btn btn-primary">Clear Filters</Link>
          </div>
        ) : (
          <>
            <p className="shop-count" aria-live="polite">{filtered.length} {filtered.length === 1 ? 'product' : 'products'}</p>
            <div className="products-grid shop-grid stagger-children visible" key={`${category}-${badge}-${search}-${sort}`}>
              {filtered.map((product) => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Shop;
