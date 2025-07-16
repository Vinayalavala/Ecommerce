import React, { useEffect, useState } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';

import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';
import Login from './components/Login.jsx';
import ViewCartButton from './components/ViewCartButton.jsx';
import CartPreview from './components/CartPreview.jsx';
import { FaChevronUp } from 'react-icons/fa'; // up arrow icon

import Home from './pages/Home.jsx';
import AllProducts from './pages/AllProducts.jsx';
import ProductCategory from './pages/ProductCategory.jsx';
import ProductDetails from './pages/ProductDetails.jsx';
import ContactPage from './pages/ContactPage';
import ErrorPage from './pages/ErrorPage.jsx';
import Cart from './pages/Cart.jsx';
import AddAdress from './pages/AddAdress';
import MyOrders from './pages/MyOrders';
import Profile from './pages/Profile.jsx';
import Wishlist from './pages/WishList.jsx';

import SellerLogin from './components/seller/SellerLogin.jsx';
import SellerLayout from './pages/seller/SellerLayout.jsx';
import AddProduct from './pages/seller/AddProduct.jsx';
import ProductList from './pages/seller/ProductList.jsx';
import Orders from './pages/seller/Orders.jsx';
import Analytics from './pages/seller/Analytics.jsx';

import { useAppContext } from './context/appContext.jsx';
import { Toaster } from 'react-hot-toast';
import Loading from './components/Loading.jsx';

const App = () => {
  const location = useLocation();
  const isSellerPath = location.pathname.includes('seller');
  const isCartPage = location.pathname === '/cart';
  const { showUserLogin, isSeller } = useAppContext();

  const [showCartPreview, setShowCartPreview] = useState(false);
  const [lastAddedProduct, setLastAddedProduct] = useState(null);

  const [showScrollTop, setShowScrollTop] = useState(false);

useEffect(() => {
  const handleScroll = () => {
    setShowScrollTop(window.scrollY > 200); // show after scrolling 200px
  };
  window.addEventListener('scroll', handleScroll);
  return () => window.removeEventListener('scroll', handleScroll);
}, []);


  // Listen for cart item added event
  useEffect(() => {
    const handleProductAdded = (e) => {
      setLastAddedProduct(e.detail.product);
      setShowCartPreview(true);
    };

    window.addEventListener('product-added', handleProductAdded);
    return () => window.removeEventListener('product-added', handleProductAdded);
  }, []);

  return (
    <div className='text-default min-h-screen text-gray-700 bg-white'>
      {!isSellerPath && <Navbar />}
      {showUserLogin && <Login />}
      <Toaster />

      <div className={`${isSellerPath ? '' : 'px-6 md:px-16 lg:px-24 xl:px-32'}`}>
        <Routes>
          {/* Public Routes */}
          <Route path='/' element={<Home />} />
          <Route path='/products' element={<AllProducts />} />
          <Route path='/products/:category' element={<ProductCategory />} />
          <Route path='/products/:category/:id' element={<ProductDetails />} />
          <Route path='/product/:id' element={<ProductDetails />} />
          <Route path='/contact' element={<ContactPage />} />
          <Route path='/cart' element={<Cart />} />
          <Route path='/add-address' element={<AddAdress />} />
          <Route path='/my-orders' element={<MyOrders />} />
          <Route path='/profile' element={<Profile />} />
          <Route path='/wishlist' element={<Wishlist />} />
          <Route path='/loader' element={<Loading />} />

          {/* Seller Routes */}
          <Route path='/seller' element={isSeller ? <SellerLayout /> : <SellerLogin />}>
            <Route index element={isSeller ? <AddProduct /> : null} />
            <Route path='product-list' element={<ProductList />} />
            <Route path='orders' element={<Orders />} />
            <Route path='analytics' element={<Analytics />} />
            <Route path='add-ad' element={<AddProduct />} />
          </Route>

          {/* Error Page */}
          <Route path='*' element={<ErrorPage />} />
        </Routes>
      </div>

      {showScrollTop && (
  <button
    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
    className="fixed bottom-20 right-4 z-50 backdrop-blur-md bg-white/20 border border-white/30 shadow-md hover:bg-white/30 transition-all duration-500 ease-in-out rounded-full p-3 sm:p-2"
    style={{
      boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)',
      WebkitBackdropFilter: 'blur(10px)',
      backdropFilter: 'blur(10px)',
    }}
  >
    <FaChevronUp className="text-primary w-4 h-4 sm:w-3 sm:h-3" />
  </button>
)}



      {/* Cart Preview Popup */}
      {showCartPreview && lastAddedProduct && (
        <CartPreview
          visible={showCartPreview}
          setVisible={setShowCartPreview}
          addedProduct={lastAddedProduct}
        />
      )}

      {/* Floating Cart Button */}
      {!isSellerPath && !isCartPage && <ViewCartButton />}

      {!isSellerPath && <Footer />}
    </div>
  );
};

export default App;
