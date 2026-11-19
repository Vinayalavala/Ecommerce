import React, { useRef } from 'react';
import ProductCard from './ProductCard';
import { useAppContext } from '../context/appContext';
import { categories } from '../assets/assets';
import { FiChevronLeft, FiChevronRight, FiArrowRight } from 'react-icons/fi';

const CategoryRow = ({ cat, products, onSeeAll }) => {
  const scrollRef = useRef(null);

  const scrollByPage = (dir) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: 'smooth' });
  };

  return (
    <section className="rounded-3xl bg-gray-50/70 p-4 ring-1 ring-gray-100 md:p-6">
      {/* Heading */}
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="h-8 w-1.5 shrink-0 rounded-full bg-primary" />
          {cat.image && (
            <img
              src={cat.image}
              alt=""
              className="hidden h-10 w-10 shrink-0 rounded-xl bg-white object-contain p-1 shadow-sm ring-1 ring-gray-100 sm:block"
            />
          )}
          <div className="min-w-0">
            <h2 className="truncate text-xl font-bold text-gray-900 md:text-2xl">{cat.text}</h2>
            <p className="text-xs text-gray-500">
              {products.length} popular pick{products.length !== 1 && 's'}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={onSeeAll}
            className="flex items-center gap-1 rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold text-primary shadow-sm ring-1 ring-gray-200 transition hover:bg-primary hover:text-white hover:ring-primary md:text-sm"
          >
            See all
            <FiArrowRight className="text-sm" />
          </button>

          <div className="hidden items-center gap-1.5 md:flex">
            <button
              onClick={() => scrollByPage(-1)}
              aria-label={`Scroll ${cat.text} left`}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-gray-600 shadow-sm ring-1 ring-gray-200 transition hover:bg-gray-100 active:scale-90"
            >
              <FiChevronLeft />
            </button>
            <button
              onClick={() => scrollByPage(1)}
              aria-label={`Scroll ${cat.text} right`}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-gray-600 shadow-sm ring-1 ring-gray-200 transition hover:bg-gray-100 active:scale-90"
            >
              <FiChevronRight />
            </button>
          </div>
        </div>
      </div>

      {/* Scrollable product row */}
      <div
        ref={scrollRef}
        className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth px-4 pb-3 pt-1 md:-mx-6 md:gap-5 md:px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {products.map((product) => (
          <div
            key={product._id}
            className="w-[165px] shrink-0 snap-start sm:w-[185px] md:w-[205px]"
          >
            <ProductCard product={product} />
          </div>
        ))}

        {/* End-of-row "See all" tile */}
        <button
          onClick={onSeeAll}
          className="group flex w-[165px] shrink-0 snap-start flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-gray-300 bg-white/60 text-gray-500 transition hover:border-primary hover:bg-white hover:text-primary sm:w-[185px] md:w-[205px]"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-xl shadow-sm ring-1 ring-gray-200 transition group-hover:bg-primary group-hover:text-white group-hover:ring-primary">
            <FiArrowRight />
          </span>
          <span className="px-3 text-center text-sm font-semibold">
            See all {cat.text}
          </span>
        </button>
      </div>
    </section>
  );
};

const CategoryPreview = () => {
  const { products, navigate } = useAppContext();

  return (
    <div className="mt-16 space-y-8 md:space-y-10">
      {categories.map((cat) => {
        const filteredProducts = (products || [])
          .filter((product) => product.category === cat.path && product.inStock)
          .slice(0, 8);

        if (filteredProducts.length === 0) return null;

        return (
          <CategoryRow
            key={cat.path}
            cat={cat}
            products={filteredProducts}
            onSeeAll={() => {
              navigate(`/products/${cat.path.toLowerCase()}`);
              window.scrollTo(0, 0);
            }}
          />
        );
      })}
    </div>
  );
};

export default CategoryPreview;
