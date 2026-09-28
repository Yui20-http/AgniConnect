import { Link } from 'react-router-dom';
import { Leaf, Mail, Phone, MapPin, Facebook, Twitter, Instagram, Linkedin } from 'lucide-react';

/**
 * Footer - site footer with links and contact info.
 */
const Footer = () => {
  return (
    <footer className="bg-gray-900 text-gray-300 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 rounded-lg bg-primary-600 flex items-center justify-center">
                <Leaf className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-extrabold text-white">
                Agri<span className="text-primary-400">Connect</span>
              </span>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed">
              Connecting farmers directly with buyers and delivery partners for a fairer, fresher
              agricultural supply chain.
            </p>
            <div className="flex gap-3 mt-4">
              {[Facebook, Twitter, Instagram, Linkedin].map((Icon, i) => (
                <a key={i} href="#" className="w-9 h-9 rounded-lg bg-gray-800 flex items-center justify-center hover:bg-primary-600 transition">
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-white font-bold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/" className="hover:text-primary-400">Home</Link></li>
              <li><Link to="/marketplace" className="hover:text-primary-400">Marketplace</Link></li>
              <li><Link to="/market-prices" className="hover:text-primary-400">Market Prices</Link></li>
              <li><Link to="/compare" className="hover:text-primary-400">Compare Prices</Link></li>
              <li><Link to="/register" className="hover:text-primary-400">Register</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold mb-4">For Users</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/register" className="hover:text-primary-400">Become a Farmer</Link></li>
              <li><Link to="/register" className="hover:text-primary-400">Become a Buyer</Link></li>
              <li><Link to="/register" className="hover:text-primary-400">Delivery Partner</Link></li>
              <li><Link to="/login" className="hover:text-primary-400">Login</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold mb-4">Contact</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 mt-0.5 text-primary-400" />
                <span>AgriConnect HQ, Pune, Maharashtra, India</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-primary-400" />
                <span>support@agriconnect.com</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-primary-400" />
                <span>+91 90000 00000</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-gray-400">
          <p>© {new Date().getFullYear()} AgriConnect. TYBScIT CEP Project.</p>
          <p>Built with React, Node.js, Express, MongoDB & Socket.IO</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
