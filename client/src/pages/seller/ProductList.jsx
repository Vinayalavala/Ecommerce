
import { useAppContext } from '../../context/appContext';
import assets from '../../assets/assets';
import toast from 'react-hot-toast';
import { useState, useMemo, useEffect } from 'react';
import {
  FiSearch,
  FiX,
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiArrowUp,
  FiArrowDown,
  FiChevronLeft,
  FiChevronRight,
  FiPackage,
} from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';

const PAGE_SIZE = 10;

const Toggle = ({ checked, disabled, onChange, label }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    disabled={disabled}
    onClick={onChange}
    className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60 ${
      checked ? 'bg-emerald-500' : 'bg-gray-300'
    }`}
  >
    <span
      className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${
        checked ? 'translate-x-[18px]' : 'translate-x-0.5'
      }`}
    />
  </button>
);

const IconButton = ({ title, onClick, disabled, danger, children }) => (
  <button
    type="button"
    title={title}
    aria-label={title}
    onClick={onClick}
    disabled={disabled}
    className={`flex h-8 w-8 items-center justify-center rounded-md text-gray-400 transition disabled:opacity-40 ${
      danger ? 'hover:bg-rose-50 hover:text-rose-600' : 'hover:bg-gray-100 hover:text-gray-900'
    }`}
  >
    {children}
  </button>
);

const Price = ({ product, currency }) => {
  const offer = Number(product.offerPrice);
  const mrp = Number(product.price);
  if (!Number.isFinite(offer)) return <span className="text-gray-400">N/A</span>;
  return (
    <div className="tabular-nums">
      <span className="font-medium text-gray-900">
        {currency}
        {offer.toFixed(2)}
      </span>
      {Number.isFinite(mrp) && mrp > offer && (
        <span className="ml-1.5 text-xs text-gray-400 line-through">
          {currency}
          {mrp.toFixed(2)}
        </span>
      )}
    </div>
  );
};

