import React from 'react';
import ProductCard from './ProductCard';
import { useAppContext } from '../context/appContext';
import { FiArrowRight } from 'react-icons/fi';
import { HiSparkles } from 'react-icons/hi2';

const BestSeller = () => {
  const { products, navigate } = useAppContext();

  const recentProducts = (products || []).filter((product) => product.inStock).slice(0, 12);

  if (recentProducts.length === 0) return null;

  return (
    <section className="mt-10">
      {/* Heading */}
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-lg text-primary">
            <HiSparkles />
          </span>
          <div>
            <h2 className="text-xl font-bold leading-tight text-gray-900 md:text-2xl">
              Recently Added
            </h2>
            <p className="text-xs text-gray-500">Fresh arrivals, just for you</p>
          </div>
        </div>

        <button
          onClick={() => {
            navigate('/products');
            window.scrollTo(0, 0);
          }}
          className="flex shrink-0 items-center gap-1 rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold text-primary shadow-sm ring-1 ring-gray-200 transition hover:bg-primary hover:text-white hover:ring-primary md:text-sm"
        >
          See all
          <FiArrowRight className="text-sm" />
        </button>
      </div>

      {/* Products grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 md:gap-5 lg:grid-cols-6">
        {recentProducts.map((product) => (
          <ProductCard key={product._id} product={product} />
        ))}
      </div>
    </section>
  );
};

export default BestSeller;
