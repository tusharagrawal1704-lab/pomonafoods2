import React, { useState, useEffect } from "react";
import { entities, auth } from "@/api/apiClient";
import { Crown, Check, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/AuthContext";

export default function Membership() {
  const { user, isAuthenticated } = useAuth();
  const [plans, setPlans] = useState([]);
  const [currentSub, setCurrentSub] = useState(null);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    const load = async () => {
      try {
        const allPlans = await entities.SubscriptionPlan.filter({ is_active: true });
        setPlans(allPlans);
        if (isAuthenticated && user) {
          const subs = await entities.CustomerSubscription.filter({ customer_email: user.email, status: "active" });
          if (subs.length > 0) setCurrentSub(subs[0]);
        }
      } catch { /* noop */ }
      finally { setLoading(false); }
    };
    load();
  }, [isAuthenticated, user]);

  const subscribe = async (plan) => {
    if (!isAuthenticated) { window.location.href = '/login'; return; }
    setSubscribing(plan.id);
    try {
      const today = new Date();
      const renewalDate = new Date(today);
      renewalDate.setMonth(renewalDate.getMonth() + 1);

      if (currentSub) {
        await entities.CustomerSubscription.update(currentSub.id, {
          plan_id: plan.id, plan_name: plan.name,
          order_threshold: plan.order_threshold, paid_orders: plan.paid_orders,
          orders_this_month: 0, free_orders_used: 0,
          renewal_date: renewalDate.toISOString().split("T")[0],
        });
      } else {
        await entities.CustomerSubscription.create({
          customer_email: user.email, customer_name: user.full_name || user.email,
          plan_id: plan.id, plan_name: plan.name,
          order_threshold: plan.order_threshold, paid_orders: plan.paid_orders,
          start_date: today.toISOString().split("T")[0],
          renewal_date: renewalDate.toISOString().split("T")[0],
        });
      }
      toast({ title: "Subscribed! 🎉", description: `You're now on the ${plan.name} plan.` });
      const subs = await entities.CustomerSubscription.filter({ customer_email: user.email, status: "active" });
      if (subs.length > 0) setCurrentSub(subs[0]);
    } catch {
      toast({ title: "Error", description: "Could not subscribe. Please try again.", variant: "destructive" });
    } finally { setSubscribing(null); }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#1A1A1B]/20" /></div>;
  }

  return (
    <div className="min-h-screen max-w-5xl mx-auto px-6 lg:px-16 py-12">
      <div className="text-center mb-16">
        <span className="font-display text-xs tracking-[0.3em] text-[#C5A059] uppercase">Membership</span>
        <h1 className="font-heading text-3xl lg:text-5xl font-bold text-[#1A1A1B] mt-3">Order More, Pay Less</h1>
        <p className="text-[#1A1A1B]/50 mt-4 max-w-lg mx-auto text-lg font-body leading-relaxed">
          Choose a monthly plan. Once you hit the order threshold, your remaining orders that month are on the house.
        </p>
      </div>

      {plans.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl">
          <Crown className="w-12 h-12 text-[#1A1A1B]/10 mx-auto mb-4" />
          <p className="text-[#1A1A1B]/40 font-body">No membership plans available right now. Check back soon!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan, i) => {
            const isCurrent = currentSub?.plan_id === plan.id;
            const freeOrders = plan.order_threshold - plan.paid_orders;
            return (
              <motion.div key={plan.id} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                className={`rounded-2xl p-8 border transition-all ${isCurrent
                  ? "bg-gradient-to-br from-[#C5A059]/10 to-[#C5A059]/5 border-[#C5A059]/30 shadow-lg"
                  : "bg-white border-[#1A1A1B]/5 hover:shadow-lg hover:border-[#C5A059]/20"}`}>
                {isCurrent && (
                  <span className="inline-flex items-center gap-1 bg-[#C5A059] text-[#F9F7F2] text-[10px] font-display font-bold px-3 py-1 rounded-full mb-4">
                    <Sparkles className="w-3 h-3" /> CURRENT PLAN
                  </span>
                )}
                <h3 className="font-heading text-xl font-bold text-[#1A1A1B]">{plan.name}</h3>
                {plan.description && <p className="text-sm text-[#1A1A1B]/50 font-body mt-2 leading-relaxed">{plan.description}</p>}
                <div className="mt-6 mb-6">
                  <span className="font-heading text-4xl font-bold text-[#1A1A1B]">${plan.monthly_price}</span>
                  <span className="text-[#1A1A1B]/40 font-body text-sm"> /month</span>
                </div>
                <div className="space-y-3 mb-8">
                  {[
                    `Order up to ${plan.order_threshold} times per month`,
                    `Pay for only ${plan.paid_orders} orders`,
                  ].map((text, j) => (
                    <div key={j} className="flex items-center gap-2 text-sm font-body text-[#1A1A1B]/70">
                      <Check className="w-4 h-4 text-[#C5A059] shrink-0" />{text}
                    </div>
                  ))}
                  <div className="flex items-center gap-2 text-sm font-body text-[#C5A059] font-semibold">
                    <Check className="w-4 h-4 shrink-0" />{freeOrders} free orders every month
                  </div>
                </div>
                <Button onClick={() => subscribe(plan)} disabled={isCurrent || subscribing === plan.id}
                  className={`w-full h-12 rounded-xl font-display text-sm ${isCurrent
                    ? "bg-[#1A1A1B]/10 text-[#1A1A1B]/40"
                    : "bg-[#1A1A1B] text-[#F9F7F2] hover:bg-[#1A1A1B]/90"}`}>
                  {subscribing === plan.id ? <Loader2 className="w-4 h-4 animate-spin" />
                    : isCurrent ? "Current Plan"
                    : currentSub ? "Switch Plan" : "Subscribe"}
                </Button>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}