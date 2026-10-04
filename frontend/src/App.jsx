import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { CartProvider } from './context/CartContext';
import { SocketProvider } from './context/SocketContext';
import ProtectedRoute from './components/ProtectedRoute';

// Layouts
import PublicLayout from './layouts/PublicLayout';
import DashboardLayout from './layouts/DashboardLayout';

// Public pages
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import PasswordReset from './pages/PasswordReset';
import Marketplace from './pages/Marketplace';
import ProductDetails from './pages/ProductDetails';
import MarketPrices from './pages/MarketPrices';
import Compare from './pages/Compare';
import NotFound from './pages/NotFound';

// Farmer pages
import FarmerDashboard from './pages/farmer/FarmerDashboard';
import FarmerProducts from './pages/farmer/FarmerProducts';
import FarmerOrders from './pages/farmer/FarmerOrders';
import FarmerProfile from './pages/farmer/FarmerProfile';
import FarmerInsights from './pages/farmer/FarmerInsights';
import FarmerEarnings from './pages/farmer/FarmerEarnings';

// Buyer pages
import BuyerDashboard from './pages/buyer/BuyerDashboard';
import BuyerCart from './pages/buyer/BuyerCart';
import BuyerOrders from './pages/buyer/BuyerOrders';
import BuyerProfile from './pages/buyer/BuyerProfile';
import BuyerFavorites from './pages/buyer/BuyerFavorites';
import PlansAndOffers from './pages/shared/PlansAndOffers';
import Messages from './pages/shared/Messages';

// Delivery pages
import DeliveryDashboard from './pages/delivery/DeliveryDashboard';
import DeliveryList from './pages/delivery/DeliveryList';
import DeliveryProfile from './pages/delivery/DeliveryProfile';

// Admin pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminProducts from './pages/admin/AdminProducts';
import AdminOrders from './pages/admin/AdminOrders';
import AdminLogistics from './pages/admin/AdminLogistics';
import AdminMarketPrices from './pages/admin/AdminMarketPrices';
import AdminReports from './pages/admin/AdminReports';
import AdminAuditLogs from './pages/admin/AdminAuditLogs';
import AmbientEffects from './components/AmbientEffects';

// Shared
import OrderDetails from './pages/shared/OrderDetails';
import Tracking from './pages/shared/Tracking';

// Dashboard sidebar link definitions
import {
  farmerLinks,
  buyerLinks,
  deliveryLinks,
  adminLinks,
} from './utils/dashboardLinks';

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <CartProvider>
          <SocketProvider>
            <div className="futuristic-ui min-h-screen">
            <AmbientEffects />
            <Routes>
              {/* ---------- Public ---------- */}
              <Route element={<PublicLayout />}>
                <Route path="/" element={<Landing />} />
                <Route path="/marketplace" element={<Marketplace />} />
                <Route path="/product/:id" element={<ProductDetails />} />
                <Route path="/market-prices" element={<MarketPrices />} />
                <Route path="/compare" element={<Compare />} />
              </Route>

              {/* ---------- Auth ---------- */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<PasswordReset />} />
              <Route path="/reset-password" element={<PasswordReset />} />

              {/* ---------- Farmer ---------- */}
              <Route
                path="/farmer"
                element={
                  <ProtectedRoute allowedRoles={['farmer']}>
                    <DashboardLayout links={farmerLinks} title="Farmer Dashboard" />
                  </ProtectedRoute>
                }
              >
                <Route index element={<FarmerDashboard />} />
                <Route path="products" element={<FarmerProducts />} />
                <Route path="orders" element={<FarmerOrders />} />
                <Route path="earnings" element={<FarmerEarnings />} />
                <Route path="requests" element={<PlansAndOffers role="farmer" />} />
                <Route path="messages" element={<Messages role="farmer" />} />
                <Route path="orders/:id" element={<OrderDetails role="farmer" />} />
                <Route path="insights" element={<FarmerInsights />} />
                <Route path="profile" element={<FarmerProfile />} />
              </Route>

              {/* ---------- Buyer ---------- */}
              <Route
                path="/buyer"
                element={
                  <ProtectedRoute allowedRoles={['buyer']}>
                    <DashboardLayout links={buyerLinks} title="Buyer Dashboard" />
                  </ProtectedRoute>
                }
              >
                <Route index element={<BuyerDashboard />} />
                <Route path="cart" element={<BuyerCart />} />
                <Route path="orders" element={<BuyerOrders />} />
                <Route path="favorites" element={<BuyerFavorites />} />
                <Route path="plans" element={<PlansAndOffers role="buyer" />} />
                <Route path="offers" element={<PlansAndOffers role="buyer" />} />
                <Route path="messages" element={<Messages role="buyer" />} />
                <Route path="orders/:id" element={<OrderDetails role="buyer" />} />
                <Route path="orders/:id/track" element={<Tracking />} />
                <Route path="profile" element={<BuyerProfile />} />
              </Route>

              {/* ---------- Delivery ---------- */}
              <Route
                path="/delivery"
                element={
                  <ProtectedRoute allowedRoles={['delivery']}>
                    <DashboardLayout links={deliveryLinks} title="Delivery Partner Dashboard" />
                  </ProtectedRoute>
                }
              >
                <Route index element={<DeliveryDashboard />} />
                <Route path="deliveries" element={<DeliveryList />} />
                <Route path="profile" element={<DeliveryProfile />} />
              </Route>

              {/* ---------- Admin ---------- */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <DashboardLayout links={adminLinks} title="Admin Dashboard" />
                  </ProtectedRoute>
                }
              >
                <Route index element={<AdminDashboard />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="products" element={<AdminProducts />} />
                <Route path="orders" element={<AdminOrders />} />
                <Route path="orders/:id" element={<OrderDetails role="admin" />} />
                <Route path="logistics" element={<AdminLogistics />} />
                <Route path="market-prices" element={<AdminMarketPrices />} />
                <Route path="reports" element={<AdminReports />} />
                <Route path="audit" element={<AdminAuditLogs />} />
              </Route>

              {/* ---------- Fallback ---------- */}
              <Route path="/404" element={<NotFound />} />
              <Route path="*" element={<Navigate to="/404" replace />} />
            </Routes>
            </div>
          </SocketProvider>
        </CartProvider>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
