import React, { useState, useEffect } from "react";
import { entities } from "@/api/apiClient";
import { Plus, Pencil, Trash2, Loader2, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { motion, AnimatePresence } from "framer-motion";

const SHOPS = ["Sandwich Corner", "Breakfast Bistro", "NYC Burger"];
const SHOP_COLORS = { "Sandwich Corner": "#7D8471", "Breakfast Bistro": "#D98E73", "NYC Burger": "#4A3728" };

const EMPTY_FORM = { name: "", description: "", price: "", shop: "Sandwich Corner", category: "", image_url: "", is_available: true };

export default function OwnerMenu() {
  const [items, setItems] = useState([]);
  const [activeShop, setActiveShop] = useState("Sandwich Corner");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const { toast } = useToast();

  const reload = async () => {
    setLoading(true);
    try { setItems(await entities.MenuItem.filter({})); }
    finally { setLoading(false); }
  };

  useEffect(() => { reload(); }, []);

  const openAdd = () => { setForm({ ...EMPTY_FORM, shop: activeShop }); setEditItem(null); setShowForm(true); };
  const openEdit = (item) => {
    setForm({ name: item.name, description: item.description || "", price: item.price, shop: item.shop, category: item.category, image_url: item.image_url || "", is_available: item.is_available });
    setEditItem(item);
    setShowForm(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = { ...form, price: parseFloat(form.price) };
      if (editItem) { await entities.MenuItem.update(editItem.id, data); toast({ title: "Item updated!" }); }
      else { await entities.MenuItem.create(data); toast({ title: "Item added!" }); }
      setShowForm(false);
      reload();
    } catch { toast({ title: "Error", description: "Save failed", variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this menu item?")) return;
    setDeletingId(id);
    try { await entities.MenuItem.delete(id); reload(); toast({ title: "Item deleted" }); }
    finally { setDeletingId(null); }
  };

  const shopItems = items.filter(i => i.shop === activeShop);
  const color = SHOP_COLORS[activeShop];

  return (
    <div className="min-h-screen max-w-7xl mx-auto px-6 lg:px-16 py-12">
      <div className="flex items-center justify-between mb-10">
        <div>
          <span className="font-display text-xs tracking-[0.3em] text-[#C5A059] uppercase">Owner Portal</span>
          <h1 className="font-heading text-3xl lg:text-4xl font-bold text-[#1A1A1B] mt-2">Menu Management</h1>
        </div>
        <Button onClick={openAdd} className="bg-[#1A1A1B] text-[#F9F7F2] hover:bg-[#1A1A1B]/90 rounded-xl font-display">
          <Plus className="w-4 h-4 mr-2" /> Add Item
        </Button>
      </div>

      {/* Shop Tabs */}
      <div className="flex gap-2 mb-8">
        {SHOPS.map(shop => (
          <button key={shop} onClick={() => setActiveShop(shop)}
            className="px-5 py-2.5 rounded-full text-sm font-display font-medium transition-all"
            style={activeShop === shop ? { backgroundColor: color, color: "#F9F7F2" } : { color: "#1A1A1B80", backgroundColor: "#f5f5f0" }}>
            {shop}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-[#1A1A1B]/20" /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <AnimatePresence>
            {shopItems.map(item => (
              <motion.div key={item.id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                className={`bg-white rounded-2xl overflow-hidden shadow-sm border-2 transition-all ${!item.is_available ? "opacity-50" : "border-transparent"}`}
                style={item.is_available ? {} : { borderColor: "#f0f0f0" }}>
                {item.image_url ? (
                  <div className="aspect-[4/3] overflow-hidden">
                    <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="aspect-[4/3] flex items-center justify-center" style={{ backgroundColor: `${color}10` }}>
                    <span className="font-heading text-4xl" style={{ color: `${color}40` }}>{item.name.charAt(0)}</span>
                  </div>
                )}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="font-heading text-sm font-semibold text-[#1A1A1B] leading-tight">{item.name}</h3>
                    <span className="font-display font-bold text-sm whitespace-nowrap" style={{ color }}>${Number(item.price).toFixed(2)}</span>
                  </div>
                  <span className="text-[10px] font-display font-semibold uppercase px-2 py-0.5 rounded-full" style={{ backgroundColor: `${color}12`, color }}>
                    {item.category}
                  </span>
                  {!item.is_available && <span className="ml-2 text-[10px] font-display text-red-500">Unavailable</span>}
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => openEdit(item)} className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-display bg-[#1A1A1B]/5 hover:bg-[#1A1A1B]/10 transition-colors">
                      <Pencil className="w-3 h-3" /> Edit
                    </button>
                    <button onClick={() => handleDelete(item.id)} disabled={deletingId === item.id}
                      className="flex items-center justify-center px-3 py-1.5 rounded-lg text-xs font-display bg-red-50 hover:bg-red-100 text-red-600 transition-colors">
                      {deletingId === item.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {shopItems.length === 0 && !loading && (
            <div className="col-span-full text-center py-16 text-[#1A1A1B]/30 font-body">
              No items for {activeShop} yet. Click "Add Item" to get started.
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={e => e.target === e.currentTarget && setShowForm(false)}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-heading text-xl font-bold text-[#1A1A1B]">{editItem ? "Edit Item" : "Add Menu Item"}</h2>
                <button onClick={() => setShowForm(false)} className="text-[#1A1A1B]/40 hover:text-[#1A1A1B]"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleSave} className="space-y-4">
                <div className="space-y-2">
                  <Label>Name *</Label>
                  <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Classic Club" required className="h-11" />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Delicious description..." className="h-11" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Price *</Label>
                    <Input type="number" step="0.01" min="0" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="12.99" required className="h-11" />
                  </div>
                  <div className="space-y-2">
                    <Label>Category *</Label>
                    <Input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="Classics" required className="h-11" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Shop *</Label>
                  <select value={form.shop} onChange={e => setForm(f => ({ ...f, shop: e.target.value }))}
                    className="w-full h-11 rounded-lg border border-input bg-background px-3 text-sm font-display">
                    {SHOPS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Image URL</Label>
                  <Input value={form.image_url} onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))} placeholder="/images/menu/my-item.png" className="h-11" />
                </div>
                <div className="flex items-center gap-3">
                  <input type="checkbox" id="available" checked={form.is_available} onChange={e => setForm(f => ({ ...f, is_available: e.target.checked }))} className="w-4 h-4 rounded" />
                  <Label htmlFor="available" className="cursor-pointer">Available for ordering</Label>
                </div>
                <div className="flex gap-3 pt-2">
                  <Button type="button" variant="outline" className="flex-1 h-11" onClick={() => setShowForm(false)}>Cancel</Button>
                  <Button type="submit" disabled={saving} className="flex-1 h-11 bg-[#1A1A1B] text-[#F9F7F2] hover:bg-[#1A1A1B]/90">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editItem ? "Save Changes" : "Add Item"}
                  </Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
