import { useAppContext } from '../../context/appContext';
import assets from '../../assets/assets';
import toast from 'react-hot-toast';
import { useState } from 'react';

const ProductList = () => {
    const { products, currency, axios, fetchProducts } = useAppContext();
    const [loadingProductId, setLoadingProductId] = useState(null);

    const toggleStock = async (id, inStock) => {
        try {
            setLoadingProductId(id); // Start loading state
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
            setLoadingProductId(null); // Reset loading state
        }
    };

    return (
        <div className="no-scrollbar flex-1 h-[95vh] overflow-y-scroll flex flex-col justify-between">
            <div className="w-full md:p-10 p-4">
                <h2 className="pb-4 text-lg font-medium">All Products</h2>
                <div className="flex flex-col items-center max-w-4xl w-full overflow-hidden rounded-md bg-white border border-gray-500/20">
                    <table className="md:table-auto table-fixed w-full overflow-hidden">
                        <thead className="text-gray-900 text-sm text-left">
                            <tr>
                                <th className="px-4 py-3 font-semibold truncate">Product</th>
                                <th className="px-4 py-3 font-semibold truncate">Category</th>
                                <th className="px-4 py-3 font-semibold truncate hidden md:block">Selling Price</th>
                                <th className="px-4 py-3 font-semibold truncate">In Stock</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm text-gray-500">
                            {products && products.length > 0 ? (
                                products.map((product) => (
                                    <tr key={product._id} className="border-t border-gray-500/20">
                                        <td className="md:px-4 pl-2 md:pl-4 py-3 flex items-center space-x-3 truncate">
                                            <div className="border border-gray-300 rounded p-2">
                                                <img
                                                    src={product.image?.[0] || assets.placeholder_image}
                                                    alt={product.name}
                                                    className="w-16 h-16 object-cover"
                                                />
                                            </div>
                                            <span className="truncate max-sm:hidden w-full">{product.name}</span>
                                        </td>
                                        <td className="px-4 py-3">{product.category}</td>
                                        <td className="px-4 py-3 max-sm:hidden">
                                            {currency}
                                            {product.offerPrice?.toFixed(2) || 'N/A'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <label
                                                className="relative inline-flex items-center cursor-pointer text-gray-900 gap-3"
                                                aria-label={`Toggle stock for ${product.name}`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={product.inStock}
                                                    disabled={loadingProductId === product._id}
                                                    onChange={() =>
                                                        toggleStock(product._id, !product.inStock)
                                                    }
                                                    className="sr-only peer"
                                                />
                                                <div className="w-12 h-7 bg-slate-300 rounded-full peer peer-checked:bg-primary-dull transition-colors duration-200"></div>
                                                <span className="dot absolute left-1 top-1 w-5 h-5 bg-white rounded-full transition-transform duration-200 ease-in-out peer-checked:translate-x-5"></span>
                                            </label>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="4" className="px-4 py-3 text-center text-gray-500">
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
