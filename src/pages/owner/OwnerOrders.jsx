import React, { useState, useEffect } from "react";
import { entities } from "@/api/apiClient";
import { Loader2, ChevronDown } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { motion } from "framer-motion";

const STATUSES = ["pending", "confirmed", "preparing", "ready", "completed", "cancelled"];
const STATUS_STYLES = {
  pending: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-blue-100 text-blue-700",
  preparing: "bg-orange-100 text-orange-700",
  ready: "bg-green-100 text-green-700",
  completed: "bg-[#1A1A1B]/5 text-[#1A1A1B]/60",
  cancelled: "bg-red-100 text-red-700",
};
const SHOPS = ["All", "Sandwich Corner", "Breakfast Bistro", "NYC Burger"];
const SHOP_COLORS = { "Sandwich Corner": "#7D8471", "Breakfast Bistro": "#D98E73", "NYC Burger": "#4A3728" };

export default function OwnerOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeShop, setActiveShop] = useState("All");
  const [activeStatus, setActiveStatus] = useState("All");
  const [updatingId, setUpdatingId] = useState(null);
  const { toast } = useToast();

  const reload = async () => {
    setLoading(true);
    try { setOrders(await entities.Order.filter({}, "-created_date", 200)); }
    finally { setLoading(false); }
  };

  useEffect(() => { reload(); }, []);

  const updateStatus = async (order, newStatus) => {
    setUpdatingId(order.id);
    try {
      await entities.Order.update(order.id, { status: newStatus });
      setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: newStatus } : o));
      toast({ title: "Status updated", description: `Order marked as ${newStatus}` });
    } catch { toast({ title: "Error", variant: "destructive" }); }
    finally { setUpdatingId(null); }
  };

  const filtered = orders.filter(o => {
    if (activeShop !== "All" && o.shop !== activeShop) return false;
    if (activeStatus !== "All" && o.status !== activeStatus) return false;
    return true;
  });

  return (
    <div className="min-h-screen max-w-7xl mx-auto px-6 lg:px-16 py-12">
      <div className="mb-10">
        <span className="font-display text-xs tracking-[0.3em] text-[#C5A059] uppercase">Owner Portal</span>
        <h1 className="font-heading text-3xl lg:text-4xl font-bold text-[#1A1A1B] mt-2">Orders</h1>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-8">
        <div className="flex gap-1 bg-white rounded-xl p-1 shadow-sm">
          {SHOPS.map(shop => (
            <button key={shop} onClick={() => setActiveShop(shop)}
              className="px-3 py-1.5 rounded-lg text-xs font-display font-medium transition-all"
              style={activeShop === shop ? { backgroundColor: shop === "All" ? "#1A1A1B" : SHOP_COLORS[shop], color: "#F9F7F2" } : { color: "#1A1A1B60" }}>
              {shop === "All" ? "All Shops" : shop.split(" ")[0]}
            </button>
          ))}
        </div>
        <div className="flex gap-1 bg-white rounded-xl p-1 shadow-sm">
          {["All", ...STATUSES].map(s => (
            <button key={s} onClick={() => setActiveStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-display font-medium capitalize transition-all ${
                activeStatus === s ? "bg-[#1A1A1B] text-[#F9F7F2]" : "text-[#1A1A1B60]"}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-[#1A1A1B]/20" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-24 text-[#1A1A1B]/30 font-body">No orders found.</div>
      ) : (
        <div className="space-y-3">
          {filtered.map((order, i) => {
            const color = SHOP_COLORS[order.shop] || "#1A1A1B";
            return (
              <motion.div key={order.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                className="bg-white rounded-2xl p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}15` }}>
                      <span className="font-heading text-sm font-bold" style={{ color }}>{order.shop.charAt(0)}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-heading text-sm font-semibold text-[#1A1A1B]">{order.customer_name || order.customer_email}</h4>
                        {order.is_free_order && (
                          <span className="text-[9px] font-display font-bold text-[#C5A059] bg-[#C5A059]/10 px-1.5 py-0.5 rounded-full">FREE</span>
                        )}
                      </div>
                      <p className="text-xs text-[#1A1A1B]/40 font-display">
                        {order.shop} · {new Date(order.created_date).toLocaleString()}
                      </p>
                      <p className="text-xs text-[#1A1A1B]/50 font-body mt-1">
                        {(order.items || []).map(it => `${it.name} ×${it.quantity}`).join(", ")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-display font-bold text-[#1A1A1B]">${Number(order.total).toFixed(2)}</span>
                    <div className="relative">
                      <select value={order.status} disabled={updatingId === order.id}
                        onChange={e => updateStatus(order, e.target.value)}
                        className={`appearance-none pl-3 pr-8 py-1.5 rounded-full text-xs font-display font-bold uppercase cursor-pointer border-none focus:ring-2 focus:ring-[#C5A059] ${STATUS_STYLES[order.status]}`}>
                        {STATUSES.map(s => <option key={s} value={s} className="normal-case font-normal">{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none" />
                    </div>
                    {updatingId === order.id && <Loader2 className="w-4 h-4 animate-spin text-[#C5A059]" />}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