const ProductList = () => {
  const { products, currency, axios, fetchProducts } = useAppContext();
  const [loadingProductId, setLoadingProductId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [stockFilter, setStockFilter] = useState('all');
  const [sort, setSort] = useState({ key: null, dir: 'asc' });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Safe list so .map/.filter never crash while products is undefined
  const productList = Array.isArray(products) ? products : [];

  // Stop loading once products have been fetched
  useEffect(() => {
    if (Array.isArray(products)) {
      setLoading(false);
    }
  }, [products]);

  // Toggle Stock Status
  const toggleStock = async (id, inStock) => {
    try {
      setLoadingProductId(id);
      const { data } = await axios.post('/api/product/stock', { id, inStock });
      if (data.success) {
        fetchProducts();
        toast.success(data.message);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoadingProductId(null);
    }
  };

  // Delete Product
  const deleteProduct = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;

    try {
      setLoadingProductId(id);
      const { data } = await axios.delete(`/api/product/delete/${id}`);
      if (data.success) {
        toast.success('Product deleted successfully.');
        fetchProducts();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message || 'Something went wrong.');
    } finally {
      setLoadingProductId(null);
    }
  };

  // Navigate to AddProduct page for editing
  const handleEdit = (product) => {
    navigate(`/seller/add-product?edit=${product._id}`, { state: { product } });
  };

  const openProduct = (product) => {
    navigate(`/products/${(product.category || '').toLowerCase()}/${product._id}`);
    window.scrollTo(0, 0);
  };

  // Category filter options
  const categories = useMemo(() => {
    const set = new Set(productList.map((p) => p.category).filter(Boolean));
    return ['All', ...Array.from(set)];
  }, [productList]);

  const stats = useMemo(() => {
    const inStock = productList.filter((p) => p.inStock).length;
    return { total: productList.length, inStock, outOfStock: productList.length - inStock };
  }, [productList]);

  // Filter, then sort
  const visibleProducts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const filtered = productList.filter(
      (product) =>
        (product.name || '').toLowerCase().includes(term) &&
        (categoryFilter === 'All' || product.category === categoryFilter) &&
        (stockFilter === 'all' ||
          (stockFilter === 'in' && product.inStock) ||
          (stockFilter === 'out' && !product.inStock))
    );
    if (!sort.key) return filtered;

    const dir = sort.dir === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      if (sort.key === 'name') return dir * (a.name || '').localeCompare(b.name || '');
      return dir * ((Number(a.offerPrice) || 0) - (Number(b.offerPrice) || 0));
    });
  }, [productList, searchTerm, categoryFilter, stockFilter, sort]);

  // Back to page 1 whenever the result set changes shape
  useEffect(() => {
    setPage(1);
  }, [searchTerm, categoryFilter, stockFilter, sort]);

  const pageCount = Math.max(1, Math.ceil(visibleProducts.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageItems = visibleProducts.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const rangeStart = visibleProducts.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(currentPage * PAGE_SIZE, visibleProducts.length);

  const hasFilters = searchTerm || categoryFilter !== 'All' || stockFilter !== 'all';
  const resetFilters = () => {
    setSearchTerm('');
    setCategoryFilter('All');
    setStockFilter('all');
  };

  const toggleSort = (key) =>
    setSort((s) =>
      s.key !== key ? { key, dir: 'asc' } : s.dir === 'asc' ? { key, dir: 'desc' } : { key: null, dir: 'asc' }
    );

  const SortArrow = ({ k }) =>
    sort.key === k ? (sort.dir === 'asc' ? <FiArrowUp size={12} /> : <FiArrowDown size={12} />) : null;

  if (loading) {
    return (
      <div className="flex-1 h-[95vh] overflow-y-auto">
        <div className="max-w-6xl space-y-5 p-4 md:p-10">
          <div className="h-7 w-32 animate-pulse rounded bg-gray-200" />
          <div className="h-10 w-full animate-pulse rounded-lg bg-gray-100 sm:w-96" />
          <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-3 p-4">
                <div className="h-11 w-11 animate-pulse rounded-md bg-gray-100" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-1/2 animate-pulse rounded bg-gray-100" />
                  <div className="h-3 w-1/4 animate-pulse rounded bg-gray-100" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const empty = visibleProducts.length === 0;

  return (
    <div className="no-scrollbar flex-1 h-[95vh] overflow-y-scroll">
      <div className="w-full max-w-6xl space-y-5 p-4 md:p-10">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl font-semibold text-gray-900">Products</h1>
          <button
            onClick={() => navigate('/seller/add-product')}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3.5 text-sm font-medium text-white transition hover:bg-primary-dull"
          >
            <FiPlus size={16} /> Add product
          </button>
        </div>

        {/* Status tabs */}
        <div className="-mb-px flex gap-6 overflow-x-auto whitespace-nowrap border-b border-gray-200 text-sm">
          {[
            ['all', 'All', stats.total],
            ['in', 'In stock', stats.inStock],
            ['out', 'Out of stock', stats.outOfStock],
          ].map(([id, label, count]) => {
            const active = stockFilter === id;
            return (
              <button
                key={id}
                onClick={() => setStockFilter(id)}
                className={`-mb-px border-b-2 pb-3 font-medium transition ${
                  active
                    ? 'border-gray-900 text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                {label}
                <span className="ml-1.5 text-xs tabular-nums text-gray-400">{count}</span>
              </button>
            );
          })}
        </div>

        {/* Search + category */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1 sm:max-w-sm">
            <FiSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search products"
              className="h-10 w-full rounded-lg border border-gray-300 bg-white pl-9 pr-9 text-sm outline-none placeholder:text-gray-400 focus:border-primary focus:ring-1 focus:ring-primary"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded text-gray-400 hover:text-gray-700"
              >
                <FiX size={15} />
              </button>
            )}
          </div>

          <select
            className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat === 'All' ? 'All categories' : cat}
              </option>
            ))}
          </select>

          {hasFilters && (
            <button onClick={resetFilters} className="text-left text-sm text-gray-500 hover:text-gray-900 hover:underline">
              Reset filters
            </button>
          )}
        </div>

        {/* Empty state */}
        {empty && (
          <div className="rounded-lg border border-gray-200 bg-white px-6 py-16 text-center">
            <FiPackage size={28} className="mx-auto text-gray-300" />
            <p className="mt-3 text-sm font-medium text-gray-900">
              {stats.total === 0 ? 'No products yet' : 'No products found'}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              {stats.total === 0 ? 'Add a product and it will show up here.' : 'Try changing your search or filters.'}
            </p>
            {stats.total === 0 ? (
              <button
                onClick={() => navigate('/seller/add-product')}
                className="mt-5 inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3.5 text-sm font-medium text-white hover:bg-primary-dull"
              >
                <FiPlus size={16} /> Add product
              </button>
            ) : (
              hasFilters && (
                <button
                  onClick={resetFilters}
                  className="mt-5 h-9 rounded-lg border border-gray-300 px-3.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Reset filters
                </button>
              )
            )}
          </div>
        )}

        {/* Desktop / tablet table */}
        {!empty && (
          <div className="hidden overflow-hidden rounded-lg border border-gray-200 bg-white md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs font-medium text-gray-500">
                <tr>
                  <th className="px-4 py-2.5">
                    <button onClick={() => toggleSort('name')} className="inline-flex items-center gap-1 hover:text-gray-900">
                      Product <SortArrow k="name" />
                    </button>
                  </th>
                  <th className="px-4 py-2.5">
                    <button onClick={() => toggleSort('price')} className="inline-flex items-center gap-1 hover:text-gray-900">
                      Price <SortArrow k="price" />
                    </button>
                  </th>
                  <th className="px-4 py-2.5">Stock</th>
                  <th className="w-24 px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {pageItems.map((product) => {
                  const busy = loadingProductId === product._id;
                  return (
                    <tr key={product._id} className="border-t border-gray-100 transition hover:bg-gray-50/60">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => openProduct(product)}
                            className="h-11 w-11 shrink-0 overflow-hidden rounded-md border border-gray-200 bg-gray-50"
                            aria-label={`Open ${product.name}`}
                          >
                            <img
                              src={product.image?.[0] || assets.placeholder_image}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          </button>
                          <div className="min-w-0">
                            <button
                              onClick={() => openProduct(product)}
                              className="block max-w-[280px] truncate text-left font-medium text-gray-900 hover:underline"
                            >
                              {product.name}
                            </button>
                            <p className="text-xs capitalize text-gray-500">{product.category || 'Uncategorized'}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <Price product={product} currency={currency} />
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <Toggle
                            checked={!!product.inStock}
                            disabled={busy}
                            label={`Toggle stock for ${product.name}`}
                            onChange={() => toggleStock(product._id, !product.inStock)}
                          />
                          <span className={`text-xs ${product.inStock ? 'text-gray-600' : 'text-rose-600'}`}>
                            {product.inStock ? 'In stock' : 'Out of stock'}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-0.5">
                          <IconButton title="Edit" onClick={() => handleEdit(product)}>
                            <FiEdit2 size={15} />
                          </IconButton>
                          <IconButton title="Delete" danger disabled={busy} onClick={() => deleteProduct(product._id)}>
                            <FiTrash2 size={15} />
                          </IconButton>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Mobile list */}
        {!empty && (
          <ul className="divide-y divide-gray-100 overflow-hidden rounded-lg border border-gray-200 bg-white md:hidden">
            {pageItems.map((product) => {
              const busy = loadingProductId === product._id;
              return (
                <li key={product._id} className="p-3">
                  <div className="flex gap-3">
                    <button
                      onClick={() => openProduct(product)}
                      className="h-14 w-14 shrink-0 overflow-hidden rounded-md border border-gray-200 bg-gray-50"
                      aria-label={`Open ${product.name}`}
                    >
                      <img
                        src={product.image?.[0] || assets.placeholder_image}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </button>
                    <div className="min-w-0 flex-1">
                      <button
                        onClick={() => openProduct(product)}
                        className="line-clamp-2 text-left text-sm font-medium leading-snug text-gray-900"
                      >
                        {product.name}
                      </button>
                      <p className="mt-0.5 text-xs capitalize text-gray-500">{product.category || 'Uncategorized'}</p>
                      <div className="mt-1 text-sm">
                        <Price product={product} currency={currency} />
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
                    <div className="flex items-center gap-2.5">
                      <Toggle
                        checked={!!product.inStock}
                        disabled={busy}
                        label={`Toggle stock for ${product.name}`}
                        onChange={() => toggleStock(product._id, !product.inStock)}
                      />
                      <span className={`text-xs ${product.inStock ? 'text-gray-600' : 'text-rose-600'}`}>
                        {product.inStock ? 'In stock' : 'Out of stock'}
                      </span>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <IconButton title="Edit" onClick={() => handleEdit(product)}>
                        <FiEdit2 size={16} />
                      </IconButton>
                      <IconButton title="Delete" danger disabled={busy} onClick={() => deleteProduct(product._id)}>
                        <FiTrash2 size={16} />
                      </IconButton>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {/* Pagination */}
        {!empty && (
          <div className="mb-12 flex items-center justify-between text-sm text-gray-500">
            <p className="tabular-nums">
              {rangeStart}–{rangeEnd} of {visibleProducts.length}
            </p>
            {pageCount > 1 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  aria-label="Previous page"
                  className="flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 bg-white text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <FiChevronLeft size={16} />
                </button>
                <span className="px-2 tabular-nums">
                  {currentPage} / {pageCount}
                </span>
                <button
                  onClick={() => setPage(currentPage + 1)}
                  disabled={currentPage === pageCount}
                  aria-label="Next page"
                  className="flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 bg-white text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <FiChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductList;
