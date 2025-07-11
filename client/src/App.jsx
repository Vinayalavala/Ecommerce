import Navbar from './components/Navbar.jsx';
import { Routes, Route, useLocation } from 'react-router-dom'
import Home from './pages/Home.jsx';
import { Toaster } from 'react-hot-toast';
import Footer from './components/Footer.jsx';
import { useAppContext } from './context/appContext.jsx';
import Login from './components/Login.jsx';
import AllProducts from './pages/AllProducts.jsx';
import ProductCategory from './pages/ProductCategory.jsx';
import ContactPage from './pages/ContactPage';
import ErrorPage from './pages/ErrorPage.jsx';
import ProductDetails from './pages/ProductDetails';
import Cart from './pages/Cart.jsx';
import AddAdress from './pages/AddAdress';
import MyOrders from './pages/MyOrders';
import SellerLogin from './components/seller/SellerLogin';
import SellerLayout from './pages/seller/SellerLayout.jsx';
import AddProduct from './pages/seller/AddProduct.jsx';
import ProductList from './pages/seller/ProductList';
import Orders from './pages/seller/Orders';
import Analytics from './pages/seller/Analytics.jsx';
import Loading from './components/Loading';

// ✅ Import the ViewCartButton component
import ViewCartButton from './components/ViewCartButton';

const App = () => {
  const location = useLocation();
  const isSellerPath = location.pathname.includes('seller');
  const isCartPage = location.pathname === '/cart';
  const { showUserLogin, isSeller } = useAppContext();

  return (
    <div className='text-default min-h-screen text-gray-700 bg-white'>
      {isSellerPath ? null : <Navbar />}
      {showUserLogin && <Login />}
      <Toaster />
      
      <div className={`${isSellerPath ? "" : "px-6 md:px-16 lg:px-24 xl:px-32"}`}>
        <Routes>
          <Route path='/' element={<Home />} />
          <Route path='/products' element={<AllProducts />} />
          <Route path='/products/:category' element={<ProductCategory />} />
          <Route path='/products/:category/:id' element={<ProductDetails />} />
          <Route path='/contact' element={<ContactPage />} />
          <Route path='/cart' element={<Cart />} />
          <Route path='/add-address' element={<AddAdress />} />
          <Route path='/product/:id' element={<ProductDetails />} />
          <Route path='/my-orders' element={<MyOrders />} />
          <Route path='/loader' element={<Loading />} />
          
          <Route path='/seller' element={isSeller ? <SellerLayout /> : <SellerLogin />}>
            <Route index element={isSeller ? <AddProduct /> : null} />
            <Route path='product-list' element={<ProductList />} />
            <Route path='orders' element={<Orders />} />
            <Route path='analytics' element={<Analytics />} />
            <Route path='add-ad' element={<AddProduct />} />
          </Route>

          <Route path='*' element={<ErrorPage />} />
        </Routes>
      </div>

      {/* ✅ Show ViewCartButton on all non-seller, non-cart pages */}
      {!isSellerPath && !isCartPage && <ViewCartButton itemCount={1} />}

      {!isSellerPath && <Footer />}
    </div>
  );
}

export default App;
