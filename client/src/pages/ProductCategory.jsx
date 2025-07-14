import React, { useState } from 'react';
import { useAppContext } from '../context/appContext';
import { useParams } from 'react-router-dom';
import { categories } from '../assets/assets';
import ProductCard from '../components/ProductCard';

const ProductCategory = () => {
  const { products } = useAppContext();
  const { category } = useParams();

  const [sortOption, setSortOption] = useState("default");

  const searchCategory = categories.find(
    (item) => item.path.toLowerCase() === category.toLowerCase()
  );

  let filteredProducts = products.filter(
    (product) => product.category.toLowerCase() === category.toLowerCase()
  );

  // Apply sorting
  if (sortOption === "priceLowToHigh") {
    filteredProducts.sort((a, b) => a.price - b.price);
  } else if (sortOption === "priceHighToLow") {
    filteredProducts.sort((a, b) => b.price - a.price);
  } else if (sortOption === "nameAZ") {
    filteredProducts.sort((a, b) => a.name.localeCompare(b.name));
  } else if (sortOption === "nameZA") {
    filteredProducts.sort((a, b) => b.name.localeCompare(a.name));
  }

  return (
    <div className='mt-30 px-4 md:px-8'>
      {searchCategory && (
        <div className='flex justify-between items-center mb-4 flex-wrap gap-2'>
          <div>
            <p className='text-2xl font-medium'>
              {searchCategory.text.toUpperCase()}
            </p>
            <div className='w-16 h-0.5 bg-primary rounded-full mt-1'></div>
          </div>

          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
            className="border border-gray-300 rounded px-3 py-1 text-sm focus:outline-primary"
          >
            <option value="default">Sort By</option>
            <option value="priceLowToHigh">Price: Low to High</option>
            <option value="priceHighToLow">Price: High to Low</option>
            <option value="nameAZ">Name: A to Z</option>
            <option value="nameZA">Name: Z to A</option>
          </select>
        </div>
      )}

      {filteredProducts.length > 0 ? (
        <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-6'>
          {filteredProducts.map((product) => (
            <ProductCard key={product._id} product={product} />
          ))}
        </div>
      ) : (
        <div className='flex items-center justify-center h-[60vh]'>
          <p className='text-2xl font-medium text-primary'>
            No products found in this category.
          </p>
        </div>
      )}
    </div>
  );
};

export default ProductCategory;
