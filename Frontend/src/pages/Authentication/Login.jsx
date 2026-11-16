import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Warehouse, Lock, User, AlertCircle, ArrowRight, KeyRound } from 'lucide-react';
import toast from 'react-hot-toast';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFieldErrors({});
    setError('');

    const errs = {};
    if (!username.trim()) {
      errs.username = 'Username is required';
    }
    if (!password) {
      errs.password = 'Password is required';
    }

    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }

    setLoading(true);
    const res = await login({ username: username.trim(), password });
    setLoading(false);
    if (res.success) {
      toast.success('Welcome back!');
      navigate('/dashboard');
    } else {
      setError(res.error || 'Invalid username or password');
      toast.error('Login failed');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 border border-slate-100">
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30 mb-3">
              <Warehouse className="text-white" size={28} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Inventory System</h1>
            <p className="text-gray-500 text-sm mt-1">Sign in to access your inventory</p>
          </div>

          {error && (
            <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm flex items-center gap-2">
              <AlertCircle size={18} className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-2">
                Username
              </label>
              <div className="relative">
                <User size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => { setUsername(e.target.value); setFieldErrors({ ...fieldErrors, username: null }); }}
                  placeholder="Enter your username"
                  autoComplete="username"
                  className={`w-full pl-10 pr-4 py-3 bg-gray-50 border rounded-xl text-sm text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-gray-400 ${
                    fieldErrors.username ? 'border-red-400 bg-red-50/50 ring-1 ring-red-300' : 'border-gray-200'
                  }`}
                  required
                />
              </div>
              {fieldErrors.username && <p className="mt-1 text-xs text-red-500">{fieldErrors.username}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setFieldErrors({ ...fieldErrors, password: null }); }}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  className={`w-full pl-10 pr-4 py-3 bg-gray-50 border rounded-xl text-sm text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-gray-400 ${
                    fieldErrors.password ? 'border-red-400 bg-red-50/50 ring-1 ring-red-300' : 'border-gray-200'
                  }`}
                  required
                />
              </div>
              {fieldErrors.password && <p className="mt-1 text-xs text-red-500">{fieldErrors.password}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
            >
              <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
              <ArrowRight size={18} />
            </button>
          </form>

          {/* Visitor / Demo Quick Access */}
          <div className="mt-6 pt-5 border-t border-gray-100">
            <p className="text-center text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
              Visitor / Demo Access
            </p>
            <button
              type="button"
              onClick={() => {
                setUsername('staff');
                setPassword('staff123');
                setFieldErrors({});
                setError('');
              }}
              className="w-full py-2.5 px-4 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 hover:border-blue-300 font-medium rounded-xl text-sm flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.99] shadow-sm"
            >
              <KeyRound size={16} className="text-blue-600" />
              <span>Click to auto-fill as Staff</span>
            </button>
            <p className="mt-2 text-center text-[11px] text-gray-400">
              Reviewing the system? Click above to instantly populate demo credentials.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
