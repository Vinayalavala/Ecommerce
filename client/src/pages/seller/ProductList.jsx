import { useAppContext } from '../../context/appContext';
import assets from '../../assets/assets';
import toast from 'react-hot-toast';
import { useState, useMemo, useEffect } from 'react';
import {
  FaTrash,
  FaEdit,
  FaSearch,
  FaTimes,
  FaBoxOpen,
  FaCheckCircle,
  FaTimesCircle,
} from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

const StatCard = ({ icon, label, value, tone }) => (
  <div className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg ${tone}`}>
      {icon}
    </div>
    <div className="min-w-0">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="truncate text-lg font-semibold text-gray-900">{value}</p>
    </div>
  </div>
);

const ProductList = () => {
  const { products, currency, axios, fetchProducts } = useAppContext();
  const [loadingProductId, setLoadingProductId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [stockFilter, setStockFilter] = useState('all');
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

  // Category filter options
  const categories = useMemo(() => {
    const set = new Set(productList.map((p) => p.category).filter(Boolean));
    return ['All', ...Array.from(set)];
  }, [productList]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return productList.filter(
      (product) =>
        (product.name || '').toLowerCase().includes(term) &&
        (categoryFilter === 'All' || product.category === categoryFilter) &&
        (stockFilter === 'all' ||
          (stockFilter === 'in' && product.inStock) ||
          (stockFilter === 'out' && !product.inStock))
    );
  }, [productList, searchTerm, categoryFilter, stockFilter]);

  const stats = useMemo(() => {
    const inStock = productList.filter((p) => p.inStock).length;
    return { total: productList.length, inStock, outOfStock: productList.length - inStock };
  }, [productList]);

  const hasActiveFilters = searchTerm || categoryFilter !== 'All' || stockFilter !== 'all';
  const clearFilters = () => {
    setSearchTerm('');
    setCategoryFilter('All');
    setStockFilter('all');
  };

  // Skeleton until products are ready
  if (loading) {
    return (
      <div className="flex-1 h-[95vh] overflow-y-auto">
        <div className="max-w-6xl space-y-6 p-4 md:p-10">
          <div className="h-8 w-48 animate-pulse rounded-lg bg-gray-200" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-2xl bg-gray-100" />
            ))}
          </div>
          <div className="h-14 animate-pulse rounded-2xl bg-gray-100" />
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-gray-100" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="no-scrollbar flex-1 h-[95vh] overflow-y-scroll bg-gray-50/60">
      <div className="w-full max-w-6xl space-y-6 p-4 md:p-10">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-gray-900">All Products</h2>
          <p className="mt-1 text-sm text-gray-500">Manage your catalog, stock and pricing in one place.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard icon={<FaBoxOpen />} label="Total products" value={stats.total} tone="bg-blue-50 text-blue-600" />
          <StatCard icon={<FaCheckCircle />} label="In stock" value={stats.inStock} tone="bg-emerald-50 text-emerald-600" />
          <StatCard icon={<FaTimesCircle />} label="Out of stock" value={stats.outOfStock} tone="bg-rose-50 text-rose-600" />
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col flex-wrap gap-3 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:p-4">
          <div className="relative w-full sm:w-80">
            <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-gray-400" />
            <input
              type="text"
              placeholder="Search by product name..."
              className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm outline-none transition placeholder:text-gray-400 focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/30"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select
            className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat === 'All' ? 'All Categories' : cat}
              </option>
            ))}
          </select>

          <select
            className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value)}
          >
            <option value="all">All Stock</option>
            <option value="in">In stock</option>
            <option value="out">Out of stock</option>
          </select>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-sm text-gray-600 transition hover:bg-gray-100 hover:text-gray-900"
            >
              <FaTimes className="text-xs" /> Clear
            </button>
          )}

          <p className="text-xs text-gray-400 sm:ml-auto">
            Showing {filteredProducts.length} of {stats.total}
          </p>
        </div>

        {/* Product Table */}
        <div className="mb-12 w-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left">
              <thead className="border-b border-gray-200 bg-gray-50/80 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Product</th>
                  <th className="hidden px-4 py-3 font-semibold md:table-cell">Category</th>
                  <th className="hidden px-4 py-3 font-semibold sm:table-cell">Price</th>
                  <th className="px-4 py-3 text-center font-semibold">Stock</th>
                  <th className="px-4 py-3 text-center font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm text-gray-700">
                {filteredProducts.length > 0 ? (
                  filteredProducts.map((product) => {
                    const busy = loadingProductId === product._id;
                    const offer = Number(product.offerPrice);
                    const mrp = Number(product.price);
                    return (
                      <tr
                        key={product._id}
                        className={`border-t border-gray-100 transition hover:bg-gray-50/70 ${busy ? 'opacity-60' : ''}`}
                      >
                        {/* Product Info */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
                              <img
                                src={product.image?.[0] || assets.placeholder_image}
                                alt={product.name}
                                title="View product"
                                className="h-full w-full cursor-pointer object-cover transition duration-300 hover:scale-110"
                                onClick={() => {
                                  navigate(`/products/${(product.category || '').toLowerCase()}/${product._id}`);
                                  window.scrollTo(0, 0);
                                }}
                              />
                            </div>
                            <div className="flex min-w-0 max-w-[220px] flex-col">
                              <span className="truncate font-semibold text-gray-900">{product.name}</span>
                              <span className="truncate text-xs text-gray-400 md:hidden">{product.category}</span>
                              <span className="text-xs font-medium text-gray-600 sm:hidden">
                                {Number.isFinite(offer) ? `${currency}${offer.toFixed(2)}` : 'N/A'}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="hidden px-4 py-3 md:table-cell">
                          <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs capitalize text-gray-600">
                            {product.category || 'Uncategorized'}
                          </span>
                        </td>

                        {/* Price */}
                        <td className="hidden px-4 py-3 sm:table-cell">
                          {Number.isFinite(offer) ? (
                            <div>
                              <span className="font-semibold text-gray-900">
                                {currency}
                                {offer.toFixed(2)}
                              </span>
                              {Number.isFinite(mrp) && mrp > offer && (
                                <span className="ml-2 text-xs text-gray-400 line-through">
                                  {currency}
                                  {mrp.toFixed(2)}
                                </span>
                              )}
                            </div>
                          ) : (
                            'N/A'
                          )}
                        </td>

                        {/* Stock Toggle */}
                        <td className="px-4 py-3 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <label
                              className={`relative inline-flex items-center ${
                                busy ? 'cursor-wait' : 'cursor-pointer'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={!!product.inStock}
                                disabled={busy}
                                onChange={() => toggleStock(product._id, !product.inStock)}
                                className="peer sr-only"
                              />
                              <div className="h-6 w-11 rounded-full bg-gray-300 transition-colors duration-300 peer-checked:bg-emerald-500 peer-focus-visible:ring-4 peer-focus-visible:ring-emerald-200" />
                              <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-300 peer-checked:translate-x-5" />
                            </label>
                            <span
                              className={`text-[11px] font-medium ${
                                product.inStock ? 'text-emerald-600' : 'text-rose-500'
                              }`}
                            >
                              {product.inStock ? 'In stock' : 'Out of stock'}
                            </span>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleEdit(product)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-primary transition hover:border-primary/40 hover:bg-primary/5"
                              aria-label="Edit product"
                              title="Edit"
                            >
                              <FaEdit size={13} />
                              <span className="hidden lg:inline">Edit</span>
                            </button>
                            <button
                              onClick={() => deleteProduct(product._id)}
                              disabled={busy}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-rose-600 transition hover:border-rose-200 hover:bg-rose-50 disabled:opacity-50"
                              aria-label="Delete product"
                              title="Delete"
                            >
                              <FaTrash size={12} />
                              <span className="hidden lg:inline">Delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="5" className="px-4 py-14 text-center">
                      <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
                        <FaBoxOpen className="text-2xl text-gray-400" />
                      </div>
                      <p className="font-medium text-gray-700">
                        {stats.total === 0 ? 'No products yet' : 'No products match your filters'}
                      </p>
                      <p className="mt-1 text-sm text-gray-500">
                        {stats.total === 0
                          ? 'Add your first product to see it here.'
                          : 'Try a different search or clear the filters.'}
                      </p>
                      {hasActiveFilters && (
                        <button
                          onClick={clearFilters}
                          className="mt-4 rounded-lg bg-gray-100 px-4 py-2 text-sm text-gray-700 transition hover:bg-gray-200"
                        >
                          Clear filters
                        </button>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductList;
