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

  // Get profile data for consistent display name
  const posterProfile = profiles?.find(p => p.user_email === flip.posted_by);
  const displayName = posterProfile?.display_name || posterProfile?.username || flip.posted_by_name;
  const username = posterProfile?.username;

  const meta = CATEGORY_META[flip.category] || CATEGORY_META.other;
  const CategoryIcon = meta.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-lg overflow-hidden"
      onClick={() => onClick(flip)}
    >
      {/* Image or placeholder */}
      <div className="relative">
        {flip.image_url ? (
          <img src={flip.image_url} alt={flip.item_name} className="w-full h-20 object-cover" />
        ) : (
          <div className={`w-full h-20 bg-gradient-to-br ${meta.gradient} flex flex-col items-center justify-center gap-1`}>
            <CategoryIcon className="w-6 h-6 text-white/60" />
            <span className="text-white/40 text-[9px] font-medium uppercase tracking-wider">{flip.category}</span>
          </div>
        )}
        <div className="absolute top-1.5 left-1.5 flex gap-1">
          <span className="px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-sm text-white text-[8px] font-medium uppercase">
            {flip.category}
          </span>
          {priority && (
            <span className="px-2 py-0.5 rounded-full bg-orange-500/90 backdrop-blur-sm text-white text-[8px] font-bold uppercase">
              HOT
            </span>
          )}
        </div>
        <ProfileLink
          userEmail={flip.posted_by}
          username={username}
          userName={displayName}
          className="absolute top-1.5 right-1.5"
        >
          <span className="px-1.5 py-0.5 rounded-full bg-black/70 backdrop-blur-sm text-white text-[8px] font-medium hover:opacity-80">
            {displayName?.[0] || 'U'}
          </span>
        </ProfileLink>
      </div>

      <div className="p-2 space-y-1">
        <div className="flex items-center gap-1">
          <ProfileLink userEmail={flip.posted_by} username={username} userName={displayName}>
            <p className="text-[8px] text-muted-foreground hover:text-foreground truncate">
              {displayName}
            </p>
          </ProfileLink>
          {flip.is_poster_pro && <Crown className="w-2.5 h-2.5 text-primary shrink-0" />}
        </div>

        <h3 className="font-bold text-xs leading-tight truncate">{flip.item_name}</h3>
        {flip.description && <p className="text-[10px] text-muted-foreground line-clamp-2">{flip.description}</p>}

        <div className="flex items-center justify-between pt-0.5">
          <p className="text-sm font-bold">${flip.price?.toFixed(0)}</p>
          {flip.grade && flip.grading_company && (
            <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
              {flip.grading_company} {flip.grade}
            </span>
          )}
        </div>

        {(flip.location || flip.condition) && (
          <div className="flex items-center gap-2 text-[8px] text-muted-foreground">
            {flip.condition && <span className="capitalize">{flip.condition.replace('_', ' ')}</span>}
            {flip.location && (
              <span className="flex items-center gap-0.5">
                <MapPin className="w-2 h-2 shrink-0" />{flip.location}
              </span>
            )}
          </div>
        )}

        <div className="flex gap-1 pt-1">
          <Button
            variant={isInterested ? "default" : "outline"}
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onInterest(flip.id);
            }}
            className="flex-1 h-6 text-[10px]"
          >
            <Heart className={`w-3 h-3 mr-0.5 ${isInterested ? 'fill-current' : ''}`} />
            {interestCount > 0 && <span className="ml-0.5">{interestCount}</span>}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onClick(flip);
            }}
            className="h-6 w-6 p-0"
          >
            <MessageCircle className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </motion.div>
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
            <div className="grid grid-cols-2 gap-2">
              {filteredFlips.map((flip, i) => (
                <FlipCard key={flip.id} flip={flip} user={user} onInterest={onInterest} onClick={onFlipClick} priority={i < 3} profiles={profiles} />
              ))}
            </div>
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
            <div className="grid grid-cols-2 gap-2">
              {filteredFlips.map((flip) => (
                <FlipCard key={flip.id} flip={flip} user={user} onInterest={onInterest} onClick={onFlipClick} profiles={profiles} />
              ))}
            </div>
          )}
        </>
      )}

      {feedTab === 'market' && (
        <>
          {filteredFlips.length === 0 ? (
            <EmptyState icon={Package} title="No market activity" description="Check back later for market updates." />
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {filteredFlips.map((flip) => (
                <FlipCard key={flip.id} flip={flip} user={user} onInterest={onInterest} onClick={onFlipClick} profiles={profiles} />
              ))}
            </div>
          )}
        </>
      )}

      {feedTab === 'alerts' && (
        <>
          {filteredFlips.length === 0 ? (
            <EmptyState
              icon={MessageCircle}
              title="No alerts yet"
              description="Express interest in flips to get updates."
            />
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {filteredFlips.map((flip) => (
                <FlipCard key={flip.id} flip={flip} user={user} onInterest={onInterest} onClick={onFlipClick} profiles={profiles} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}