import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Pencil, Trash2, X, Save, Clock, Table2, UserCog, Utensils } from 'lucide-react';
import { StaggerContainer, StaggerItem } from '../components/animation/StaggerContainer';
import api from '../services/api';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const tabs = [
  { id: 'general', label: 'Hours', icon: Clock },
  { id: 'tables', label: 'Tables', icon: Table2 },
  { id: 'staff', label: 'Staff', icon: UserCog },
  { id: 'meals', label: 'Menu', icon: Utensils },
];

export default function SettingsPage() {
  const [tab, setTab] = useState('general');

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Settings</h1>
        <p className="text-gray-400 text-sm mt-1">Configure your restaurant resources</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 mb-6 bg-gray-100/60 p-1 rounded-xl w-fit relative">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className="relative flex items-center gap-2 px-4 py-2.5 rounded-lg text-[13px] font-semibold transition-colors duration-200 z-10"
            style={{ color: tab === id ? '#111827' : '#9ca3af' }}
          >
            {tab === id && (
              <motion.div
                layoutId="settings-tab"
                className="absolute inset-0 bg-white rounded-lg shadow-soft"
                transition={{ type: 'spring', stiffness: 350, damping: 30 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <Icon size={15} /> {label}
            </span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.25 }}
        >
          {tab === 'general' && <OpeningHoursSection />}
          {tab === 'tables' && <TablesSection />}
          {tab === 'staff' && <StaffSection />}
          {tab === 'meals' && <MealsSection />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function OpeningHoursSection() {
  const [hours, setHours] = useState(DAYS.map(day => ({ day, openTime: '09:00', closeTime: '22:00', isClosed: false })));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.get('/business/hours').then(({ data }) => {
      if (data.length > 0) setHours(DAYS.map(day => data.find(h => h.day === day) || { day, openTime: '09:00', closeTime: '22:00', isClosed: false }));
    }).catch(() => {});
  }, []);

  const updateHour = (idx, field, value) => {
    const updated = [...hours];
    updated[idx] = { ...updated[idx], [field]: value };
    setHours(updated);
  };

  const save = async () => {
    setSaving(true);
    await api.post('/business/hours', { hours }).catch(() => {});
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
          <Clock size={17} className="text-amber-600" />
        </div>
        <div>
          <h2 className="font-bold text-gray-900 text-[15px]">Operating Hours</h2>
          <p className="text-[12px] text-gray-400">Set your weekly business schedule</p>
        </div>
      </div>

      <div className="space-y-3">
        {hours.map((h, i) => (
          <div key={h.day} className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-colors ${h.isClosed ? 'bg-gray-50/50' : 'hover:bg-gray-50/50'}`}>
            <span className="w-28 text-[13px] font-semibold capitalize text-gray-700">{h.day}</span>
            <label className="flex items-center gap-2 cursor-pointer">
              <div className={`relative w-10 h-5 rounded-full transition-colors ${h.isClosed ? 'bg-gray-200' : 'bg-primary-500'}`}
                onClick={() => updateHour(i, 'isClosed', !h.isClosed)}>
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${h.isClosed ? 'left-0.5' : 'left-5'}`} />
              </div>
              <span className={`text-[12px] font-medium ${h.isClosed ? 'text-gray-400' : 'text-emerald-600'}`}>
                {h.isClosed ? 'Closed' : 'Open'}
              </span>
            </label>
            {!h.isClosed && (
              <div className="flex items-center gap-2 ml-4">
                <input type="time" value={h.openTime} onChange={e => updateHour(i, 'openTime', e.target.value)}
                  className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-[13px] text-gray-700" />
                <span className="text-gray-300 text-[12px] font-medium">to</span>
                <input type="time" value={h.closeTime} onChange={e => updateHour(i, 'closeTime', e.target.value)}
                  className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-[13px] text-gray-700" />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 pt-4 border-t border-gray-100">
        <button onClick={save} disabled={saving}
          className="gradient-primary text-white px-5 py-2.5 rounded-xl text-[13px] font-semibold hover:opacity-90 disabled:opacity-50 transition-all shadow-glow flex items-center gap-2">
          {saved ? <><Save size={15} /> Saved!</> : saving ? 'Saving...' : <><Save size={15} /> Save Schedule</>}
        </button>
      </div>
    </div>
  );
}

function TablesSection() {
  const [tables, setTables] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: '', capacity: 4 });

  const fetch = () => api.get('/tables').then(({ data }) => setTables(data)).catch(() => {});
  useEffect(() => { fetch(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editingId) await api.put(`/tables/${editingId}`, form);
    else await api.post('/tables', form);
    setForm({ name: '', capacity: 4 }); setShowForm(false); setEditingId(null); fetch();
  };

  const edit = (t) => { setForm({ name: t.name, capacity: t.capacity }); setEditingId(t._id); setShowForm(true); };
  const remove = async (id) => { await api.delete(`/tables/${id}`); fetch(); };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
            <Table2 size={17} className="text-blue-600" />
          </div>
          <div>
            <h2 className="font-bold text-gray-900 text-[15px]">Tables</h2>
            <p className="text-[12px] text-gray-400">{tables.length} tables configured</p>
          </div>
        </div>
        <button onClick={() => { setShowForm(true); setEditingId(null); setForm({ name: '', capacity: 4 }); }}
          className="flex items-center gap-1.5 text-[13px] font-semibold text-primary-600 hover:text-primary-700 bg-primary-50 px-3.5 py-2 rounded-xl transition-colors">
          <Plus size={15} /> Add Table
        </button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            onSubmit={handleSubmit}
            className="mb-5 overflow-hidden"
          >
            <div className="p-5 bg-gray-50/50 rounded-xl border border-gray-100 flex gap-3 items-end">
              <div className="flex-1">
                <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Name</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required
                  className="w-full mt-1.5 px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm" placeholder="Table 1" />
              </div>
              <div className="w-28">
                <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Capacity</label>
                <input type="number" value={form.capacity} onChange={e => setForm({ ...form, capacity: +e.target.value })} min={1}
                  className="w-full mt-1.5 px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm" />
              </div>
              <button type="submit" className="gradient-primary text-white px-5 py-2.5 rounded-xl text-[13px] font-semibold shadow-glow hover:opacity-90">
                {editingId ? 'Update' : 'Create'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="w-10 h-10 rounded-xl border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-50">
                <X size={16} />
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3" key={tables.length}>
        {tables.map(t => (
          <StaggerItem key={t._id}>
            <div className="p-4 rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-soft transition-all group">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[14px] font-bold text-gray-900">{t.name}</p>
                  <p className="text-[12px] text-gray-400 mt-0.5">{t.capacity} seats</p>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => edit(t)} className="w-8 h-8 rounded-lg hover:bg-primary-50 flex items-center justify-center text-gray-400 hover:text-primary-600 transition-colors">
                    <Pencil size={13} />
                  </button>
                  <button onClick={() => remove(t._id)} className="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          </StaggerItem>
        ))}
        {tables.length === 0 && !showForm && (
          <div className="col-span-full py-12 text-center">
            <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Table2 size={22} className="text-gray-300" />
            </div>
            <p className="text-sm text-gray-400">No tables created yet</p>
          </div>
        )}
      </StaggerContainer>
    </div>
  );
}

function StaffSection() {
  const [staff, setStaff] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '', role: 'waiter' });

  const fetch = () => api.get('/staff').then(({ data }) => setStaff(data)).catch(() => {});
  useEffect(() => { fetch(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editingId) await api.put(`/staff/${editingId}`, form);
    else await api.post('/staff', form);
    setForm({ name: '', email: '', phone: '', role: 'waiter' }); setShowForm(false); setEditingId(null); fetch();
  };

  const edit = (s) => { setForm({ name: s.name, email: s.email || '', phone: s.phone || '', role: s.role }); setEditingId(s._id); setShowForm(true); };
  const remove = async (id) => { await api.delete(`/staff/${id}`); fetch(); };

  const roleColors = {
    waiter: 'bg-blue-50 text-blue-600 border-blue-200/60',
    host: 'bg-violet-50 text-violet-600 border-violet-200/60',
    manager: 'bg-amber-50 text-amber-600 border-amber-200/60',
    chef: 'bg-emerald-50 text-emerald-600 border-emerald-200/60',
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center">
            <UserCog size={17} className="text-violet-600" />
          </div>
          <div>
            <h2 className="font-bold text-gray-900 text-[15px]">Staff Members</h2>
            <p className="text-[12px] text-gray-400">{staff.length} team members</p>
          </div>
        </div>
        <button onClick={() => { setShowForm(true); setEditingId(null); setForm({ name: '', email: '', phone: '', role: 'waiter' }); }}
          className="flex items-center gap-1.5 text-[13px] font-semibold text-primary-600 hover:text-primary-700 bg-primary-50 px-3.5 py-2 rounded-xl transition-colors">
          <Plus size={15} /> Add Member
        </button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            onSubmit={handleSubmit}
            className="mb-5 overflow-hidden"
          >
            <div className="p-5 bg-gray-50/50 rounded-xl border border-gray-100">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Name</label>
                  <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required
                    className="w-full mt-1.5 px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm" placeholder="John Smith" />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Email</label>
                  <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                    className="w-full mt-1.5 px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm" placeholder="john@email.com" />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Phone</label>
                  <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                    className="w-full mt-1.5 px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm" placeholder="+1 234 567" />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Role</label>
                  <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}
                    className="w-full mt-1.5 px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm">
                    <option value="waiter">Waiter</option>
                    <option value="host">Host</option>
                    <option value="manager">Manager</option>
                    <option value="chef">Chef</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="gradient-primary text-white px-5 py-2.5 rounded-xl text-[13px] font-semibold shadow-glow hover:opacity-90">
                  {editingId ? 'Update' : 'Add Member'}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2.5 text-sm text-gray-400 hover:text-gray-600 transition-colors">Cancel</button>
              </div>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      <StaggerContainer className="space-y-2" key={staff.length}>
        {staff.map(s => (
          <StaggerItem key={s._id}>
            <div className="flex items-center justify-between p-4 rounded-xl hover:bg-gray-50/50 transition-colors group">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center text-white text-[13px] font-bold">
                  {s.name?.[0]?.toUpperCase()}
                </div>
                <div>
                  <p className="text-[14px] font-semibold text-gray-900">{s.name}</p>
                  <p className="text-[12px] text-gray-400">{s.email || s.phone || 'No contact info'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border capitalize ${roleColors[s.role] || roleColors.waiter}`}>
                  {s.role}
                </span>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => edit(s)} className="w-8 h-8 rounded-lg hover:bg-primary-50 flex items-center justify-center text-gray-400 hover:text-primary-600"><Pencil size={13} /></button>
                  <button onClick={() => remove(s._id)} className="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center text-gray-400 hover:text-red-500"><Trash2 size={13} /></button>
                </div>
              </div>
            </div>
          </StaggerItem>
        ))}
        {staff.length === 0 && !showForm && (
          <div className="py-12 text-center">
            <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center mx-auto mb-3"><UserCog size={22} className="text-gray-300" /></div>
            <p className="text-sm text-gray-400">No staff members added yet</p>
          </div>
        )}
      </StaggerContainer>
    </div>
  );
}

function MealsSection() {
  const [meals, setMeals] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', price: 0, category: '', image: '' });

  const fetch = () => api.get('/meals').then(({ data }) => setMeals(data)).catch(() => {});
  useEffect(() => { fetch(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editingId) await api.put(`/meals/${editingId}`, form);
    else await api.post('/meals', form);
    setForm({ name: '', description: '', price: 0, category: '', image: '' }); setShowForm(false); setEditingId(null); fetch();
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('image', file);
    const { data } = await api.post('/meals/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
    setForm(prev => ({ ...prev, image: data.url }));
  };

  const edit = (m) => { setForm({ name: m.name, description: m.description || '', price: m.price, category: m.category || '', image: m.image || '' }); setEditingId(m._id); setShowForm(true); };
  const remove = async (id) => { await api.delete(`/meals/${id}`); fetch(); };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
            <Utensils size={17} className="text-emerald-600" />
          </div>
          <div>
            <h2 className="font-bold text-gray-900 text-[15px]">Menu Items</h2>
            <p className="text-[12px] text-gray-400">{meals.length} items on menu</p>
          </div>
        </div>
        <button onClick={() => { setShowForm(true); setEditingId(null); setForm({ name: '', description: '', price: 0, category: '', image: '' }); }}
          className="flex items-center gap-1.5 text-[13px] font-semibold text-primary-600 hover:text-primary-700 bg-primary-50 px-3.5 py-2 rounded-xl transition-colors">
          <Plus size={15} /> Add Item
        </button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            onSubmit={handleSubmit}
            className="mb-5 overflow-hidden"
          >
            <div className="p-5 bg-gray-50/50 rounded-xl border border-gray-100 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1">
                  <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Name</label>
                  <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required
                    className="w-full mt-1.5 px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm" placeholder="Dish name" />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Price ($)</label>
                  <input type="number" step="0.01" value={form.price} onChange={e => setForm({ ...form, price: +e.target.value })} min={0}
                    className="w-full mt-1.5 px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm" />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Category</label>
                  <input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                    className="w-full mt-1.5 px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm" placeholder="Appetizer" />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Description</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2}
                  className="w-full mt-1.5 px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm resize-none" placeholder="Describe this dish..." />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Image</label>
                <div className="mt-1.5 flex items-center gap-3">
                  <label className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-[13px] text-gray-500 cursor-pointer hover:bg-gray-50 transition-colors">
                    Choose File
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                  {form.image && <img src={form.image} alt="" className="h-12 w-12 rounded-xl object-cover border border-gray-200" />}
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button type="submit" className="gradient-primary text-white px-5 py-2.5 rounded-xl text-[13px] font-semibold shadow-glow hover:opacity-90">
                  {editingId ? 'Update' : 'Add Item'}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2.5 text-sm text-gray-400 hover:text-gray-600 transition-colors">Cancel</button>
              </div>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3" key={meals.length}>
        {meals.map(m => (
          <StaggerItem key={m._id}>
            <div className="p-4 rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-soft transition-all group">
              <div className="flex items-start gap-3">
                {m.image ? (
                  <img src={m.image} alt="" className="w-14 h-14 rounded-xl object-cover border border-gray-100 shrink-0" />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-gray-50 flex items-center justify-center shrink-0">
                    <Utensils size={18} className="text-gray-300" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-bold text-gray-900 truncate">{m.name}</p>
                  <p className="text-[12px] text-gray-400 truncate">{m.category || 'Uncategorized'}</p>
                  <p className="text-[14px] font-bold text-primary-600 mt-1">${m.price?.toFixed(2)}</p>
                </div>
                <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => edit(m)} className="w-7 h-7 rounded-lg hover:bg-primary-50 flex items-center justify-center text-gray-400 hover:text-primary-600"><Pencil size={12} /></button>
                  <button onClick={() => remove(m._id)} className="w-7 h-7 rounded-lg hover:bg-red-50 flex items-center justify-center text-gray-400 hover:text-red-500"><Trash2 size={12} /></button>
                </div>
              </div>
            </div>
          </StaggerItem>
        ))}
        {meals.length === 0 && !showForm && (
          <div className="col-span-full py-12 text-center">
            <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center mx-auto mb-3"><Utensils size={22} className="text-gray-300" /></div>
            <p className="text-sm text-gray-400">No menu items added yet</p>
          </div>
        )}
      </StaggerContainer>
    </div>
  );
}
