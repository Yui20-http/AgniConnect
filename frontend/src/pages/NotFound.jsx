import { Link } from 'react-router-dom';
import { Leaf, Home, ArrowLeft } from 'lucide-react';

/**
 * NotFound - 404 page.
 */
const NotFound = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary-50 to-earth-50 px-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-primary-600 flex items-center justify-center mb-6">
        <Leaf className="w-8 h-8 text-white" />
      </div>
      <p className="text-7xl font-extrabold text-primary-700">404</p>
      <h1 className="mt-3 text-2xl font-bold text-gray-900">Page not found</h1>
      <p className="mt-2 text-gray-500 max-w-md">
        The page you are looking for doesn't exist or may have been moved. Let's get you back on
        track.
      </p>
      <div className="mt-6 flex flex-wrap gap-3 justify-center">
        <Link to="/" className="btn-primary">
          <Home className="w-4 h-4" /> Go Home
        </Link>
        <Link to="/marketplace" className="btn-secondary">
          <ArrowLeft className="w-4 h-4" /> Browse Marketplace
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
