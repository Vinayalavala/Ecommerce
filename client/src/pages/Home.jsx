import React from 'react';
import MainBanner from '../components/MainBanner.jsx';  // Corrected filename capitalization
import Categories from '../components/Categories.jsx';
import BestSeller from '../components/BestSeller.jsx';
import BottomBanner from '../components/BottomBanner.jsx';
import NewsLetter from '../components/NewsLetter.jsx';

const Home = () => {
  return (
    <div className='mt-30'>
        <MainBanner /> 
        <Categories />
        <BestSeller />
        <BottomBanner /> 
        <NewsLetter />
    </div>
  );
}

export default Home;
