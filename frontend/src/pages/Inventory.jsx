import { useState, useEffect, useMemo } from 'react';
import { Plus, Edit2, Trash2, Search, Boxes, ChevronUp, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { inventoryApi } from '../api/inventory';
import { productApi } from '../api/products';
import {
  LoadingState, ErrorState, EmptyState, StatusBadge,
  Pagination, ConfirmDialog
} from '../components/common';

const PAGE_SIZE = 15;

function getRiskFromDays(days) {
  if (days < 0) return 'EXPIRED';
  if (days <= 3) return 'HIGH';
  if (days <= 7) return 'MEDIUM';
  return 'LOW';
}

function calcDaysRemaining(expiryDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exp = new Date(expiryDate);
  exp.setHours(0, 0, 0, 0);
  return Math.floor((exp - today) / (1000 * 60 * 60 * 24));
}

function validate(form) {
  const errors = {};
  if (!form.product_id) errors.product_id = 'Product is required';
  if (!form.batch_id.trim()) errors.batch_id = 'Batch ID is required';
  if (form.quantity === '' || isNaN(form.quantity) || Number(form.quantity) < 0) errors.quantity = 'Quantity must be ≥ 0';
  if (!form.purchase_date) errors.purchase_date = 'Purchase date is required';
  if (!form.expiry_date) errors.expiry_date = 'Expiry date is required';
  if (form.purchase_date && form.expiry_date && form.expiry_date < form.purchase_date)
    errors.expiry_date = 'Expiry date must be after purchase date';
  if (!form.storage_location.trim()) errors.storage_location = 'Storage location is required';
  return errors;
}

const EMPTY_FORM = {
  product_id: '', batch_id: '', quantity: '',
  purchase_date: '', expiry_date: '', storage_location: '',
};

function InventoryModal({ batch, products, onClose, onSave }) {
  const isEdit = !!batch;
  const [form, setForm] = useState(batch ? {
    ...batch,
    quantity: String(batch.quantity),
    purchase_date: batch.purchase_date?.split('T')[0] || '',
    expiry_date: batch.expiry_date?.split('T')[0] || '',
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
      const payload = { ...form, quantity: Number(form.quantity) };
      if (isEdit) {
        const res = await inventoryApi.update(batch.batch_id, payload);
        if (res.data.status === 'error') throw new Error(res.data.message);
        toast.success('Inventory batch updated successfully');
      } else {
        const res = await inventoryApi.create(payload);
        if (res.data.status === 'error') throw new Error(res.data.message);
        toast.success('Inventory batch added successfully');
      }
      onSave();
    } catch (err) {
      toast.error(err.message || err.userMessage || 'Unable to save inventory batch');
    } finally {
      setLoading(false);
    }
  };

  const activeProducts = products.filter(p => p.active !== false);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">{isEdit ? 'Edit Inventory Batch' : 'Add Inventory Batch'}</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Product <span>*</span></label>
                <select className={`form-select ${errors.product_id ? 'error' : ''}`}
                  value={form.product_id} onChange={e => set('product_id', e.target.value)}>
                  <option value="">Select product...</option>
                  {activeProducts.map(p => (
                    <option key={p.product_id} value={p.product_id}>
                      {p.product_id} — {p.product_name}
                    </option>
                  ))}
                </select>
                {errors.product_id && <div className="form-error">{errors.product_id}</div>}
              </div>
              <div className="form-group">
                <label className="form-label">Batch ID <span>*</span></label>
                <input className={`form-input ${errors.batch_id ? 'error' : ''}`}
                  value={form.batch_id} onChange={e => set('batch_id', e.target.value)}
                  placeholder="e.g. B033" disabled={isEdit} />
                {errors.batch_id && <div className="form-error">{errors.batch_id}</div>}
              </div>
              <div className="form-group">
                <label className="form-label">Quantity <span>*</span></label>
                <input className={`form-input ${errors.quantity ? 'error' : ''}`}
                  type="number" min="0"
                  value={form.quantity} onChange={e => set('quantity', e.target.value)}
                  placeholder="0" />
                {errors.quantity && <div className="form-error">{errors.quantity}</div>}
              </div>
              <div className="form-group">
                <label className="form-label">Storage Location <span>*</span></label>
                <input className={`form-input ${errors.storage_location ? 'error' : ''}`}
                  value={form.storage_location} onChange={e => set('storage_location', e.target.value)}
                  placeholder="e.g. Refrigerator A" />
                {errors.storage_location && <div className="form-error">{errors.storage_location}</div>}
              </div>
              <div className="form-group">
                <label className="form-label">Purchase Date <span>*</span></label>
                <input className={`form-input ${errors.purchase_date ? 'error' : ''}`}
                  type="date"
                  value={form.purchase_date} onChange={e => set('purchase_date', e.target.value)} />
                {errors.purchase_date && <div className="form-error">{errors.purchase_date}</div>}
              </div>
              <div className="form-group">
                <label className="form-label">Expiry Date <span>*</span></label>
                <input className={`form-input ${errors.expiry_date ? 'error' : ''}`}
                  type="date"
                  value={form.expiry_date} onChange={e => set('expiry_date', e.target.value)} />
                {errors.expiry_date && <div className="form-error">{errors.expiry_date}</div>}
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? (isEdit ? 'Updating...' : 'Adding...') : (isEdit ? 'Update Batch' : 'Add Batch')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Inventory({ search = '' }) {
  const [inventory, setInventory] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [localSearch, setLocalSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState('All');
  const [locationFilter, setLocationFilter] = useState('All');
  const [sortKey, setSortKey] = useState('expiry_date');
  const [sortDir, setSortDir] = useState('asc');
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const productMap = useMemo(() => {
    const m = {};
    products.forEach(p => { m[p.product_id] = p; });
    return m;
  }, [products]);

  const fetchAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const [invRes, prodRes] = await Promise.all([inventoryApi.getAll(), productApi.getAll()]);
      setInventory(invRes.data.inventory || []);
      setProducts(prodRes.data.products || []);
    } catch (err) {
      setError(err.userMessage || 'Failed to load inventory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const locations = useMemo(() => {
    const locs = new Set(inventory.map(i => i.storage_location).filter(Boolean));
    return ['All', ...Array.from(locs).sort()];
  }, [inventory]);

  const effectiveSearch = search || localSearch;

  const enriched = useMemo(() => inventory.map(item => {
    const days = calcDaysRemaining(item.expiry_date);
    return { ...item, days_remaining: days, risk: getRiskFromDays(days) };
  }), [inventory]);

  const filtered = useMemo(() => {
    let list = enriched;
    if (effectiveSearch) {
      const q = effectiveSearch.toLowerCase();
      list = list.filter(i =>
        i.batch_id?.toLowerCase().includes(q) ||
        i.product_id?.toLowerCase().includes(q) ||
        productMap[i.product_id]?.product_name?.toLowerCase().includes(q) ||
        i.storage_location?.toLowerCase().includes(q)
      );
    }
    if (riskFilter !== 'All') list = list.filter(i => i.risk === riskFilter);
    if (locationFilter !== 'All') list = list.filter(i => i.storage_location === locationFilter);
    list = [...list].sort((a, b) => {
      const av = a[sortKey] ?? '';
      const bv = b[sortKey] ?? '';
      const cmp = typeof av === 'number' ? av - bv : String(av).localeCompare(String(bv));
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [enriched, effectiveSearch, riskFilter, locationFilter, sortKey, sortDir, productMap]);

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
    setPage(1);
  };

  const SortIcon = ({ k }) => sortKey === k
    ? (sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)
    : null;

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      const res = await inventoryApi.delete(deleteTarget.batch_id);
      if (res.data.status === 'error') throw new Error(res.data.message);
      toast.success(`Batch ${deleteTarget.batch_id} deleted successfully`);
      setDeleteTarget(null);
      fetchAll();
    } catch (err) {
      toast.error(err.message || 'Unable to delete batch');
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading) return <LoadingState text="Loading inventory..." />;
  if (error) return <ErrorState message={error} onRetry={fetchAll} />;

  const riskCounts = {
    All: enriched.length,
    EXPIRED: enriched.filter(e => e.risk === 'EXPIRED').length,
    HIGH: enriched.filter(e => e.risk === 'HIGH').length,
    MEDIUM: enriched.filter(e => e.risk === 'MEDIUM').length,
    LOW: enriched.filter(e => e.risk === 'LOW').length,
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-inner">
          <div>
            <div className="page-title">Inventory Batches</div>
            <div className="page-subtitle">{inventory.length} batches · {enriched.filter(e => e.risk !== 'LOW').length} with risk</div>
          </div>
          <button className="btn btn-primary" onClick={() => setModal('add')}>
            <Plus size={15} /> Add Batch
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="card section-mb">
        <div className="card-body" style={{ paddingTop: 16, paddingBottom: 16 }}>
          <div className="filter-bar">
            <div className="search-field">
              <Search size={15} />
              <input
                placeholder="Search batch, product, location..."
                value={localSearch}
                onChange={e => { setLocalSearch(e.target.value); setPage(1); }}
              />
            </div>
            <div className="filter-tabs">
              {['All', 'EXPIRED', 'HIGH', 'MEDIUM', 'LOW'].map(r => (
                <button key={r} className={`filter-tab ${riskFilter === r ? 'active' : ''}`}
                  onClick={() => { setRiskFilter(r); setPage(1); }}>
                  {r} {riskCounts[r] !== undefined ? `(${riskCounts[r]})` : ''}
                </button>
              ))}
            </div>
            <select className="filter-select" value={locationFilter}
              onChange={e => { setLocationFilter(e.target.value); setPage(1); }}>
              {locations.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th className="sortable" onClick={() => toggleSort('batch_id')}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>Batch ID <SortIcon k="batch_id" /></span>
                </th>
                <th>Product</th>
                <th className="sortable" onClick={() => toggleSort('quantity')}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>Quantity <SortIcon k="quantity" /></span>
                </th>
                <th className="sortable" onClick={() => toggleSort('purchase_date')}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>Purchase Date <SortIcon k="purchase_date" /></span>
                </th>
                <th className="sortable" onClick={() => toggleSort('expiry_date')}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>Expiry Date <SortIcon k="expiry_date" /></span>
                </th>
                <th>Storage</th>
                <th className="sortable" onClick={() => toggleSort('days_remaining')}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>Days Left <SortIcon k="days_remaining" /></span>
                </th>
                <th>Risk</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={9}>
                    <EmptyState icon={Boxes} title="No batches found" text="Try adjusting your filters." />
                  </td>
                </tr>
              ) : paginated.map(item => {
                const prod = productMap[item.product_id];
                return (
                  <tr key={item.batch_id}>
                    <td><span className="td-mono">{item.batch_id}</span></td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>
                        {prod?.product_name || item.product_id}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                        {item.product_id} · {prod?.category || ''}
                      </div>
                    </td>
                    <td style={{ fontWeight: 600 }}>{item.quantity}</td>
                    <td className="td-muted">{item.purchase_date?.split('T')[0]}</td>
                    <td className="td-muted">{item.expiry_date?.split('T')[0]}</td>
                    <td className="td-muted">{item.storage_location}</td>
                    <td>
                      <span style={{
                        fontWeight: 700,
                        color: item.days_remaining < 0 ? 'var(--color-danger)'
                          : item.days_remaining <= 3 ? 'var(--color-danger)'
                          : item.days_remaining <= 7 ? 'var(--color-warning)'
                          : 'var(--color-text-primary)'
                      }}>
                        {item.days_remaining < 0 ? `${Math.abs(item.days_remaining)}d ago` : `${item.days_remaining}d`}
                      </span>
                    </td>
                    <td><StatusBadge risk={item.risk} /></td>
                    <td>
                      <div className="table-actions">
                        <button className="btn btn-ghost btn-icon" title="Edit batch" onClick={() => setModal(item)}>
                          <Edit2 size={14} />
                        </button>
                        <button className="btn btn-ghost btn-icon" title="Delete batch"
                          style={{ color: 'var(--color-danger)' }}
                          onClick={() => setDeleteTarget(item)}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
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

      {modal && (
        <InventoryModal
          batch={modal === 'add' ? null : modal}
          products={products}
          onClose={() => setModal(null)}
          onSave={() => { setModal(null); fetchAll(); }}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete Inventory Batch"
          message={`Are you sure you want to permanently delete batch ${deleteTarget.batch_id}? This action cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={deleteLoading}
        />
      )}
    </div>
  );
}
