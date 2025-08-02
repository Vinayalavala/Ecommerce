import React from 'react';
import ProductCard from './ProductCard';
import { useAppContext } from '../context/appContext';

const BestSeller = () => {
  const { products, navigate } = useAppContext();

  return (
    <div className="mt-6">
      <div className="flex justify-between items-center mb-4">
        <p className="text-lg md:text-2xl font-medium">Recently Added</p>
        <button
          onClick={() => {
            navigate('/products');
            scrollTo(0, 0);
          }}
          className="text-primary text-sm md:text-base font-medium hover:underline"
        >
          See More →
        </button>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4 md:gap-6">
        {products
          .filter((product) => product.inStock)
          .slice(0, 12)
          .map((product, index) => (
            <ProductCard key={index} product={product} />
          ))}
      </div>
    </div>
  );
};

export default BestSeller;
