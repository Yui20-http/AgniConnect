import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  User,
  ShoppingCart,
  Truck,
  Users,
  BarChart3,
  MapPin,
  TrendingUp,
  ClipboardList,
  Lightbulb,
} from 'lucide-react';

// Sidebar link definitions per role.

export const farmerLinks = [
  { to: '/farmer', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/farmer/products', label: 'My Products', icon: Package },
  { to: '/farmer/orders', label: 'Orders', icon: ShoppingBag },
  { to: '/farmer/insights', label: 'Farm Insights', icon: Lightbulb },
  { to: '/farmer/profile', label: 'Profile', icon: User },
];

export const buyerLinks = [
  { to: '/buyer', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/marketplace', label: 'Marketplace', icon: ShoppingBag },
  { to: '/buyer/cart', label: 'My Cart', icon: ShoppingCart },
  { to: '/buyer/orders', label: 'My Orders', icon: ClipboardList },
  { to: '/buyer/profile', label: 'Profile', icon: User },
];

export const deliveryLinks = [
  { to: '/delivery', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/delivery/deliveries', label: 'My Deliveries', icon: Truck },
  { to: '/delivery/profile', label: 'Profile', icon: User },
];

export const adminLinks = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/products', label: 'Products', icon: Package },
  { to: '/admin/orders', label: 'Orders', icon: ShoppingBag },
  { to: '/admin/logistics', label: 'Logistics', icon: Truck },
  { to: '/admin/market-prices', label: 'Market Prices', icon: TrendingUp },
];
