import React from 'react'
import assets from '../assets/assets';
import { Link } from 'react-router-dom';

const Mainbanner = () => {
  return (
    <div className='relative mt-24 overflow-hidden'>
        {/* Background Images */}
        <img 
          src={assets.main_banner_bg} 
          alt="banner" 
          className='w-full hidden md:block animate-fadeIn'
        />
        <img 
          src={assets.main_banner_bg_sm} 
          alt="banner" 
          className='w-full md:hidden animate-fadeIn'
        />

        {/* Banner Content */}
        <div className='absolute inset-0 flex flex-col items-center md:items-start justify-end md:justify-center pb-24 md:pb-0 px-4 md:pl-18 lg:pl-24'>
            
            {/* Heading */}
            <h1 
              className='text-3xl md:text-4xl lg:text-5xl font-bold text-center md:text-left 
                        max-w-72 md:max-w-80 lg:max-w-105 leading-tight lg:leading-15 
                        opacity-0 animate-slideUp'
            >
              Freshness You Can Trust, Savings You Will Love
            </h1>

            {/* Buttons */}
            <div className='flex items-center mt-6 font-medium gap-4'>
              
              {/* Shop Now Button */}
              <Link 
                to={"/products"} 
                className='group flex items-center gap-2 bg-primary text-white px-7 py-3 rounded-full mt-4 
                          hover:bg-primary-dull hover:scale-105 transition transform duration-300 cursor-pointer'
              >
                Shop Now
                <img 
                  className='md:hidden transition-transform duration-300 group-hover:translate-x-1' 
                  src={assets.white_arrow_icon} 
                  alt="arrow" 
                />
              </Link>

              {/* Explore Deals Button */}
              <Link 
                to={"/products"} 
                className='group hidden md:flex items-center gap-2 px-9 py-3 rounded-full mt-4 border border-gray-400 
                          hover:bg-gray-100 hover:scale-105 transition transform duration-300 cursor-pointer'
              >
                Explore Deals
                <img 
                  className='transition-transform duration-300 group-hover:translate-x-1' 
                  src={assets.black_arrow_icon} 
                  alt="arrow" 
                />
              </Link>
            </div>
        </div>

        {/* Animations */}
        <style>
          {`
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            .animate-fadeIn {
              animation: fadeIn 1s ease-in-out forwards;
            }
            @keyframes slideUp {
              from { transform: translateY(30px); opacity: 0; }
              to { transform: translateY(0); opacity: 1; }
            }
            .animate-slideUp {
              animation: slideUp 1s ease-out forwards;
              animation-delay: 0.3s;
            }
          `}
        </style>
    </div>
  )
}

export default Mainbanner;
