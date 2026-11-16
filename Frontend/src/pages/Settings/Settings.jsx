import React, { useState, useEffect } from 'react';
import { authService } from '../../services';
import { useAuth } from '../../context/AuthContext';
import { Input, Textarea, Button } from '../../components/UI';
import { Settings as SettingsIcon, User, Lock, Building, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

const Settings = () => {
  const { user, updateUser } = useAuth();

  // Profile Form
  const [profileData, setProfileData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    address: '',
  });
  const [profileLoading, setProfileLoading] = useState(false);

  // Change Password Form
  const [passwordData, setPasswordData] = useState({
    old_password: '',
    new_password: '',
    new_password2: '',
  });
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Company Settings
  const [companyData, setCompanyData] = useState(() => {
    const saved = localStorage.getItem('company_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.currency_symbol === '$' || !parsed.currency_symbol) {
          parsed.currency_symbol = '₹';
        }
        if (parsed.currency_code === 'USD' || !parsed.currency_code) {
          parsed.currency_code = 'INR';
        }
        localStorage.setItem('company_settings', JSON.stringify(parsed));
        return parsed;
      } catch (e) {}
    }
    const defaults = {
      company_name: 'TechMart Enterprises',
      currency_symbol: '₹',
      currency_code: 'INR',
      tax_rate: 18,
      support_email: 'support@techmart.com',
      company_address: '100 Silicon Boulevard, Tech City, India',
    };
    localStorage.setItem('company_settings', JSON.stringify(defaults));
    return defaults;
  });

  const [profileErrors, setProfileErrors] = useState({});
  const [passwordErrors, setPasswordErrors] = useState({});
  const [companyErrors, setCompanyErrors] = useState({});

  useEffect(() => {
    if (user) {
      setProfileData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        phone: user.phone || '',
        address: user.address || '',
      });
    }
  }, [user]);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileErrors({});
    const errs = {};
    if (!profileData.first_name.trim()) errs.first_name = 'First name is required';
    if (!profileData.last_name.trim()) errs.last_name = 'Last name is required';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!profileData.email.trim()) {
      errs.email = 'Email address is required';
    } else if (!emailRegex.test(profileData.email.trim())) {
      errs.email = 'Please enter a valid email address';
    }
    if (profileData.phone && !/^[0-9+\-\s()]{7,20}$/.test(profileData.phone.trim())) {
      errs.phone = 'Please enter a valid phone number (at least 7 digits)';
    }

    if (Object.keys(errs).length > 0) {
      setProfileErrors(errs);
      toast.error(Object.values(errs)[0]);
      return;
    }

    setProfileLoading(true);
    try {
      const res = await authService.updateProfile({
        first_name: profileData.first_name.trim(),
        last_name: profileData.last_name.trim(),
        email: profileData.email.trim(),
        phone: (profileData.phone || '').trim(),
        address: (profileData.address || '').trim(),
      });
      updateUser(res.data);
      toast.success('Profile updated successfully');
    } catch (err) {
      toast.error('Failed to update profile');
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordErrors({});
    const errs = {};
    if (!passwordData.old_password) {
      errs.old_password = 'Current password is required';
    }
    if (!passwordData.new_password) {
      errs.new_password = 'New password is required';
    } else if (passwordData.new_password.length < 8) {
      errs.new_password = 'New password must be at least 8 characters long';
    }
    if (!passwordData.new_password2) {
      errs.new_password2 = 'Please confirm your new password';
    } else if (passwordData.new_password !== passwordData.new_password2) {
      errs.new_password2 = 'New passwords do not match';
    }

    if (Object.keys(errs).length > 0) {
      setPasswordErrors(errs);
      toast.error(Object.values(errs)[0]);
      return;
    }

    setPasswordLoading(true);
    try {
      await authService.changePassword(passwordData);
      toast.success('Password changed successfully');
      setPasswordData({ old_password: '', new_password: '', new_password2: '' });
    } catch (err) {
      const msg = err.response?.data?.old_password?.[0] || err.response?.data?.detail || 'Failed to change password';
      toast.error(msg);
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleCompanySubmit = (e) => {
    e.preventDefault();
    setCompanyErrors({});
    const errs = {};
    if (!companyData.company_name.trim()) errs.company_name = 'Company name is required';
    const tax = parseFloat(companyData.tax_rate);
    if (isNaN(tax) || tax < 0 || tax > 100) {
      errs.tax_rate = 'Tax rate must be between 0% and 100%';
    }
    if (companyData.support_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(companyData.support_email.trim())) {
      errs.support_email = 'Please enter a valid support email';
    }

    if (Object.keys(errs).length > 0) {
      setCompanyErrors(errs);
      toast.error(Object.values(errs)[0]);
      return;
    }

    localStorage.setItem('company_settings', JSON.stringify(companyData));
    toast.success('Company settings saved successfully');
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-xl font-bold text-gray-800">Account & System Settings</h2>
        <p className="text-xs text-gray-500">Manage your profile, security, and company configuration</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile Settings */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <User size={18} className="text-blue-600" />
            <h3 className="font-bold text-gray-800 text-sm">User Profile Information</h3>
          </div>
          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="First Name"
                value={profileData.first_name}
                onChange={(e) => setProfileData({ ...profileData, first_name: e.target.value })}
                error={profileErrors.first_name}
                required
              />
              <Input
                label="Last Name"
                value={profileData.last_name}
                onChange={(e) => setProfileData({ ...profileData, last_name: e.target.value })}
                error={profileErrors.last_name}
                required
              />
            </div>
            <Input
              label="Email Address"
              type="email"
              value={profileData.email}
              onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
              error={profileErrors.email}
              required
            />
            <Input
              label="Phone Number"
              value={profileData.phone}
              placeholder="+91 98765 43210"
              onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
              error={profileErrors.phone}
            />
            <Textarea
              label="Address"
              value={profileData.address}
              placeholder="e.g. Chennai, Tamil Nadu"
              onChange={(e) => setProfileData({ ...profileData, address: e.target.value })}
            />
            <Button type="submit" loading={profileLoading} className="w-full">
              Save Profile Changes
            </Button>
          </form>
        </div>

        {/* Change Password */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Lock size={18} className="text-amber-500" />
              <h3 className="font-bold text-gray-800 text-sm">Security & Password</h3>
            </div>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <Input
                label="Current Password"
                type="password"
                value={passwordData.old_password}
                onChange={(e) => setPasswordData({ ...passwordData, old_password: e.target.value })}
                error={passwordErrors.old_password}
                required
              />
              <Input
                label="New Password"
                type="password"
                value={passwordData.new_password}
                onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                error={passwordErrors.new_password}
                required
              />
              <Input
                label="Confirm New Password"
                type="password"
                value={passwordData.new_password2}
                onChange={(e) => setPasswordData({ ...passwordData, new_password2: e.target.value })}
                error={passwordErrors.new_password2}
                required
              />
              <Button type="submit" loading={passwordLoading} variant="secondary" className="w-full">
                Change Password
              </Button>
            </form>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-100 text-xs text-gray-500">
            <p className="font-medium text-gray-700">Role Status:</p>
            <p className="capitalize">You are signed in as an <strong>{user?.role}</strong>.</p>
          </div>
        </div>

        {/* Company Settings */}
        <div className="md:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Building size={18} className="text-emerald-600" />
            <h3 className="font-bold text-gray-800 text-sm">Company & Localization Configuration</h3>
          </div>
          <form onSubmit={handleCompanySubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="Company / Enterprise Name"
                value={companyData.company_name}
                onChange={(e) => setCompanyData({ ...companyData, company_name: e.target.value })}
                error={companyErrors.company_name}
                required
              />
              <Input
                label="Currency Symbol"
                value={companyData.currency_symbol}
                onChange={(e) => setCompanyData({ ...companyData, currency_symbol: e.target.value })}
              />
              <Input
                label="Currency Code"
                value={companyData.currency_code}
                onChange={(e) => setCompanyData({ ...companyData, currency_code: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Support Email"
                type="email"
                value={companyData.support_email}
                onChange={(e) => setCompanyData({ ...companyData, support_email: e.target.value })}
                error={companyErrors.support_email}
              />
              <Input
                label="Default Tax Rate (%)"
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={companyData.tax_rate}
                onChange={(e) => setCompanyData({ ...companyData, tax_rate: e.target.value })}
                error={companyErrors.tax_rate}
              />
            </div>
            <Input
              label="Registered Office Address"
              value={companyData.company_address}
              onChange={(e) => setCompanyData({ ...companyData, company_address: e.target.value })}
            />
            <div className="flex justify-end">
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
                Save Company Settings
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Settings;
