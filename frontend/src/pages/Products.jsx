import { useState, useEffect, useMemo } from 'react';
import { Plus, Edit2, Trash2, Search, Package, ChevronUp, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { productApi } from '../api/products';
import {
  LoadingState, ErrorState, EmptyState, StatusBadge,
  Pagination, ConfirmDialog
} from '../components/common';

const PAGE_SIZE = 15;

const CATEGORIES = ['All', 'Fruits & Vegetables', 'Dairy & Eggs', 'Meat & Seafood',
  'Bakery', 'Beverages', 'Snacks', 'Frozen Foods', 'Canned Goods',
  'Condiments', 'Cleaning', 'Personal Care', 'Grains & Pasta'];

const EMPTY_FORM = {
  product_id: '', product_name: '', category: '',
  price: '', supplier: '', minimum_stock: '', maximum_stock: '',
};

function validate(form) {
  const errors = {};
  if (!form.product_id.trim()) errors.product_id = 'Product ID is required';
  if (!form.product_name.trim()) errors.product_name = 'Product name is required';
  if (!form.category) errors.category = 'Category is required';
  if (!form.supplier.trim()) errors.supplier = 'Supplier is required';
  if (!form.price || isNaN(form.price) || Number(form.price) <= 0) errors.price = 'Price must be > 0';
  if (form.minimum_stock === '' || isNaN(form.minimum_stock) || Number(form.minimum_stock) < 0) errors.minimum_stock = 'Min stock must be ≥ 0';
  if (form.maximum_stock === '' || isNaN(form.maximum_stock) || Number(form.maximum_stock) < 0) errors.maximum_stock = 'Max stock must be ≥ 0';
  if (Number(form.minimum_stock) > Number(form.maximum_stock)) errors.maximum_stock = 'Max stock must be ≥ min stock';
  return errors;
}

function ProductModal({ product, onClose, onSave }) {
  const isEdit = !!product;
  const [form, setForm] = useState(product ? {
    ...product,
    price: String(product.price),
    minimum_stock: String(product.minimum_stock),
    maximum_stock: String(product.maximum_stock),
  } : { ...EMPTY_FORM });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const set = (key, val) => {
    setForm(f => ({ ...f, [key]: val }));
    if (errors[key]) setErrors(e => ({ ...e, [key]: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate(form);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    try {
      const payload = {
        ...form,
        price: Number(form.price),
        minimum_stock: Number(form.minimum_stock),
        maximum_stock: Number(form.maximum_stock),
      };
      if (isEdit) {
        const res = await productApi.update(product.product_id, payload);
        if (res.data.status === 'error') throw new Error(res.data.message);
        toast.success('Product updated successfully');
      } else {
        const res = await productApi.create(payload);
        if (res.data.status === 'error') throw new Error(res.data.message);
        toast.success('Product added successfully');
      }
      onSave();
    } catch (err) {
      toast.error(err.message || err.userMessage || 'Unable to save product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">{isEdit ? 'Edit Product' : 'Add New Product'}</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Product ID <span>*</span></label>
                <input className={`form-input ${errors.product_id ? 'error' : ''}`}
                  value={form.product_id} onChange={e => set('product_id', e.target.value)}
                  placeholder="e.g. P026" disabled={isEdit} />
                {errors.product_id && <div className="form-error">{errors.product_id}</div>}
              </div>
              <div className="form-group">
                <label className="form-label">Category <span>*</span></label>
                <select className={`form-select ${errors.category ? 'error' : ''}`}
                  value={form.category} onChange={e => set('category', e.target.value)}>
                  <option value="">Select category...</option>
                  {CATEGORIES.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                {errors.category && <div className="form-error">{errors.category}</div>}
              </div>
              <div className="form-group full-width">
                <label className="form-label">Product Name <span>*</span></label>
                <input className={`form-input ${errors.product_name ? 'error' : ''}`}
                  value={form.product_name} onChange={e => set('product_name', e.target.value)}
                  placeholder="e.g. Organic Whole Milk" />
                {errors.product_name && <div className="form-error">{errors.product_name}</div>}
              </div>
              <div className="form-group">
                <label className="form-label">Price (₹) <span>*</span></label>
                <input className={`form-input ${errors.price ? 'error' : ''}`}
                  type="number" step="0.01" min="0"
                  value={form.price} onChange={e => set('price', e.target.value)}
                  placeholder="0.00" />
                {errors.price && <div className="form-error">{errors.price}</div>}
              </div>
              <div className="form-group">
                <label className="form-label">Supplier <span>*</span></label>
                <input className={`form-input ${errors.supplier ? 'error' : ''}`}
                  value={form.supplier} onChange={e => set('supplier', e.target.value)}
                  placeholder="e.g. FarmFresh Co." />
                {errors.supplier && <div className="form-error">{errors.supplier}</div>}
              </div>
              <div className="form-group">
                <label className="form-label">Min Stock <span>*</span></label>
                <input className={`form-input ${errors.minimum_stock ? 'error' : ''}`}
                  type="number" min="0"
                  value={form.minimum_stock} onChange={e => set('minimum_stock', e.target.value)}
                  placeholder="0" />
                {errors.minimum_stock && <div className="form-error">{errors.minimum_stock}</div>}
              </div>
              <div className="form-group">
                <label className="form-label">Max Stock <span>*</span></label>
                <input className={`form-input ${errors.maximum_stock ? 'error' : ''}`}
                  type="number" min="0"
                  value={form.maximum_stock} onChange={e => set('maximum_stock', e.target.value)}
                  placeholder="0" />
                {errors.maximum_stock && <div className="form-error">{errors.maximum_stock}</div>}
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? (isEdit ? 'Updating...' : 'Adding...') : (isEdit ? 'Update Product' : 'Add Product')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Products({ search = '' }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [localSearch, setLocalSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [sortKey, setSortKey] = useState('product_id');
  const [sortDir, setSortDir] = useState('asc');
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(null); // null | 'add' | product
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await productApi.getAll();
      setProducts(res.data.products || []);
    } catch (err) {
      setError(err.userMessage || 'Failed to load products.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProducts(); }, []);

  // Merge global search with local search
  const effectiveSearch = search || localSearch;

  const categories = useMemo(() => {
    const cats = new Set(products.map(p => p.category).filter(Boolean));
    return ['All', ...Array.from(cats).sort()];
  }, [products]);

  const filtered = useMemo(() => {
    let list = products;
    if (effectiveSearch) {
      const q = effectiveSearch.toLowerCase();
      list = list.filter(p =>
        p.product_id?.toLowerCase().includes(q) ||
        p.product_name?.toLowerCase().includes(q) ||
        p.supplier?.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q)
      );
    }
    if (categoryFilter !== 'All') {
      list = list.filter(p => p.category === categoryFilter);
    }
    list = [...list].sort((a, b) => {
      const av = a[sortKey] ?? '';
      const bv = b[sortKey] ?? '';
      const cmp = typeof av === 'number' ? av - bv : String(av).localeCompare(String(bv));
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [products, effectiveSearch, categoryFilter, sortKey, sortDir]);

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
    setPage(1);
  };

  const SortIcon = ({ k }) => {
    if (sortKey !== k) return null;
    return sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />;
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      const res = await productApi.delete(deleteTarget.product_id);
      if (res.data.status === 'error') throw new Error(res.data.message);
      toast.success(`Product ${deleteTarget.product_id} deactivated`);
      setDeleteTarget(null);
      fetchProducts();
    } catch (err) {
      toast.error(err.message || 'Unable to delete product');
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading) return <LoadingState text="Loading products..." />;
  if (error) return <ErrorState message={error} onRetry={fetchProducts} />;

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-inner">
          <div>
            <div className="page-title">Products</div>
            <div className="page-subtitle">{products.length} products in catalog</div>
          </div>
          <button className="btn btn-primary" onClick={() => setModal('add')}>
            <Plus size={15} /> Add Product
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card section-mb">
        <div className="card-body" style={{ paddingTop: 16, paddingBottom: 16 }}>
          <div className="filter-bar">
            <div className="search-field">
              <Search size={15} />
              <input
                type="text"
                placeholder="Search products, suppliers..."
                value={localSearch}
                onChange={e => { setLocalSearch(e.target.value); setPage(1); }}
              />
            </div>
            <select className="filter-select" value={categoryFilter} onChange={e => { setCategoryFilter(e.target.value); setPage(1); }}>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <div style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--color-text-muted)' }}>
              {filtered.length} of {products.length} products
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th className="sortable" onClick={() => toggleSort('product_id')}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>ID <SortIcon k="product_id" /></span>
                </th>
                <th className="sortable" onClick={() => toggleSort('product_name')}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>Name <SortIcon k="product_name" /></span>
                </th>
                <th>Category</th>
                <th className="sortable" onClick={() => toggleSort('price')}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>Price <SortIcon k="price" /></span>
                </th>
                <th>Supplier</th>
                <th className="sortable" onClick={() => toggleSort('minimum_stock')}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>Min Stock <SortIcon k="minimum_stock" /></span>
                </th>
                <th className="sortable" onClick={() => toggleSort('maximum_stock')}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>Max Stock <SortIcon k="maximum_stock" /></span>
                </th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={9}>
                    <EmptyState icon={Package} title="No products found" text="Try adjusting your search or filters." />
                  </td>
                </tr>
              ) : paginated.map(p => (
                <tr key={p.product_id}>
                  <td><span className="td-mono">{p.product_id}</span></td>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{p.product_name}</div>
                  </td>
                  <td>
                    <span className="badge badge-info" style={{ fontSize: 10 }}>{p.category}</span>
                  </td>
                  <td style={{ fontWeight: 600 }}>₹{Number(p.price).toFixed(2)}</td>
                  <td className="td-muted">{p.supplier}</td>
                  <td>{p.minimum_stock}</td>
                  <td>{p.maximum_stock}</td>
                  <td>
                    <StatusBadge risk={p.active === false ? 'INACTIVE' : 'ACTIVE'} />
                  </td>
                  <td>
                    <div className="table-actions">
                      <button className="btn btn-ghost btn-icon" title="Edit product" onClick={() => setModal(p)}>
                        <Edit2 size={14} />
                      </button>
                      <button className="btn btn-ghost btn-icon" title="Deactivate product"
                        style={{ color: 'var(--color-danger)' }}
                        onClick={() => setDeleteTarget(p)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length > PAGE_SIZE && (
          <Pagination
            page={page}
            totalPages={totalPages}
            onPage={setPage}
            totalItems={filtered.length}
            pageSize={PAGE_SIZE}
          />
        )}
      </div>

      {/* Add/Edit Modal */}
      {modal && (
        <ProductModal
          product={modal === 'add' ? null : modal}
          onClose={() => setModal(null)}
          onSave={() => { setModal(null); fetchProducts(); }}
        />
      )}

      {/* Confirm Delete */}
      {deleteTarget && (
        <ConfirmDialog
          title="Deactivate Product"
          message={`Are you sure you want to deactivate ${deleteTarget.product_name} (${deleteTarget.product_id})? This is a soft delete and the product will be marked as inactive.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={deleteLoading}
        />
      )}
    </div>
  );
}
