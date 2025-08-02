import React from 'react';
import ProductCard from './ProductCard';
import { useAppContext } from '../context/appContext';

const BestSeller = () => {
  const { products, navigate } = useAppContext();

  return (
    <div className="mt-16">
      <div className="flex justify-between items-center mb-6">
        <p className="text-2xl md:text-3xl font-medium">Recently Added</p>
        <button
          onClick={() => {
            navigate('/products'); // Navigate to all products page
            scrollTo(0, 0);
          }}
          className="text-primary text-sm md:text-base font-medium hover:underline"
        >
          See More →
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-6 lg:grid-cols-5 mt-6">
        {products
          .filter((product) => product.inStock)
          .slice(0, 5)
          .map((product, index) => (
            <ProductCard key={index} product={product} />
          ))}
      </div>
    </div>
  );
};

export default BestSeller;
