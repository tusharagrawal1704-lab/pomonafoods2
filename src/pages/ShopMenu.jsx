import React, { useState, useEffect, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { entities } from "@/api/apiClient";
import { getShopConfig } from "@/lib/shopConfig";
import { useCart } from "@/lib/CartContext";
import MenuItemCard from "@/components/menu/MenuItemCard";
import { ShoppingBag, ArrowLeft, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

export default function ShopMenu() {
  const { shopName } = useParams();
  const decoded = decodeURIComponent(shopName);
  const shopConfig = getShopConfig(decoded);
  const { itemCount } = useCart();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("All");

  useEffect(() => {
    setLoading(true);
    entities.MenuItem.filter({ shop: decoded })
      .then(setItems)
      .finally(() => setLoading(false));
  }, [decoded]);

  const categories = useMemo(() => {
    const cats = [...new Set(items.map(i => i.category))];
    return ["All", ...cats];
  }, [items]);

  const filteredItems = activeCategory === "All" ? items : items.filter(i => i.category === activeCategory);

  return (
    <div className="min-h-screen">
      {/* Shop Header */}
      <section className="relative py-20 lg:py-28" style={{ backgroundColor: `${shopConfig.color}10` }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-16">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-[#1A1A1B]/50 hover:text-[#1A1A1B] font-display mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" /> All Kitchens
          </Link>
          <div className="flex items-end justify-between">
            <div>
              <span className="font-display text-xs tracking-[0.3em] uppercase" style={{ color: shopConfig.color }}>
                The Kitchen
              </span>
              <h1 className="font-heading text-4xl lg:text-6xl font-bold text-[#1A1A1B] mt-2">{decoded}</h1>
              <p className="text-[#1A1A1B]/50 mt-3 text-lg font-body max-w-md">{shopConfig.description}</p>
            </div>
            {itemCount > 0 && (
              <Link to="/cart"
                className="hidden md:flex items-center gap-2 px-6 py-3 rounded-full text-sm font-display font-semibold text-white transition-colors"
                style={{ backgroundColor: shopConfig.color }}>
                <ShoppingBag className="w-4 h-4" />
                View Cart ({itemCount})
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Category Nav */}
      <div className="sticky top-16 lg:top-20 z-40 bg-[#F9F7F2]/95 backdrop-blur-xl border-b border-[#1A1A1B]/5">
        <div className="max-w-7xl mx-auto px-6 lg:px-16">
          <div className="flex items-center gap-1 overflow-x-auto py-4 scrollbar-hide">
            {categories.map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)}
                className="px-4 py-2 rounded-full text-sm font-display font-medium whitespace-nowrap transition-all"
                style={activeCategory === cat
                  ? { backgroundColor: shopConfig.color, color: "#F9F7F2" }
                  : { color: "#1A1A1B80" }}>
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Menu Grid */}
      <section className="max-w-7xl mx-auto px-6 lg:px-16 py-12">
        {loading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-[#1A1A1B]/20" />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-[#1A1A1B]/40 font-body text-lg">No items available in this category yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {filteredItems.map(item => <MenuItemCard key={item.id} item={item} />)}
          </div>
        )}
      </section>

      {/* Mobile Cart Button */}
      {itemCount > 0 && (
        <motion.div initial={{ y: 100 }} animate={{ y: 0 }} className="fixed bottom-6 left-6 right-6 md:hidden z-50">
          <Link to="/cart"
            className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl text-white font-display font-semibold shadow-2xl"
            style={{ backgroundColor: shopConfig.color }}>
            <ShoppingBag className="w-5 h-5" />
            View Cart ({itemCount})
          </Link>
        </motion.div>
      )}
    </div>
  );
}