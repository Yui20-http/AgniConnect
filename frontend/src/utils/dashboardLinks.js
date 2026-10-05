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
  Heart,
  IndianRupee,
  MessageCircle,
  Tags,
  Flag,
  ScrollText,
} from 'lucide-react';

// Sidebar link definitions per role.

export const farmerLinks = [
  { to: '/farmer', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/farmer/products', label: 'My Products', icon: Package },
  { to: '/farmer/orders', label: 'Orders', icon: ShoppingBag },
  { to: '/farmer/earnings', label: 'Earnings & Payouts', icon: IndianRupee },
  { to: '/farmer/requests', label: 'Buyer Requests', icon: Tags },
  { to: '/farmer/messages', label: 'Messages', icon: MessageCircle },
  { to: '/farmer/insights', label: 'Farm Insights', icon: Lightbulb },
  { to: '/farmer/profile', label: 'Profile', icon: User },
];

export const buyerLinks = [
  { to: '/buyer', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/marketplace', label: 'Marketplace', icon: ShoppingBag },
  { to: '/buyer/cart', label: 'My Cart', icon: ShoppingCart },
  { to: '/buyer/orders', label: 'My Orders', icon: ClipboardList },
  { to: '/buyer/favorites', label: 'Favorite Farmers', icon: Heart },
  { to: '/buyer/plans', label: 'Offers & Weekly Plans', icon: Tags },
  { to: '/buyer/messages', label: 'Messages', icon: MessageCircle },
  { to: '/buyer/profile', label: 'Profile', icon: User },
];

export const deliveryLinks = [
  { to: '/delivery', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/delivery/deliveries', label: 'My Deliveries', icon: Truck },
  { to: '/delivery/messages', label: 'Messages', icon: MessageCircle },
  { to: '/delivery/profile', label: 'Profile', icon: User },
];

export const adminLinks = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/products', label: 'Products', icon: Package },
  { to: '/admin/orders', label: 'Orders', icon: ShoppingBag },
  { to: '/admin/logistics', label: 'Logistics', icon: Truck },
  { to: '/admin/market-prices', label: 'Market Prices', icon: TrendingUp },
  { to: '/admin/reports', label: 'Reports & Disputes', icon: Flag },
  { to: '/admin/audit', label: 'Audit History', icon: ScrollText },
];
