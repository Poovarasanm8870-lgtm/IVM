import React from 'react';
import { Menu } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLocation } from 'react-router-dom';

const pageTitles = {
  '/dashboard': 'Dashboard',
  '/products': 'Products',
  '/categories': 'Categories',
  '/suppliers': 'Suppliers',
  '/purchases': 'Purchases',
  '/stock': 'Stock Management',
  '/reports': 'Reports',
  '/users': 'User Management',
  '/settings': 'Settings',
};

const Navbar = ({ onMenuClick }) => {
  const { user } = useAuth();
  const location = useLocation();
  const title = pageTitles[location.pathname] || 'IVM';

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-sm border-b border-gray-100 px-3 sm:px-6 py-3">
      <div className="flex items-center justify-between gap-3">
        {/* Left: Mobile hamburger menu & Page Title */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            onClick={onMenuClick}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg lg:hidden flex-shrink-0 transition-colors"
            title="Open Menu"
            aria-label="Open Navigation"
          >
            <Menu size={20} />
          </button>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-bold text-gray-800 truncate leading-tight">
              {title}
            </h1>
            <p className="text-[11px] sm:text-xs text-gray-500 truncate mt-0.5 hidden xs:block">
              {new Date().toLocaleDateString('en-US', {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </p>
          </div>
        </div>

        {/* Right: User Chip */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5">
            <div className="w-7 h-7 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">
                {user?.full_name?.charAt(0) || user?.username?.charAt(0) || 'U'}
              </span>
            </div>
            <div className="hidden sm:block">
              <p className="text-xs sm:text-sm font-semibold text-gray-700 leading-tight truncate max-w-[120px]">
                {user?.full_name || user?.username}
              </p>
              <p className="text-[11px] text-gray-400 capitalize">{user?.role || 'Staff'}</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
