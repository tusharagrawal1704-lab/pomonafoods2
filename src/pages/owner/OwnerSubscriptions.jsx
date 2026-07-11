import React, { useState, useEffect } from "react";
import { entities } from "@/api/apiClient";
import { Crown, Users, Plus, Loader2, X, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { motion, AnimatePresence } from "framer-motion";

const PLAN_EMPTY = { name: "", description: "", monthly_price: "", order_threshold: "", paid_orders: "", is_active: true };

export default function OwnerSubscriptions() {
  const [plans, setPlans] = useState([]);
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("plans");
  const [showForm, setShowForm] = useState(false);
  const [editPlan, setEditPlan] = useState(null);
  const [form, setForm] = useState(PLAN_EMPTY);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const reload = async () => {
    setLoading(true);
    try {
      const [p, s] = await Promise.all([
        entities.SubscriptionPlan.filter({}, "-created_date"),
        entities.CustomerSubscription.filter({}, "-created_date"),
      ]);
      setPlans(p);
      setSubs(s);
    } finally { setLoading(false); }
  };

  useEffect(() => { reload(); }, []);

  const openAdd = () => { setForm(PLAN_EMPTY); setEditPlan(null); setShowForm(true); };
  const openEdit = (plan) => {
    setForm({ name: plan.name, description: plan.description || "", monthly_price: plan.monthly_price, order_threshold: plan.order_threshold, paid_orders: plan.paid_orders, is_active: plan.is_active });
    setEditPlan(plan); setShowForm(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = { ...form, monthly_price: parseFloat(form.monthly_price), order_threshold: parseInt(form.order_threshold), paid_orders: parseInt(form.paid_orders) };
      if (editPlan) { await entities.SubscriptionPlan.update(editPlan.id, data); toast({ title: "Plan updated!" }); }
      else { await entities.SubscriptionPlan.create(data); toast({ title: "Plan created! 🌟" }); }
      setShowForm(false); reload();
    } catch { toast({ title: "Error", variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const deletePlan = async (id) => {
    if (!confirm("Delete this plan?")) return;
    await entities.SubscriptionPlan.delete(id);
    reload(); toast({ title: "Plan deleted" });
  };

  const cancelSub = async (sub) => {
    if (!confirm(`Cancel subscription for ${sub.customer_email}?`)) return;
    await entities.CustomerSubscription.update(sub.id, { status: "cancelled" });
    reload(); toast({ title: "Subscription cancelled" });
  };

  return (
    <div className="min-h-screen max-w-5xl mx-auto px-6 lg:px-16 py-12">
      <div className="flex items-center justify-between mb-10">
        <div>
          <span className="font-display text-xs tracking-[0.3em] text-[#C5A059] uppercase">Owner Portal</span>
          <h1 className="font-heading text-3xl lg:text-4xl font-bold text-[#1A1A1B] mt-2">Subscriptions</h1>
        </div>
        {activeTab === "plans" && (
          <Button onClick={openAdd} className="bg-[#1A1A1B] text-[#F9F7F2] hover:bg-[#1A1A1B]/90 rounded-xl font-display">
            <Plus className="w-4 h-4 mr-2" /> New Plan
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-8 bg-white rounded-xl p-1 shadow-sm w-fit">
        {[{ key: "plans", label: "Plans", icon: Crown }, { key: "members", label: "Members", icon: Users }].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-display font-medium transition-all ${activeTab === tab.key ? "bg-[#1A1A1B] text-[#F9F7F2]" : "text-[#1A1A1B60] hover:text-[#1A1A1B]"}`}>
            <tab.icon className="w-4 h-4" /> {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-[#1A1A1B]/20" /></div>
      ) : activeTab === "plans" ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan, i) => {
            const freeOrders = plan.order_threshold - plan.paid_orders;
            const activeSubs = subs.filter(s => s.plan_id === plan.id && s.status === "active").length;
            return (
              <motion.div key={plan.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                className={`bg-white rounded-2xl p-6 shadow-sm border ${!plan.is_active ? "opacity-60 border-[#1A1A1B]/5" : "border-[#C5A059]/20"}`}>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-heading text-xl font-bold text-[#1A1A1B]">{plan.name}</h3>
                    {plan.description && <p className="text-xs text-[#1A1A1B]/50 font-body mt-1">{plan.description}</p>}
                  </div>
                  <Crown className="w-5 h-5 text-[#C5A059]" />
                </div>
                <div className="mb-4">
                  <span className="font-heading text-3xl font-bold text-[#1A1A1B]">${plan.monthly_price}</span>
                  <span className="text-[#1A1A1B]/40 text-sm">/mo</span>
                </div>
                <div className="space-y-1 text-sm font-body text-[#1A1A1B]/60 mb-4">
                  <p>Up to {plan.order_threshold} orders/month</p>
                  <p>Pay for {plan.paid_orders}, get <strong className="text-[#C5A059]">{freeOrders} free</strong></p>
                  <p className="font-semibold text-[#1A1A1B]">{activeSubs} active subscriber{activeSubs !== 1 ? "s" : ""}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openEdit(plan)} className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-display bg-[#1A1A1B]/5 hover:bg-[#1A1A1B]/10">
                    <Pencil className="w-3 h-3" /> Edit
                  </button>
                  <button onClick={() => deletePlan(plan.id)} className="flex items-center justify-center px-3 py-2 rounded-lg text-xs font-display bg-red-50 hover:bg-red-100 text-red-600">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </motion.div>
            );
          })}
          {plans.length === 0 && <div className="col-span-3 text-center py-24 text-[#1A1A1B]/30 font-body">No plans yet.</div>}
        </div>
      ) : (
        <div className="space-y-3">
          {subs.map((sub, i) => (
            <motion.div key={sub.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className={`bg-white rounded-2xl p-5 shadow-sm flex flex-wrap items-center justify-between gap-4 ${sub.status !== "active" ? "opacity-60" : ""}`}>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-[#C5A059]/10 flex items-center justify-center">
                  <Crown className="w-5 h-5 text-[#C5A059]" />
                </div>
                <div>
                  <h4 className="font-heading text-sm font-semibold text-[#1A1A1B]">{sub.customer_name || sub.customer_email}</h4>
                  <p className="text-xs text-[#1A1A1B]/40 font-display">
                    {sub.plan_name} · {sub.orders_this_month || 0}/{sub.order_threshold} orders this month
                    {sub.renewal_date && ` · renews ${new Date(sub.renewal_date).toLocaleDateString()}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-[10px] font-display font-bold uppercase px-2 py-0.5 rounded-full ${sub.status === "active" ? "bg-green-100 text-green-700" : "bg-[#1A1A1B]/5 text-[#1A1A1B]/50"}`}>
                  {sub.status}
                </span>
                {sub.status === "active" && (
                  <button onClick={() => cancelSub(sub)} className="text-xs font-display text-red-500 hover:text-red-700 hover:underline">Cancel</button>
                )}
              </div>
            </motion.div>
          ))}
          {subs.length === 0 && <div className="text-center py-24 text-[#1A1A1B]/30 font-body">No subscribers yet.</div>}
        </div>
      )}

      {/* Plan Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={e => e.target === e.currentTarget && setShowForm(false)}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }}
              className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-heading text-xl font-bold text-[#1A1A1B]">{editPlan ? "Edit Plan" : "New Plan"}</h2>
                <button onClick={() => setShowForm(false)} className="text-[#1A1A1B]/40 hover:text-[#1A1A1B]"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleSave} className="space-y-4">
                <div className="space-y-2">
                  <Label>Plan Name *</Label>
                  <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Starter" required className="h-11" />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Brief description..." className="h-11" />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label>Price/mo *</Label>
                    <Input type="number" min="0" step="0.01" value={form.monthly_price} onChange={e => setForm(f => ({ ...f, monthly_price: e.target.value }))} placeholder="9.99" required className="h-11" />
                  </div>
                  <div className="space-y-2">
                    <Label>Total Orders *</Label>
                    <Input type="number" min="1" value={form.order_threshold} onChange={e => setForm(f => ({ ...f, order_threshold: e.target.value }))} placeholder="8" required className="h-11" />
                  </div>
                  <div className="space-y-2">
                    <Label>Paid Orders *</Label>
                    <Input type="number" min="1" value={form.paid_orders} onChange={e => setForm(f => ({ ...f, paid_orders: e.target.value }))} placeholder="5" required className="h-11" />
                  </div>
                </div>
                <p className="text-xs text-[#1A1A1B]/40 font-body">
                  Free orders = Total orders - Paid orders
                  {form.order_threshold && form.paid_orders && ` = ${parseInt(form.order_threshold) - parseInt(form.paid_orders)} free orders`}
                </p>
                <div className="flex gap-3 pt-2">
                  <Button type="button" variant="outline" className="flex-1 h-11" onClick={() => setShowForm(false)}>Cancel</Button>
                  <Button type="submit" disabled={saving} className="flex-1 h-11 bg-[#1A1A1B] text-[#F9F7F2] hover:bg-[#1A1A1B]/90">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editPlan ? "Save" : "Create Plan"}
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
