import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAppContext } from '../context/appContext';
import assets from '../assets/assets';
import ProductCard from '../components/ProductCard';

const ProductDetails = () => {
    const { products, navigate, addToCart, currency } = useAppContext();
    const { id } = useParams();

    const [relatedProducts, setRelatedProducts] = useState([]);
    const [thumbnail, setThumbnail] = useState(null);

    const product = products.find((item) => item._id === id);

    useEffect(() => {
        if (products.length > 0 && product) {
            let productsCopy = products.filter((item) => 
                item.category?.[0] === product.category?.[0] && item._id !== product._id
            );
            setRelatedProducts(productsCopy.slice(0, 5));
        }
    }, [products, product]);

    useEffect(() => {
        if (product?.image?.length > 0) {
            setThumbnail(product.image[0]);
        }
    }, [product]);

    if (!product) {
        return (
            <div className="flex items-center justify-center h-[60vh] text-xl font-medium">
                Product not found
            </div>
        );
    }

    return (
        <div className="mt-25">
            <p className="text-gray-500">
            <Link to="/">Home</Link> / 
            <Link to="/products"> Products</Link> / 
            <Link to={`/products/${product.category?.toLowerCase()}`}> {product.category}</Link> / 
            <span className="text-primary"> {product.name}</span>
            </p>


            <div className="flex flex-col md:flex-row gap-16 mt-4">
                {/* Images */}
                <div className="flex gap-3">
                    <div className="flex flex-col gap-3">
                        {product.image.map((image, index) => (
                            <div
                                key={index}
                                onClick={() => setThumbnail(image)}
                                className="border w-20 h-20 sm:w-24 sm:h-24 border-gray-500/30 rounded overflow-hidden cursor-pointer"
                            >
                                <img
                                    src={image}
                                    alt={`Thumbnail ${index + 1}`}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        ))}
                    </div>
                    <div className="border border-gray-500/30 w-[250px] h-[250px] sm:w-[450px] sm:h-[400px] md:w-[400px] md:h-[400px] lg:w-[600px] rounded overflow-hidden">
                        <img
                            src={thumbnail}
                            alt="Selected product"
                            className="w-full h-full object-contain p-2"
                        />
                    </div>

                </div>

                {/* Details */}
                <div className="text-sm w-full md:w-1/2">
                    <h1 className="text-3xl font-medium">{product.name}</h1>

                    <div className="flex items-center gap-0.5 mt-1">
                        {Array(5).fill('').map((_, i) => (
                            <img 
                                key={i} 
                                src={i < 4 ? assets.star_icon : assets.star_dull_icon} 
                                alt="rating" 
                                className="md:w-4 w-3.5" 
                            />
                        ))}
                        <p className="text-base ml-2">(4)</p>
                    </div>

                    <div className="mt-6">
                        <p className="text-gray-500/70 line-through">MRP: {currency}{product.price}</p>
                        <p className="text-2xl font-medium">MRP: {currency}{product.offerPrice}</p>
                        <span className="text-gray-500/70">(inclusive of all taxes)</span>
                    </div>

                    <p className="text-base font-medium mt-6">About Product</p>
                    <ul className="list-disc ml-4 text-gray-500/70">
                        {product.description.map((desc, index) => (
                            <li key={index}>{desc}</li>
                        ))}
                    </ul>

                    <div className="flex items-center mt-10 gap-4 text-base">
                        <button 
                            onClick={() => addToCart(product._id)} 
                            className="w-full py-3.5 cursor-pointer font-medium bg-gray-100 text-gray-800/80 hover:bg-gray-200 transition"
                        >
                            Add to Cart
                        </button>
                        <button 
                            onClick={() => { addToCart(product._id); navigate("/cart"); }} 
                            className="w-full py-3.5 cursor-pointer font-medium bg-primary text-white hover:bg-primary-dull transition"
                        >
                            Buy now
                        </button>
                    </div>
                </div>
            </div>

            {/* Related Products */}
            <div className="flex flex-col items-center mt-20">
                <div className="flex flex-col items-center w-max">
                    <p className="text-3xl font-medium">Related Products</p>
                    <div className="w-20 h-0.5 bg-primary rounded-full mt-2"></div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 mt-6 gap-3 md:gap-6 w-full">
                    {relatedProducts
                        .filter((relProduct) => relProduct.inStock)
                        .map((relProduct) => (
                            <ProductCard key={relProduct._id} product={relProduct} />
                        ))}
                </div>

                <button 
                    onClick={() => { navigate("/products"); window.scrollTo(0, 0); }} 
                    className="mx-auto cursor-pointer px-12 my-16 py-2.5 rounded border text-primary hover:bg-primary/10 transition"
                >
                    See more
                </button>
            </div>
        </div>
    );
};

export default ProductDetails;
