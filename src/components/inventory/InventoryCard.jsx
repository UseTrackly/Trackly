import React from 'react';
import { motion } from 'framer-motion';
import { Trash2, Pencil, Share2, MapPin, CreditCard, Shirt, Cpu, Trophy, Gamepad2, Watch, Tag, Camera } from 'lucide-react';
import { format } from 'date-fns';

const CONDITION_COLORS = {
  new: 'bg-green-500/10 text-green-500',
  like_new: 'bg-green-500/10 text-green-500',
  excellent: 'bg-primary/10 text-primary',
  good: 'bg-blue-500/10 text-blue-500',
  fair: 'bg-yellow-500/10 text-yellow-500',
  poor: 'bg-red-500/10 text-red-500',
};

const CATEGORY_META = {
  cards:       { icon: CreditCard, gradient: 'from-blue-900/80 to-indigo-900/80' },
  sneakers:    { icon: Trophy,     gradient: 'from-orange-900/80 to-red-900/80' },
  clothing:    { icon: Shirt,      gradient: 'from-purple-900/80 to-pink-900/80' },
  electronics: { icon: Cpu,        gradient: 'from-cyan-900/80 to-teal-900/80' },
  collectibles:{ icon: Trophy,     gradient: 'from-yellow-900/80 to-amber-900/80' },
  games:       { icon: Gamepad2,   gradient: 'from-green-900/80 to-emerald-900/80' },
  technology:  { icon: Cpu,        gradient: 'from-sky-900/80 to-blue-900/80' },
  vintage:     { icon: Watch,      gradient: 'from-stone-800/80 to-zinc-900/80' },
  other:       { icon: Tag,        gradient: 'from-gray-800/80 to-slate-900/80' },
};

export default function InventoryCard({ item, index, onEdit, onDelete, onPostToCommunity, onAddPhoto }) {
  const totalValue = (item.cost_basis || 0) * (item.quantity || 1);
  const potentialProfit = item.target_price ? (item.target_price - item.cost_basis) * (item.quantity || 1) : null;
  const meta = CATEGORY_META[item.category] || CATEGORY_META.other;
  const CategoryIcon = meta.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="bg-card border border-border rounded-xl overflow-hidden group cursor-pointer hover:border-primary/30 transition-colors"
    >
      {/* Photo hero — prominent when present, subtle prompt when not */}
      {item.image_url ? (
        <div className="relative w-full h-36">
          <img src={item.image_url} alt={item.item_name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          {/* Badges overlay */}
          <div className="absolute top-2 left-2 flex gap-1 flex-wrap">
            <span className="px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-sm text-white text-[9px] font-medium uppercase">{item.category}</span>
            {item.condition && (
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-medium ${CONDITION_COLORS[item.condition]} backdrop-blur-sm bg-black/40`}>
                {item.condition.replace('_', ' ')}
              </span>
            )}
          </div>
          {item.is_graded && item.grade && (
            <div className="absolute top-2 right-2">
              <span className="px-2 py-0.5 rounded-full bg-primary/90 text-primary-foreground text-[9px] font-bold">
                {item.grading_company} {item.grade}
              </span>
            </div>
          )}
        </div>
      ) : (
        /* No photo: intentional placeholder with category icon + add photo prompt */
        <button
          onClick={(e) => { e.stopPropagation(); onAddPhoto?.(item); }}
          className={`relative w-full h-32 bg-gradient-to-br ${meta.gradient} flex flex-col items-center justify-center gap-1.5 hover:opacity-90 transition-opacity`}
        >
          <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
            <CategoryIcon className="w-5 h-5 text-white/60" />
          </div>
          <span className="text-white/50 text-[9px] font-medium uppercase tracking-wider">{item.category}</span>
          <span className="flex items-center gap-1 text-[9px] text-white/60 border border-white/20 rounded-full px-2 py-0.5">
            <Camera className="w-2.5 h-2.5" /> Add photo
          </span>
        </button>
      )}

      {/* Card body */}
      <div className="p-3">
        {/* Item name — primary */}
        <h3 className="font-semibold text-sm leading-tight mb-2 truncate">{item.item_name}</h3>

        {/* Show category/condition only if no image (already shown in overlay above) */}
        {!item.image_url && (
          <div className="flex flex-wrap gap-1 mb-2">
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground capitalize">{item.category}</span>
            {item.condition && (
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${CONDITION_COLORS[item.condition]}`}>
                {item.condition.replace('_', ' ')}
              </span>
            )}
          </div>
        )}

        {/* Financial summary: Paid | Target | Profit — clean 3-column layout */}
        <div className="grid grid-cols-3 gap-1 mb-2">
          <div>
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider leading-none mb-0.5">Paid</p>
            <p className="text-xs font-semibold text-foreground">${totalValue.toFixed(0)}</p>
          </div>
          <div className="border-l border-border pl-2">
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider leading-none mb-0.5">Target</p>
            <p className="text-xs font-semibold text-foreground">
              {item.target_price ? `$${item.target_price.toFixed(0)}` : '—'}
            </p>
          </div>
          <div className="border-l border-border pl-2">
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider leading-none mb-0.5">Profit</p>
            <p className={`text-xs font-semibold ${potentialProfit !== null && potentialProfit > 0 ? 'text-primary' : 'text-muted-foreground'}`}>
              {potentialProfit !== null
                ? `${potentialProfit > 0 ? '+' : ''}$${potentialProfit.toFixed(0)}`
                : '—'}
            </p>
          </div>
        </div>

        {/* Subtle details row */}
        {(item.location || item.notes) && (
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground mb-2">
            {item.location && (
              <span className="flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5 shrink-0" />{item.location}</span>
            )}
            {item.notes && <span className="line-clamp-1 opacity-70">{item.notes}</span>}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-1 items-center">
          <button onClick={(e) => { e.stopPropagation(); onEdit?.(item); }} className="p-1.5 rounded-lg hover:bg-secondary transition-colors" title="Edit">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onDelete?.(item); }} className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive transition-colors" title="Delete">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onPostToCommunity?.(item); }} className="p-1.5 rounded-lg hover:bg-primary/10 text-primary transition-colors ml-auto" title="Post to Community">
            <Share2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}