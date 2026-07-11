import React, { useState, useEffect } from "react";
import { entities } from "@/api/apiClient";
import { ShoppingBag, Users, Tag, TrendingUp, DollarSign, Clock, CheckCircle2, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const SHOPS = ["Sandwich Corner", "Breakfast Bistro", "NYC Burger"];
const SHOP_COLORS = { "Sandwich Corner": "#7D8471", "Breakfast Bistro": "#D98E73", "NYC Burger": "#4A3728" };

export default function OwnerDashboard() {
  const [orders, setOrders] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [ords, subs] = await Promise.all([
          entities.Order.filter({}, "-created_date", 500),
          entities.CustomerSubscription.filter({ status: "active" }),
        ]);
        setOrders(ords);
        setSubscriptions(subs);
      } catch { /* noop */ }
      finally { setLoading(false); }
    };
    load();
  }, []);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#1A1A1B]/20" /></div>;
  }

  const totalRevenue = orders.reduce((s, o) => s + (Number(o.total) || 0), 0);
  const pendingOrders = orders.filter(o => o.status === "pending").length;
  const completedOrders = orders.filter(o => o.status === "completed").length;

  const shopData = SHOPS.map(shop => ({
    name: shop.split(" ")[0],
    orders: orders.filter(o => o.shop === shop).length,
    revenue: orders.filter(o => o.shop === shop).reduce((s, o) => s + (Number(o.total) || 0), 0),
    color: SHOP_COLORS[shop],
  }));

  // Last 7 days trend
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const label = d.toLocaleDateString("en-US", { weekday: "short" });
    const count = orders.filter(o => new Date(o.created_date).toDateString() === d.toDateString()).length;
    return { day: label, orders: count };
  });

  const stats = [
    { label: "Total Revenue", value: `$${totalRevenue.toFixed(2)}`, icon: DollarSign, color: "#C5A059" },
    { label: "Total Orders", value: orders.length, icon: ShoppingBag, color: "#7D8471" },
    { label: "Active Members", value: subscriptions.length, icon: Users, color: "#D98E73" },
    { label: "Pending Orders", value: pendingOrders, icon: Clock, color: "#4A3728" },
  ];

  return (
    <div className="min-h-screen max-w-7xl mx-auto px-6 lg:px-16 py-12">
      <div className="mb-10">
        <span className="font-display text-xs tracking-[0.3em] text-[#C5A059] uppercase">Owner Portal</span>
        <h1 className="font-heading text-3xl lg:text-4xl font-bold text-[#1A1A1B] mt-2">Dashboard</h1>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {stats.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
            className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-display text-[#1A1A1B]/50">{s.label}</span>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${s.color}15` }}>
                <s.icon className="w-4 h-4" style={{ color: s.color }} />
              </div>
            </div>
            <span className="font-heading text-2xl font-bold text-[#1A1A1B]">{s.value}</span>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Orders per Shop */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h3 className="font-heading text-lg font-semibold text-[#1A1A1B] mb-6">Orders by Kitchen</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={shopData} barSize={32}>
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontFamily: "sans-serif" }} />
              <YAxis hide />
              <Tooltip formatter={(v, n) => [v, n === "orders" ? "Orders" : "Revenue"]} cursor={{ fill: "#f5f5f5" }} />
              <Bar dataKey="orders" radius={[8, 8, 0, 0]}>
                {shopData.map((s, i) => <Cell key={i} fill={s.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 7-day trend */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h3 className="font-heading text-lg font-semibold text-[#1A1A1B] mb-6">Orders This Week</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={last7} barSize={32}>
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
              <YAxis hide />
              <Tooltip formatter={(v) => [v, "Orders"]} cursor={{ fill: "#f5f5f5" }} />
              <Bar dataKey="orders" fill="#C5A059" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h3 className="font-heading text-lg font-semibold text-[#1A1A1B] mb-6">Recent Orders</h3>
        <div className="space-y-3">
          {orders.slice(0, 8).map(order => (
            <div key={order.id} className="flex items-center justify-between py-3 border-b border-[#1A1A1B]/5 last:border-0">
              <div>
                <p className="font-heading text-sm font-semibold text-[#1A1A1B]">{order.customer_name || order.customer_email}</p>
                <p className="text-xs text-[#1A1A1B]/40 font-display">{order.shop} · {new Date(order.created_date).toLocaleDateString()}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-[10px] font-display font-bold uppercase px-2 py-0.5 rounded-full ${
                  order.status === 'completed' ? 'bg-green-100 text-green-700' :
                  order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-blue-100 text-blue-700'}`}>{order.status}</span>
                <span className="font-display font-bold text-sm text-[#1A1A1B]">${Number(order.total).toFixed(2)}</span>
              </div>
            </div>
          ))}
          {orders.length === 0 && <p className="text-center text-[#1A1A1B]/40 font-body py-8">No orders yet.</p>}
        </div>
      </div>
    </div>
  );
}
