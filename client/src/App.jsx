import React, { useEffect, useState } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';

import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';
import Login from './components/Login.jsx';
import ViewCartButton from './components/ViewCartButton.jsx';
import CartPreview from './components/CartPreview.jsx';
import { FaChevronUp } from 'react-icons/fa';

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

  // ✅ Show scroll-to-top button on scroll
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 200);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // ✅ Show cart preview when a product is added
  useEffect(() => {
    const handleProductAdded = (e) => {
      setLastAddedProduct(e.detail.product);
      setShowCartPreview(true);
    };
    window.addEventListener('product-added', handleProductAdded);
    return () => window.removeEventListener('product-added', handleProductAdded);
  }, []);

  // ✅ Scroll to top automatically when user navigates to cart page
  useEffect(() => {
    if (isCartPage) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [isCartPage]);

  return (
    <div className="min-h-screen bg-white text-black transition-colors duration-500">
      {!isSellerPath && <Navbar />}
      {showUserLogin && <Login />}
      <Toaster />

      <div className={`${isSellerPath ? '' : 'px-6 md:px-16 lg:px-24 xl:px-32'}`}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/products" element={<AllProducts />} />
          <Route path="/products/:category" element={<ProductCategory />} />
          <Route path="/products/:category/:id" element={<ProductDetails />} />
          <Route path="/product/:id" element={<ProductDetails />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/add-address" element={<AddAdress />} />
          <Route path="/my-orders" element={<MyOrders />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/wishlist" element={<Wishlist />} />
          <Route path="/loader" element={<Loading />} />

          <Route path="/seller" element={isSeller ? <SellerLayout /> : <SellerLogin />}>
            <Route index element={isSeller ? <AddProduct /> : null} />
            <Route path="product-list" element={<ProductList />} />
            <Route path="orders" element={<Orders />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="add-ad" element={<AddProduct />} />
          </Route>

          <Route path="*" element={<ErrorPage />} />
        </Routes>
      </div>

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-20 right-4 z-50 p-3 sm:p-2 bg-white/30 text-black border border-black/20 backdrop-blur-md rounded-full shadow-md transition-all duration-500 ease-in-out hover:bg-white/40"
          style={{
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <FaChevronUp className="w-4 h-4 sm:w-3 sm:h-3" />
        </button>
      )}

      {/* Cart Preview */}
      {showCartPreview && lastAddedProduct && (
        <CartPreview
          visible={showCartPreview}
          setVisible={setShowCartPreview}
          addedProduct={lastAddedProduct}
        />
      )}

      {!isSellerPath && !isCartPage && <ViewCartButton />}
      {!isSellerPath && <Footer />}
    </div>
  );
};

export default App;
