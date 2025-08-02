import React from 'react';
import ProductCard from './ProductCard';
import { useAppContext } from '../context/appContext';
import { categories } from '../assets/assets';

const CategoryPreview = () => {
  const { products, navigate } = useAppContext();

  return (
    <div className="mt-16 space-y-12">
      {categories.map((cat, idx) => {
        const filteredProducts = products
          .filter((product) => product.category === cat.path && product.inStock)
          .slice(0, 6);

        if (filteredProducts.length === 0) return null;

        return (
          <div key={idx}>
            {/* Heading & See More */}
            <div className="flex justify-between items-center mb-6">
              <p className="text-2xl md:text-3xl font-medium">{cat.text}</p>
              <button
                onClick={() => navigate(`/products/${cat.path.toLowerCase()}`)}
                className="text-primary font-medium hover:underline"
              >
                See More →
              </button>
            </div>

            {/* Products Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-6">
              {filteredProducts.map((product, index) => (
                <ProductCard key={index} product={product} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default CategoryPreview;
