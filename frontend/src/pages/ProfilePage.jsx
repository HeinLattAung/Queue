import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Save, Upload, Building2, UserCircle, Shield, CheckCircle } from 'lucide-react';
import { StaggerContainer, StaggerItem } from '../components/animation/StaggerContainer';
import api from '../services/api';
import useAuthStore from '../store/authStore';

export default function ProfilePage() {
  const { user } = useAuthStore();
  const [profile, setProfile] = useState({ name: '', email: '', phone: '' });
  const [business, setBusiness] = useState({ name: '', location: '' });
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });

  useEffect(() => {
    api.get('/profile').then(({ data }) => {
      setProfile({ name: data.name, email: data.email, phone: data.phone || '' });
      if (data.businessId) setBusiness({ name: data.businessId.name, location: data.businessId.location || '' });
    }).catch(() => {});
  }, []);

  const showMsg = (text, type = 'success') => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: '', type: '' }), 3000);
  };

  const saveProfile = async () => {
    setSaving(true);
    await api.put('/profile', profile);
    setSaving(false);
    showMsg('Profile updated successfully');
  };

  const saveBusiness = async () => {
    setSaving(true);
    await api.put('/business', business);
    setSaving(false);
    showMsg('Business information updated');
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if (passwords.newPassword !== passwords.confirmPassword) { showMsg('Passwords do not match', 'error'); return; }
    try {
      await api.post('/profile/change-password', { currentPassword: passwords.currentPassword, newPassword: passwords.newPassword });
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
      showMsg('Password changed successfully');
    } catch (err) { showMsg(err.response?.data?.message || 'Error changing password', 'error'); }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('avatar', file);
    await api.post('/profile/avatar', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
    showMsg('Avatar uploaded successfully');
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Profile Settings</h1>
        <p className="text-gray-400 text-sm mt-1">Manage your account and business information</p>
      </div>

      <AnimatePresence>
        {msg.text && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="mb-6 overflow-hidden"
          >
            <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-[13px] font-medium ${msg.type === 'error' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
              <CheckCircle size={15} /> {msg.text}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <StaggerContainer className="space-y-6">
        {/* Restaurant Info */}
        <StaggerItem>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
                <Building2 size={17} className="text-amber-600" />
              </div>
              <div>
                <h2 className="font-bold text-gray-900 text-[15px]">Restaurant Information</h2>
                <p className="text-[12px] text-gray-400">Your business details</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Restaurant Name</label>
                <input value={business.name} onChange={e => setBusiness({ ...business, name: e.target.value })}
                  className="w-full mt-1.5 px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl text-sm hover:border-gray-300 transition-all" />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Location</label>
                <input value={business.location} onChange={e => setBusiness({ ...business, location: e.target.value })}
                  className="w-full mt-1.5 px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl text-sm hover:border-gray-300 transition-all" />
              </div>
              <button onClick={saveBusiness} disabled={saving}
                className="gradient-primary text-white px-5 py-2.5 rounded-xl text-[13px] font-semibold hover:opacity-90 disabled:opacity-50 transition-all shadow-glow flex items-center gap-2">
                <Save size={15} /> Save Changes
              </button>
            </div>
          </div>
        </StaggerItem>

        {/* Owner Profile */}
        <StaggerItem>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center">
                <UserCircle size={17} className="text-primary-600" />
              </div>
              <div>
                <h2 className="font-bold text-gray-900 text-[15px]">Owner Profile</h2>
                <p className="text-[12px] text-gray-400">Personal account settings</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Avatar</label>
                <div className="flex items-center gap-4 mt-2">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold text-2xl shadow-glow">
                    {profile.name?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <label className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[13px] text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors font-medium">
                    <Upload size={15} /> Upload Photo
                    <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                  </label>
                </div>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Name</label>
                <input value={profile.name} onChange={e => setProfile({ ...profile, name: e.target.value })}
                  className="w-full mt-1.5 px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl text-sm hover:border-gray-300 transition-all" />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Email</label>
                <input value={profile.email} disabled
                  className="w-full mt-1.5 px-4 py-3 bg-gray-100/50 border border-gray-200 rounded-xl text-sm text-gray-400 cursor-not-allowed" />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Phone</label>
                <input value={profile.phone} onChange={e => setProfile({ ...profile, phone: e.target.value })}
                  className="w-full mt-1.5 px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl text-sm hover:border-gray-300 transition-all" placeholder="+1 234 567 890" />
              </div>
              <button onClick={saveProfile} disabled={saving}
                className="gradient-primary text-white px-5 py-2.5 rounded-xl text-[13px] font-semibold hover:opacity-90 disabled:opacity-50 transition-all shadow-glow flex items-center gap-2">
                <Save size={15} /> Save Profile
              </button>
            </div>
          </div>
        </StaggerItem>

        {/* Security */}
        <StaggerItem>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center">
                <Shield size={17} className="text-red-500" />
              </div>
              <div>
                <h2 className="font-bold text-gray-900 text-[15px]">Security</h2>
                <p className="text-[12px] text-gray-400">Change your password</p>
              </div>
            </div>
            <form onSubmit={changePassword} className="space-y-4">
              <div>
                <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Current Password</label>
                <input type="password" value={passwords.currentPassword} onChange={e => setPasswords({ ...passwords, currentPassword: e.target.value })} required
                  className="w-full mt-1.5 px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl text-sm hover:border-gray-300 transition-all" />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">New Password</label>
                <input type="password" value={passwords.newPassword} onChange={e => setPasswords({ ...passwords, newPassword: e.target.value })} required minLength={6}
                  className="w-full mt-1.5 px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl text-sm hover:border-gray-300 transition-all" />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Confirm Password</label>
                <input type="password" value={passwords.confirmPassword} onChange={e => setPasswords({ ...passwords, confirmPassword: e.target.value })} required
                  className="w-full mt-1.5 px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl text-sm hover:border-gray-300 transition-all" />
              </div>
              <button type="submit"
                className="bg-red-500 hover:bg-red-600 text-white px-5 py-2.5 rounded-xl text-[13px] font-semibold transition-all flex items-center gap-2 shadow-sm">
                <Shield size={15} /> Change Password
              </button>
            </form>
          </div>
        </StaggerItem>
      </StaggerContainer>
    </div>
  );
}
