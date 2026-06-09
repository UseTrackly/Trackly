import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

import { motion } from 'framer-motion';
import { Heart, MessageCircle, MapPin, Crown, TrendingUp, Users, Package, CreditCard, Shirt, Cpu, Trophy, Gamepad2, Watch, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import EmptyState from '@/components/shared/EmptyState';
import ProfileLink from '@/components/shared/ProfileLink';

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

function FlipCard({ flip, user, onInterest, onClick, priority, profiles }) {
  const isInterested = flip.interested_users?.includes(user?.email);
  const interestCount = flip.interested_users?.length || 0;

  const posterProfile = profiles?.find(p => p.user_email === flip.posted_by);
  const displayName = posterProfile?.display_name || posterProfile?.username || flip.posted_by_name;
  const username = posterProfile?.username;

  const meta = CATEGORY_META[flip.category] || CATEGORY_META.other;
  const CategoryIcon = meta.icon;
  const hasImage = !!flip.image_url;
  const hasGrade = !!(flip.grade && flip.grading_company);

  if (hasImage) {
    // Photo listing — product is the hero
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border rounded-xl overflow-hidden cursor-pointer"
        onClick={() => onClick(flip)}
      >
        {/* Full-bleed image with overlay */}
        <div className="relative w-full aspect-square">
          <img src={flip.image_url} alt={flip.item_name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
          {/* Price pill — bottom left over image */}
          <div className="absolute bottom-2 left-2">
            <span className="px-2 py-0.5 rounded-full bg-black/80 backdrop-blur-sm text-white text-xs font-bold">
              ${flip.price?.toFixed(0)}
            </span>
          </div>
          {/* HOT badge */}
          {priority && (
            <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded-full bg-orange-500 text-white text-[8px] font-bold uppercase">HOT</span>
          )}
          {/* Grade badge */}
          {hasGrade && (
            <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded-full bg-primary/90 text-white text-[8px] font-medium">
              {flip.grading_company} {flip.grade}
            </span>
          )}
        </div>

        {/* Below image: title, seller, actions */}
        <div className="p-2.5 space-y-1.5">
          <h3 className="font-semibold text-sm leading-tight line-clamp-2">{flip.item_name}</h3>
          <div className="flex items-center justify-between">
            <ProfileLink userEmail={flip.posted_by} username={username} userName={displayName}>
              <p className="text-[9px] text-muted-foreground truncate max-w-[80px]">{displayName}</p>
            </ProfileLink>
            {flip.location && (
              <span className="flex items-center gap-0.5 text-[8px] text-muted-foreground truncate">
                <MapPin className="w-2 h-2 shrink-0" />{flip.location}
              </span>
            )}
          </div>
          <div className="flex gap-1.5">
            <Button
              variant={isInterested ? "default" : "outline"}
              size="sm"
              onClick={(e) => { e.stopPropagation(); onInterest(flip.id); }}
              className="flex-1 h-7 text-[10px]"
            >
              <Heart className={`w-3 h-3 mr-0.5 ${isInterested ? 'fill-current' : ''}`} />
              {interestCount > 0 ? interestCount : 'Want'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => { e.stopPropagation(); onClick(flip); }}
              className="h-7 w-7 p-0 shrink-0"
            >
              <MessageCircle className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </motion.div>
    );
  }

  // Text-only listing — compact, no wasted space
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-xl overflow-hidden cursor-pointer"
      onClick={() => onClick(flip)}
    >
      <div className={`w-full h-1 bg-gradient-to-r ${meta.gradient}`} />
      <div className="px-3 py-2.5 flex items-center gap-3">
        <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${meta.gradient} flex items-center justify-center shrink-0`}>
          <CategoryIcon className="w-4 h-4 text-white/60" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm leading-tight line-clamp-1">{flip.item_name}</h3>
          <div className="flex items-center gap-2 mt-0.5">
            <ProfileLink userEmail={flip.posted_by} username={username} userName={displayName}>
              <p className="text-[9px] text-muted-foreground truncate">{displayName}</p>
            </ProfileLink>
            {flip.location && (
              <span className="flex items-center gap-0.5 text-[8px] text-muted-foreground">
                <MapPin className="w-2 h-2 shrink-0" />{flip.location}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <p className="text-base font-bold">${flip.price?.toFixed(0)}</p>
          <Button
            variant={isInterested ? "default" : "outline"}
            size="sm"
            onClick={(e) => { e.stopPropagation(); onInterest(flip.id); }}
            className="h-7 px-2"
          >
            <Heart className={`w-3 h-3 ${isInterested ? 'fill-current' : ''}`} />
            {interestCount > 0 && <span className="ml-0.5 text-[10px]">{interestCount}</span>}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

function FlipGrid({ flips, user, onInterest, onFlipClick, profiles, showPriority = false }) {
  const photoFlips = flips.filter(f => !!f.image_url);
  const textFlips = flips.filter(f => !f.image_url);

  return (
    <div className="space-y-2">
      {/* Photo listings in 2-col grid */}
      {photoFlips.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {photoFlips.map((flip, i) => (
            <FlipCard key={flip.id} flip={flip} user={user} onInterest={onInterest} onClick={onFlipClick} priority={showPriority && i < 3} profiles={profiles} />
          ))}
        </div>
      )}
      {/* Text-only listings as full-width rows */}
      {textFlips.map((flip) => (
        <FlipCard key={flip.id} flip={flip} user={user} onInterest={onInterest} onClick={onFlipClick} profiles={profiles} />
      ))}
    </div>
  );
}

export default function CommunityFeed({ user, flips, activeTab, onPostFlip, onFlipClick, onInterest }) {
  const feedTab = activeTab || 'discover';

  // Fetch profiles for display name resolution
  const { data: profiles } = useQuery({
    queryKey: ['allProfiles'],
    queryFn: () => base44.entities.UserProfile.list('-created_date', 500),
    initialData: [],
  });



  const { data: myProfile } = useQuery({
    queryKey: ['myProfile', user?.email],
    queryFn: () => base44.entities.UserProfile.filter({ user_email: user?.email }, '-created_date', 1).then(r => r?.[0] ?? null),
    enabled: !!user?.email,
  });

  const followingEmails = myProfile?.following || [];

  const filteredFlips = useMemo(() => {
    if (!Array.isArray(flips)) return [];

    switch (feedTab) {
      case 'following':
        return flips.filter(f => followingEmails.includes(f.posted_by));
      case 'market':
        return [...flips].sort((a, b) => (b.interested_users?.length || 0) - (a.interested_users?.length || 0));
      case 'alerts':
        // Show flips the user has expressed interest in
        return flips.filter(f => f.interested_users?.includes(user?.email));
      case 'discover':
      default:
        const userCats = user?.selected_categories || [];
        return [...flips].sort((a, b) => {
          const aMatch = userCats.includes(a.category);
          const bMatch = userCats.includes(b.category);
          const aEngagement = a.interested_users?.length || 0;
          const bEngagement = b.interested_users?.length || 0;
          if (aMatch && !bMatch) return -1;
          if (!aMatch && bMatch) return 1;
          return bEngagement - aEngagement;
        });
    }
  }, [flips, feedTab, user, followingEmails]);

  const trendingCollectors = useMemo(() => {
    if (!Array.isArray(flips)) return [];
    const userScores = new Map();
    flips.forEach(flip => {
      const email = flip.posted_by;
      const score = (flip.interested_users?.length || 0) + 1;
      userScores.set(email, (userScores.get(email) || 0) + score);
    });
    return Array.from(userScores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([email, score]) => {
        const profile = profiles.find(p => p.user_email === email);
        return { 
          email, 
          name: profile?.display_name || profile?.username || 'User', 
          username: profile?.username,
          avatar: profile?.avatar_url, 
          score 
        };
      });
  }, [flips, profiles]);

  const requireAuth = () => {
    if (!user) {
      base44.auth.redirectToLogin(window.location.href);
      return false;
    }
    return true;
  };

  return (
    <div className="space-y-4 pb-24">
      {feedTab === 'discover' && (
        <>
          {trendingCollectors.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold">Trending Collectors</h3>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2 -mx-3 px-3">
                {trendingCollectors.map((collector) => (
                  <div key={collector.email} className="shrink-0 w-20 text-center">
                    <ProfileLink userEmail={collector.email} username={collector.username} userName={collector.name}>
                      <div className="w-14 h-14 rounded-full overflow-hidden bg-secondary border-2 border-border mx-auto mb-1">
                        {collector.avatar ? (
                          <img src={collector.avatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-lg font-bold text-muted-foreground">
                            {(collector.name || '?')[0]?.toUpperCase()}
                          </div>
                        )}
                      </div>
                    </ProfileLink>
                    <p className="text-[10px] font-medium truncate">{collector.name}</p>
                    <p className="text-[9px] text-muted-foreground">{collector.score} engaged</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {filteredFlips.length === 0 ? (
            <EmptyState
              icon={Package}
              title="No flips yet"
              description="Be the first to share a flip opportunity."
              action={
                <Button onClick={() => requireAuth() && onPostFlip()} className="bg-primary hover:bg-primary/90">
                  Post Your First Flip
                </Button>
              }
            />
          ) : (
            <FlipGrid flips={filteredFlips} user={user} onInterest={onInterest} onFlipClick={onFlipClick} profiles={profiles} showPriority />
          )}
        </>
      )}

      {feedTab === 'following' && (
        <>
          {followingEmails.length === 0 ? (
            <EmptyState icon={Users} title="Not following anyone yet" description="Follow collectors to see their flips here." />
          ) : filteredFlips.length === 0 ? (
            <EmptyState icon={Package} title="No flips from followed collectors" description="Your followed collectors haven't shared any flips yet." />
          ) : (
            <FlipGrid flips={filteredFlips} user={user} onInterest={onInterest} onFlipClick={onFlipClick} profiles={profiles} />
          )}
        </>
      )}

      {feedTab === 'market' && (
        <>
          {filteredFlips.length === 0 ? (
            <EmptyState icon={Package} title="No market activity" description="Check back later for market updates." />
          ) : (
            <FlipGrid flips={filteredFlips} user={user} onInterest={onInterest} onFlipClick={onFlipClick} profiles={profiles} />
          )}
        </>
      )}

      {feedTab === 'alerts' && (
        <>
          {filteredFlips.length === 0 ? (
            <EmptyState icon={MessageCircle} title="No alerts yet" description="Express interest in flips to get updates." />
          ) : (
            <FlipGrid flips={filteredFlips} user={user} onInterest={onInterest} onFlipClick={onFlipClick} profiles={profiles} />
          )}
        </>
      )}
    </div>
  );
}