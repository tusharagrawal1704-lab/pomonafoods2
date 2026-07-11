import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { auth, entities } from "@/api/apiClient";
import { useCart } from "@/lib/CartContext";
import { getShopConfig } from "@/lib/shopConfig";
import { Minus, Plus, Trash2, Tag, ArrowLeft, Loader2, ShoppingBag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/AuthContext";

export default function Cart() {
  const { items, updateQuantity, removeItem, clearCart, appliedCoupon, setAppliedCoupon, subtotal, discountAmount, total } = useCart();
  const { user, isAuthenticated } = useAuth();
  const [couponCode, setCouponCode] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState("");
  const [placing, setPlacing] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setCouponError("");
    try {
      const coupons = await entities.Coupon.filter({ code: couponCode.trim().toUpperCase(), is_active: true });
      if (coupons.length === 0) { setCouponError("Invalid or expired coupon code"); return; }
      const coupon = coupons[0];
      if (coupon.max_uses && coupon.times_used >= coupon.max_uses) { setCouponError("This coupon has reached its usage limit"); return; }
      if (coupon.expiry_date && new Date(coupon.expiry_date) < new Date()) { setCouponError("This coupon has expired"); return; }
      if (coupon.min_order_amount && subtotal < coupon.min_order_amount) { setCouponError(`Minimum order of $${coupon.min_order_amount.toFixed(2)} required`); return; }
      setAppliedCoupon(coupon);
      setCouponCode("");
    } catch { setCouponError("Could not verify coupon"); }
    finally { setCouponLoading(false); }
  };

  const placeOrder = async () => {
    if (items.length === 0) return;
    if (!isAuthenticated) { navigate("/login"); return; }
    setPlacing(true);
    try {
      const shopGroups = {};
      items.forEach(item => {
        if (!shopGroups[item.shop]) shopGroups[item.shop] = [];
        shopGroups[item.shop].push(item);
      });

      const subs = await entities.CustomerSubscription.filter({ customer_email: user.email, status: "active" });
      const sub = subs.length > 0 ? subs[0] : null;

      let currentOrderCount = sub?.orders_this_month || 0;
      let freeOrdersThisCheckout = 0;

      for (const [shop, shopItems] of Object.entries(shopGroups)) {
        const shopSubtotal = shopItems.reduce((s, i) => s + i.price * i.quantity, 0);
        const proportion = subtotal > 0 ? shopSubtotal / subtotal : 0;
        const shopDiscount = discountAmount * proportion;
        const isSubscriptionOrder = !!sub;
        const isFreeOrder = isSubscriptionOrder && currentOrderCount >= sub.paid_orders;

        await entities.Order.create({
          customer_name: user.full_name || user.email,
          customer_email: user.email,
          shop,
          items: shopItems,
          subtotal: shopSubtotal,
          discount_amount: isFreeOrder ? shopSubtotal : shopDiscount,
          total: isFreeOrder ? 0 : shopSubtotal - shopDiscount,
          coupon_code: appliedCoupon?.code || "",
          is_subscription_order: isSubscriptionOrder,
          is_free_order: isFreeOrder,
          status: "pending",
        });

        currentOrderCount += 1;
        if (isFreeOrder) freeOrdersThisCheckout += 1;
      }

      if (appliedCoupon) {
        await entities.Coupon.update(appliedCoupon.id, { times_used: (appliedCoupon.times_used || 0) + 1 });
      }
      if (sub) {
        await entities.CustomerSubscription.update(sub.id, {
          orders_this_month: currentOrderCount,
          free_orders_used: (sub.free_orders_used || 0) + freeOrdersThisCheckout,
        });
      }

      clearCart();
      const msg = freeOrdersThisCheckout > 0
        ? `Order placed! ${freeOrdersThisCheckout} free order(s) from your membership.`
        : "Order placed! Awaiting confirmation.";
      toast({ title: "Order Placed! 🎉", description: msg });
      navigate("/dashboard");
    } catch {
      toast({ title: "Error", description: "Could not place your order. Please try again.", variant: "destructive" });
    } finally { setPlacing(false); }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6">
        <ShoppingBag className="w-16 h-16 text-[#1A1A1B]/10 mb-6" />
        <h2 className="font-heading text-2xl font-bold text-[#1A1A1B] mb-2">Your cart is empty</h2>
        <p className="text-[#1A1A1B]/50 font-body mb-8">Explore our kitchens and add something delicious.</p>
        <Link to="/" className="inline-flex items-center gap-2 bg-[#1A1A1B] text-[#F9F7F2] px-6 py-3 rounded-full font-display text-sm font-semibold">
          Browse Kitchens
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen max-w-5xl mx-auto px-6 lg:px-16 py-12">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-[#1A1A1B]/50 hover:text-[#1A1A1B] font-display mb-8 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Continue Shopping
      </Link>
      <h1 className="font-heading text-3xl lg:text-4xl font-bold text-[#1A1A1B] mb-10">Your Order</h1>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
        {/* Cart Items */}
        <div className="lg:col-span-3 space-y-4">
          <AnimatePresence>
            {items.map(item => {
              const shopConfig = getShopConfig(item.shop);
              return (
                <motion.div key={item.item_id} layout initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                  className="flex items-center gap-5 bg-white rounded-2xl p-5 shadow-sm">
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${shopConfig.color}12` }}>
                    <span className="font-heading text-xl font-bold" style={{ color: shopConfig.color }}>{item.name.charAt(0)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-heading text-base font-semibold text-[#1A1A1B] truncate">{item.name}</h3>
                    <p className="text-xs text-[#1A1A1B]/40 font-display">{item.shop}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateQuantity(item.item_id, item.quantity - 1)} className="w-8 h-8 rounded-full border border-[#1A1A1B]/10 flex items-center justify-center hover:bg-[#1A1A1B]/5">
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-8 text-center font-display font-semibold text-sm">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.item_id, item.quantity + 1)} className="w-8 h-8 rounded-full border border-[#1A1A1B]/10 flex items-center justify-center hover:bg-[#1A1A1B]/5">
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  <span className="font-display font-bold text-[#1A1A1B] w-20 text-right">${(item.price * item.quantity).toFixed(2)}</span>
                  <button onClick={() => removeItem(item.item_id)} className="text-[#1A1A1B]/30 hover:text-red-500 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Summary */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl p-6 shadow-sm sticky top-24">
            <h3 className="font-heading text-lg font-semibold text-[#1A1A1B] mb-6">Order Summary</h3>

            {/* Coupon */}
            <div className="mb-6">
              {appliedCoupon ? (
                <div className="flex items-center gap-2 bg-[#C5A059]/10 px-4 py-3 rounded-xl">
                  <Tag className="w-4 h-4 text-[#C5A059]" />
                  <span className="font-display text-sm font-semibold text-[#C5A059] flex-1">{appliedCoupon.code}</span>
                  <button onClick={() => setAppliedCoupon(null)}><X className="w-4 h-4 text-[#1A1A1B]/40" /></button>
                </div>
              ) : (
                <div>
                  <div className="flex gap-2">
                    <Input value={couponCode} onChange={e => setCouponCode(e.target.value)} placeholder="Coupon code"
                      className="bg-[#F9F7F2] border-none font-display text-sm"
                      onKeyDown={e => e.key === 'Enter' && applyCoupon()} />
                    <Button onClick={applyCoupon} disabled={couponLoading} variant="outline" className="font-display text-sm shrink-0">
                      {couponLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply"}
                    </Button>
                  </div>
                  {couponError && <p className="text-xs text-red-500 mt-2">{couponError}</p>}
                </div>
              )}
            </div>

            <div className="space-y-3 text-sm font-body">
              <div className="flex justify-between text-[#1A1A1B]/60"><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-[#C5A059]"><span>Discount</span><span>-${discountAmount.toFixed(2)}</span></div>
              )}
              <div className="border-t border-[#1A1A1B]/5 pt-3 flex justify-between">
                <span className="font-heading text-lg font-bold text-[#1A1A1B]">Total</span>
                <span className="font-heading text-lg font-bold text-[#1A1A1B]">${total.toFixed(2)}</span>
              </div>
            </div>

            {!isAuthenticated && (
              <p className="text-xs text-[#1A1A1B]/50 mt-4 text-center">
                <Link to="/login" className="text-[#C5A059] font-semibold hover:underline">Log in</Link> to place your order
              </p>
            )}

            <Button onClick={placeOrder} disabled={placing || !isAuthenticated}
              className="w-full mt-6 bg-[#1A1A1B] text-[#F9F7F2] hover:bg-[#1A1A1B]/90 font-display h-12 rounded-xl text-sm">
              {placing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Place Order"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}