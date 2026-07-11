import React, { useState, useEffect } from "react";
import { entities } from "@/api/apiClient";
import { Plus, Trash2, Loader2, X, Tag, ToggleLeft, ToggleRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { motion, AnimatePresence } from "framer-motion";

const EMPTY_FORM = { code: "", discount_type: "percentage", discount_value: "", min_order_amount: "", max_uses: "", expiry_date: "", is_active: true };

export default function OwnerCoupons() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const reload = async () => {
    setLoading(true);
    try { setCoupons(await entities.Coupon.filter({}, "-created_date")); }
    finally { setLoading(false); }
  };

  useEffect(() => { reload(); }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await entities.Coupon.create({
        ...form,
        code: form.code.toUpperCase(),
        discount_value: parseFloat(form.discount_value),
        min_order_amount: form.min_order_amount ? parseFloat(form.min_order_amount) : 0,
        max_uses: form.max_uses ? parseInt(form.max_uses) : null,
      });
      toast({ title: "Coupon created! 🎟️" });
      setShowForm(false);
      setForm(EMPTY_FORM);
      reload();
    } catch (err) {
      toast({ title: "Error", description: err.message || "Failed to create coupon", variant: "destructive" });
    } finally { setSaving(false); }
  };

  const toggleActive = async (coupon) => {
    await entities.Coupon.update(coupon.id, { is_active: !coupon.is_active });
    setCoupons(prev => prev.map(c => c.id === coupon.id ? { ...c, is_active: !c.is_active } : c));
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this coupon?")) return;
    await entities.Coupon.delete(id);
    setCoupons(prev => prev.filter(c => c.id !== id));
    toast({ title: "Coupon deleted" });
  };

  return (
    <div className="min-h-screen max-w-5xl mx-auto px-6 lg:px-16 py-12">
      <div className="flex items-center justify-between mb-10">
        <div>
          <span className="font-display text-xs tracking-[0.3em] text-[#C5A059] uppercase">Owner Portal</span>
          <h1 className="font-heading text-3xl lg:text-4xl font-bold text-[#1A1A1B] mt-2">Coupons</h1>
        </div>
        <Button onClick={() => setShowForm(true)} className="bg-[#1A1A1B] text-[#F9F7F2] hover:bg-[#1A1A1B]/90 rounded-xl font-display">
          <Plus className="w-4 h-4 mr-2" /> New Coupon
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-[#1A1A1B]/20" /></div>
      ) : (
        <div className="space-y-3">
          {coupons.map((coupon, i) => (
            <motion.div key={coupon.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className={`bg-white rounded-2xl p-5 shadow-sm flex flex-wrap items-center justify-between gap-4 ${!coupon.is_active ? "opacity-60" : ""}`}>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#C5A059]/10 flex items-center justify-center">
                  <Tag className="w-5 h-5 text-[#C5A059]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-heading text-lg font-bold text-[#1A1A1B]">{coupon.code}</h3>
                    {!coupon.is_active && <span className="text-[10px] font-display font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full">INACTIVE</span>}
                  </div>
                  <p className="text-sm text-[#1A1A1B]/50 font-body">
                    {coupon.discount_type === "percentage" ? `${coupon.discount_value}% off` : `$${coupon.discount_value} off`}
                    {coupon.min_order_amount > 0 && ` · min $${coupon.min_order_amount}`}
                    {coupon.max_uses && ` · ${coupon.times_used || 0}/${coupon.max_uses} uses`}
                    {coupon.expiry_date && ` · expires ${new Date(coupon.expiry_date).toLocaleDateString()}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => toggleActive(coupon)} className="text-[#1A1A1B]/40 hover:text-[#1A1A1B] transition-colors">
                  {coupon.is_active ? <ToggleRight className="w-6 h-6 text-green-500" /> : <ToggleLeft className="w-6 h-6" />}
                </button>
                <button onClick={() => handleDelete(coupon.id)} className="text-[#1A1A1B]/30 hover:text-red-500 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
          {coupons.length === 0 && <div className="text-center py-24 text-[#1A1A1B]/30 font-body">No coupons yet. Create your first one!</div>}
        </div>
      )}

      {/* Add Coupon Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={e => e.target === e.currentTarget && setShowForm(false)}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }}
              className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-heading text-xl font-bold text-[#1A1A1B]">New Coupon</h2>
                <button onClick={() => setShowForm(false)} className="text-[#1A1A1B]/40 hover:text-[#1A1A1B]"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleSave} className="space-y-4">
                <div className="space-y-2">
                  <Label>Coupon Code *</Label>
                  <Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                    placeholder="SAVE10" required className="h-11 font-display font-bold tracking-widest" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Discount Type</Label>
                    <select value={form.discount_type} onChange={e => setForm(f => ({ ...f, discount_type: e.target.value }))}
                      className="w-full h-11 rounded-lg border border-input bg-background px-3 text-sm">
                      <option value="percentage">Percentage (%)</option>
                      <option value="fixed">Fixed ($)</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Value *</Label>
                    <Input type="number" min="0" step="0.01" value={form.discount_value}
                      onChange={e => setForm(f => ({ ...f, discount_value: e.target.value }))}
                      placeholder={form.discount_type === "percentage" ? "10" : "5.00"} required className="h-11" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Min Order ($)</Label>
                    <Input type="number" min="0" step="0.01" value={form.min_order_amount}
                      onChange={e => setForm(f => ({ ...f, min_order_amount: e.target.value }))} placeholder="0.00" className="h-11" />
                  </div>
                  <div className="space-y-2">
                    <Label>Max Uses</Label>
                    <Input type="number" min="1" value={form.max_uses}
                      onChange={e => setForm(f => ({ ...f, max_uses: e.target.value }))} placeholder="Unlimited" className="h-11" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Expiry Date</Label>
                  <Input type="date" value={form.expiry_date} onChange={e => setForm(f => ({ ...f, expiry_date: e.target.value }))} className="h-11" />
                </div>
                <div className="flex gap-3 pt-2">
                  <Button type="button" variant="outline" className="flex-1 h-11" onClick={() => setShowForm(false)}>Cancel</Button>
                  <Button type="submit" disabled={saving} className="flex-1 h-11 bg-[#1A1A1B] text-[#F9F7F2] hover:bg-[#1A1A1B]/90">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Coupon"}
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
