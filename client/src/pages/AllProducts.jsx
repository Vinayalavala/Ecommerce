import React, { useEffect, useState } from 'react';
import { useAppContext } from '../context/appContext';
import ProductCard from '../components/ProductCard';

const AllProducts = () => {
  const { products, searchQuery } = useAppContext();
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortOrder, setSortOrder] = useState('none');

  const categories = ['All', ...Array.from(new Set(products.map(p => p.category)))];

  useEffect(() => {
    let result = [...products];

    if (searchQuery.trim() !== '') {
      result = result.filter(product =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedCategory !== 'All') {
      result = result.filter(product => product.category === selectedCategory);
    }

    if (sortOrder === 'asc') {
      result.sort((a, b) => a.price - b.price);
    } else if (sortOrder === 'desc') {
      result.sort((a, b) => b.price - a.price);
    }

    setFilteredProducts(result);
  }, [products, searchQuery, selectedCategory, sortOrder]);

  return (
    <div className='mt-30 px-4 flex flex-col'>
      {/* Title + Controls */}
      <div className='flex flex-wrap items-center justify-between gap-3 mb-4'>
        {/* Title */}
        <div>
          <p className='text-xl sm:text-2xl md:text-3xl font-semibold uppercase'>All Products</p>
          <div className='w-14 h-0.5 bg-primary rounded-full mt-1' />
        </div>

        {/* Filters */}
        <div className='flex flex-wrap items-center gap-3'>
          {/* Category Filter */}
          <div>
            <label className='text-sm font-medium mr-2'>Category:</label>
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className='text-sm border border-gray-300 rounded px-2 py-1'
            >
              {categories.map((cat, i) => (
                <option key={i} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Sort Filter */}
          <div>
            <label className='text-sm font-medium mr-2'>Sort:</label>
            <select
              value={sortOrder}
              onChange={e => setSortOrder(e.target.value)}
              className='text-sm border border-gray-300 rounded px-2 py-1'
            >
              <option value='none'>Default</option>
              <option value='asc'>Price: Low to High</option>
              <option value='desc'>Price: High to Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4'>
        {filteredProducts.filter(p => p.inStock).map((product, i) => (
          <ProductCard key={i} product={product} />
        ))}
      </div>
    </div>
  );
};

export default AllProducts;
