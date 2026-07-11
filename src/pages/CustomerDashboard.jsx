import React, { useState, useEffect } from "react";
import { entities } from "@/api/apiClient";
import { Link } from "react-router-dom";
import { getShopConfig } from "@/lib/shopConfig";
import { Package, Loader2, Crown, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/AuthContext";

const STATUS_STYLES = {
  pending: { label: "Pending", class: "bg-yellow-100 text-yellow-700" },
  confirmed: { label: "Confirmed", class: "bg-blue-100 text-blue-700" },
  preparing: { label: "Preparing", class: "bg-orange-100 text-orange-700" },
  ready: { label: "Ready", class: "bg-green-100 text-green-700" },
  completed: { label: "Completed", class: "bg-[#1A1A1B]/5 text-[#1A1A1B]/60" },
  cancelled: { label: "Cancelled", class: "bg-red-100 text-red-700" },
};

export default function CustomerDashboard() {
  const { user, isAuthenticated, navigateToLogin } = useAuth();
  const [orders, setOrders] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) { navigateToLogin(); return; }
    const load = async () => {
      try {
        const [ords, subs] = await Promise.all([
          entities.Order.filter({ customer_email: user.email }, "-created_date", 50),
          entities.CustomerSubscription.filter({ customer_email: user.email, status: "active" }),
        ]);
        setOrders(ords);
        if (subs.length > 0) setSubscription(subs[0]);
      } catch { /* no orders yet */ }
      finally { setLoading(false); }
    };
    load();
  }, [isAuthenticated, user]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#1A1A1B]/20" /></div>;
  }

  const freeOrdersEarned = subscription ? Math.max(0, (subscription.orders_this_month || 0) - subscription.paid_orders) : 0;
  const thresholdReached = subscription && (subscription.orders_this_month || 0) >= subscription.paid_orders;

  return (
    <div className="min-h-screen max-w-5xl mx-auto px-6 lg:px-16 py-12">
      <div className="mb-10">
        <span className="font-display text-xs tracking-[0.3em] text-[#C5A059] uppercase">Dashboard</span>
        <h1 className="font-heading text-3xl lg:text-4xl font-bold text-[#1A1A1B] mt-2">
          Welcome{user?.full_name ? `, ${user.full_name}` : ""}
        </h1>
      </div>

      {/* Subscription Card */}
      {subscription ? (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className={`rounded-2xl p-6 lg:p-8 mb-10 border ${thresholdReached
            ? "bg-gradient-to-br from-[#C5A059]/10 to-[#C5A059]/5 border-[#C5A059]/30"
            : "bg-white border-[#1A1A1B]/5"}`}>
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Crown className="w-5 h-5 text-[#C5A059]" />
                <h3 className="font-heading text-xl font-bold text-[#1A1A1B]">{subscription.plan_name}</h3>
              </div>
              <p className="text-sm text-[#1A1A1B]/50 font-body">Active Membership</p>
            </div>
            {thresholdReached && (
              <span className="bg-[#C5A059] text-[#F9F7F2] text-xs font-display font-bold px-3 py-1 rounded-full animate-pulse">
                FREE ORDERS UNLOCKED
              </span>
            )}
          </div>

          <div className="flex items-center gap-8">
            <div className="relative w-28 h-28 shrink-0">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" stroke="#1A1A1B10" strokeWidth="8" />
                <circle cx="50" cy="50" r="42" fill="none"
                  stroke={thresholdReached ? "#C5A059" : "#1A1A1B"} strokeWidth="8" strokeLinecap="round"
                  strokeDasharray={`${Math.min(1, (subscription.orders_this_month || 0) / subscription.order_threshold) * 264} 264`} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-display text-2xl font-bold text-[#1A1A1B]">{subscription.orders_this_month || 0}</span>
                <span className="text-[10px] text-[#1A1A1B]/40 font-display">/ {subscription.order_threshold}</span>
              </div>
            </div>
            <div className="flex-1 space-y-2 text-sm font-body text-[#1A1A1B]/60">
              <p>Orders this month: <strong className="text-[#1A1A1B]">{subscription.orders_this_month || 0}</strong></p>
              <p>You pay for: <strong className="text-[#1A1A1B]">{subscription.paid_orders}</strong> orders</p>
              <p>Free orders earned: <strong className="text-[#C5A059]">{freeOrdersEarned}</strong></p>
              {!thresholdReached && (
                <p className="text-xs text-[#1A1A1B]/40">
                  {subscription.paid_orders - (subscription.orders_this_month || 0)} more orders until free orders kick in
                </p>
              )}
            </div>
          </div>
        </motion.div>
      ) : (
        <div className="rounded-2xl bg-[#1A1A1B] p-8 mb-10 text-center">
          <Crown className="w-8 h-8 text-[#C5A059] mx-auto mb-3" />
          <h3 className="font-heading text-xl font-bold text-[#F9F7F2] mb-2">Become a Member</h3>
          <p className="text-[#F9F7F2]/50 text-sm font-body mb-6 max-w-sm mx-auto">
            Subscribe to a plan and start earning free orders every month.
          </p>
          <Link to="/membership" className="inline-flex items-center gap-2 bg-[#C5A059] text-[#1A1A1B] px-6 py-3 rounded-full font-display text-sm font-semibold">
            View Plans <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      {/* Orders */}
      <div>
        <h2 className="font-heading text-xl font-bold text-[#1A1A1B] mb-6">Order History</h2>
        {orders.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl">
            <Package className="w-12 h-12 text-[#1A1A1B]/10 mx-auto mb-4" />
            <p className="text-[#1A1A1B]/40 font-body">No orders yet. Start exploring our kitchens!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order, i) => {
              const shopConfig = getShopConfig(order.shop);
              const status = STATUS_STYLES[order.status] || STATUS_STYLES.pending;
              return (
                <motion.div key={order.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  className="bg-white rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${shopConfig.color}12` }}>
                        <span className="font-heading text-sm font-bold" style={{ color: shopConfig.color }}>{order.shop.charAt(0)}</span>
                      </div>
                      <div>
                        <h4 className="font-heading text-sm font-semibold text-[#1A1A1B]">{order.shop}</h4>
                        <p className="text-xs text-[#1A1A1B]/40 font-display">
                          {new Date(order.created_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-[10px] font-display font-bold tracking-wider uppercase px-2.5 py-1 rounded-full ${status.class}`}>
                        {status.label}
                      </span>
                      <span className="font-display font-bold text-[#1A1A1B]">${Number(order.total).toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="text-xs text-[#1A1A1B]/50 font-body">
                    {(order.items || []).map(item => `${item.name} ×${item.quantity}`).join(", ")}
                  </div>
                  {order.is_free_order && (
                    <span className="inline-block mt-2 text-[10px] font-display font-bold text-[#C5A059] bg-[#C5A059]/10 px-2 py-0.5 rounded-full">
                      FREE ORDER
                    </span>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}