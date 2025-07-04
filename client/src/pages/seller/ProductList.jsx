import { useAppContext } from '../../context/appContext';
import assets from '../../assets/assets';
import toast from 'react-hot-toast';
import { useState, useMemo } from 'react';
import { FaTrash } from 'react-icons/fa';

const ProductList = () => {
  const { products, currency, axios, fetchProducts } = useAppContext();
  const [loadingProductId, setLoadingProductId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

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

  const deleteProduct = async (id) => {
    if (!confirm("Are you sure you want to delete this product?")) return;

    try {
      setLoadingProductId(id);
      const { data } = await axios.delete(`/api/product/delete/${id}`);
      if (data.success) {
        toast.success("Product deleted successfully.");
        fetchProducts();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message || "Something went wrong.");
    } finally {
      setLoadingProductId(null);
    }
  };

  const categories = useMemo(() => {
    const set = new Set(products.map(p => p.category));
    return ['All', ...Array.from(set)];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter(product =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      (categoryFilter === 'All' || product.category === categoryFilter)
    );
  }, [products, searchTerm, categoryFilter]);

  return (
    <div className="no-scrollbar flex-1 h-[95vh] overflow-y-scroll flex flex-col justify-between">
      <div className="w-full md:p-10 p-4">
        <h2 className="pb-4 text-lg font-semibold text-gray-800">All Products</h2>

        {/* Search and Sort Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
          <input
            type="text"
            placeholder="Search by product name..."
            className="border border-gray-300 rounded px-3 py-2 w-full sm:w-1/2"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select
            className="border border-gray-300 rounded px-3 py-2 w-full sm:w-1/3"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* Table */}
        <div className="flex flex-col items-center max-w-6xl w-full overflow-hidden rounded-md bg-white border border-gray-300 mb-12">
          <table className="table-fixed w-full text-left">
            <thead className="text-gray-900 text-sm">
              <tr>
                <th className="w-[40%] px-3 py-3 font-semibold">Product</th>
                <th className="w-[15%] px-3 py-3 font-semibold hidden md:table-cell">Category</th>
                <th className="w-[15%] px-3 py-3 font-semibold hidden sm:table-cell">Price</th>
                <th className="w-[15%] px-3 py-3 font-semibold text-center">Stock</th>
                <th className="w-[15%] px-3 py-3 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm text-gray-700">
              {filteredProducts.length > 0 ? (
                filteredProducts.map((product) => (
                  <tr key={product._id} className="border-t border-gray-200">
                    {/* Product */}
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-14 h-14 flex-shrink-0 border border-gray-300 rounded overflow-hidden bg-white">
                          <img
                            src={product.image?.[0] || assets.placeholder_image}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex flex-col truncate max-w-[200px]">
                          <span className="font-semibold text-gray-800 truncate">{product.name}</span>
                          <span className="text-xs text-gray-400 md:hidden truncate">{product.category}</span>
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="px-3 py-3 hidden md:table-cell truncate">{product.category}</td>

                    {/* Price */}
                    <td className="px-3 py-3 hidden sm:table-cell truncate">
                      {currency}
                      {product.offerPrice?.toFixed(2) || 'N/A'}
                    </td>

                    {/* Stock Toggle */}
                    <td className="px-3 py-3 text-center">
                      <div className="flex justify-center items-center">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={product.inStock}
                            disabled={loadingProductId === product._id}
                            onChange={() => toggleStock(product._id, !product.inStock)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 border border-gray-400 bg-gray-300 rounded-full peer-checked:bg-green-600 transition-colors duration-300"></div>
                          <span className="dot absolute left-[2px] top-[2px] w-5 h-5 bg-white border border-gray-400 rounded-full transition-transform duration-300 peer-checked:translate-x-5"></span>
                        </label>
                      </div>
                    </td>

                    {/* Delete Button */}
                    <td className="px-3 py-3 text-center">
                      <button
                        onClick={() => deleteProduct(product._id)}
                        disabled={loadingProductId === product._id}
                        className="text-red-600 hover:text-red-800 disabled:opacity-50"
                        aria-label="Delete product"
                      >
                        <FaTrash size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-4 py-4 text-center text-gray-500">
                    No products available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ProductList;
