import React from 'react';
import { categories } from '../assets/assets';
import { useAppContext } from '../context/appContext';

const Categories = () => {
  const { navigate } = useAppContext(); // ✅ fixed this line

  return (
    <div className='mt-16'>
      <p className='text-2xl md:text-3xl font-medium'>Categories</p>
      <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-8 mt-6'>
        {categories.map((category, index) => (
          <div
            key={index}
            className='group cursor-pointer py-5 px-3 rounded-lg flex flex-col items-center justify-center gap-2'
            style={{ backgroundColor: category.bgColor }}
            onClick={() => {
              navigate(`/products/${category.path.toLowerCase()}`);
              scrollTo(0, 0);
            }}
          >
            <img
              src={category.image}
              alt={category.text}
              className='group-hover:scale-110 transition-transform duration-200 max-w-28'
            />
            <p className='text-sm font-medium'>{category.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Categories;
