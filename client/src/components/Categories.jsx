import React from 'react';
import { categories } from '../assets/assets';
import { useAppContext } from '../context/appContext';

const Categories = () => {
  const { navigate } = useAppContext();

  return (
    <div className="mt-16">
      <p className="text-2xl md:text-3xl font-medium">Categories</p>

      {/* Scrollable container for mobile */}
      <div className="mt-6 overflow-x-auto md:overflow-visible no-scrollbar">
        <div className="flex md:grid md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-4 md:gap-8 w-max md:w-full">
          {categories.map((category, index) => (
            <div
              key={index}
              className="flex-shrink-0 p-2 cursor-pointer flex flex-col items-center justify-center gap-2"
              onClick={() => {
                navigate(`/products/${category.path.toLowerCase()}`);
                scrollTo(0, 0);
              }}
            >
              {/* Larger square image wrapper */}
              <div className="w-20 h-20 md:w-24 md:h-24 bg-white rounded-lg shadow flex items-center justify-center">
                <img
                  src={category.image}
                  alt={category.text}
                  className="w-24 h-24 md:w-16 md:h-16 object-contain"
                />
              </div>
              <p className="text-xs md:text-sm text-center font-medium whitespace-nowrap">
                {category.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Categories;
