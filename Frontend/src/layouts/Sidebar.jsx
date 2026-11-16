import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Package, Tag, Truck, Users, ShoppingCart,
  TrendingUp, Warehouse, BarChart3, Settings, LogOut,
  ChevronLeft, ChevronRight, UserCircle, Menu, X
} from 'lucide-react';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/products', icon: Package, label: 'Products' },
  { to: '/categories', icon: Tag, label: 'Categories' },
  { to: '/suppliers', icon: Truck, label: 'Suppliers' },
  { to: '/purchases', icon: ShoppingCart, label: 'Purchases' },
  { to: '/stock', icon: Warehouse, label: 'Stock' },
  { to: '/reports', icon: BarChart3, label: 'Reports' },
  { to: '/users', icon: UserCircle, label: 'Users', adminOnly: true },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

const Sidebar = ({ collapsed, setCollapsed, mobileOpen, setMobileOpen }) => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    if (setMobileOpen) setMobileOpen(false);
    await logout();
    navigate('/login');
  };

  const handleNavClick = () => {
    if (setMobileOpen) setMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40 lg:hidden transition-opacity"
          onClick={() => setMobileOpen && setMobileOpen(false)}
        />
      )}

      <aside
        className={`
          fixed left-0 top-0 h-screen bg-gradient-to-b from-slate-900 to-slate-800
          flex flex-col transition-all duration-300 ease-in-out z-50 shadow-2xl
          ${/* Mobile Drawer positioning */ ''}
          w-72 max-w-[85vw] ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
          ${/* Desktop Sidebar positioning */ ''}
          lg:translate-x-0 ${collapsed ? 'lg:w-16' : 'lg:w-64'}
        `}
      >
        {/* Logo & Close / Collapse Toggle */}
        <div className="flex items-center justify-between px-4 py-5 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <Warehouse size={18} className="text-white" />
            </div>
            {(!collapsed || mobileOpen) && (
              <span className="text-white font-bold text-lg tracking-tight">IVM</span>
            )}
          </div>

          {/* Desktop collapse button */}
          {!collapsed && (
            <button
              onClick={() => setCollapsed(true)}
              className="hidden lg:block text-slate-400 hover:text-white transition-colors p-1 rounded"
              title="Collapse sidebar"
            >
              <ChevronLeft size={18} />
            </button>
          )}

          {/* Mobile close button */}
          <button
            onClick={() => setMobileOpen && setMobileOpen(false)}
            className="lg:hidden text-slate-400 hover:text-white transition-colors p-1 rounded-lg"
            title="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 overflow-y-auto py-4 px-2">
          {navItems.map((item) => {
            if (item.adminOnly && !isAdmin) return null;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={handleNavClick}
                className={({ isActive }) => `
                  flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1
                  transition-all duration-200 group
                  ${isActive
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700'
                  }
                  ${collapsed ? 'lg:justify-center' : ''}
                `}
                title={collapsed ? item.label : ''}
              >
                <item.icon size={18} className="flex-shrink-0 transition-transform duration-200 group-hover:scale-110" />
                {(!collapsed || mobileOpen) && (
                  <span className="text-sm font-medium whitespace-nowrap">{item.label}</span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* User Profile & Logout */}
        <div className="border-t border-slate-700 p-3">
          {(!collapsed || mobileOpen) && (
            <div className="flex items-center gap-3 px-2 py-2 mb-2">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-bold">
                  {user?.full_name?.charAt(0) || user?.username?.charAt(0) || 'U'}
                </span>
              </div>
              <div className="overflow-hidden">
                <p className="text-white text-sm font-medium truncate">
                  {user?.full_name || user?.username}
                </p>
                <p className="text-slate-400 text-xs capitalize">{user?.role}</p>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className={`
              flex items-center gap-3 w-full px-3 py-2.5 rounded-lg
              text-slate-400 hover:text-red-400 hover:bg-red-400/10
              transition-all duration-200 group
              ${collapsed ? 'lg:justify-center' : ''}
            `}
            title={collapsed ? 'Logout' : ''}
          >
            <LogOut size={18} className="flex-shrink-0 transition-transform duration-200 group-hover:-translate-x-1" />
            {(!collapsed || mobileOpen) && <span className="text-sm font-medium">Logout</span>}
          </button>
          {collapsed && (
            <button
              onClick={() => setCollapsed(false)}
              className="hidden lg:flex items-center justify-center w-full mt-2 p-2 text-slate-400 hover:text-white transition-colors rounded"
              title="Expand sidebar"
            >
              <ChevronRight size={18} />
            </button>
          )}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
