import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

import { motion } from 'framer-motion';
import { Heart, MessageCircle, MapPin, Crown, TrendingUp, Users, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import EmptyState from '@/components/shared/EmptyState';
import ProfileLink from '@/components/shared/ProfileLink';

function FlipCard({ flip, user, onInterest, onClick, priority }) {
  const isInterested = flip.interested_users?.includes(user?.email);
  const interestCount = flip.interested_users?.length || 0;
  const buyPrice = flip.price * 0.6;
  const margin = ((flip.price - buyPrice) / buyPrice * 100).toFixed(0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-lg overflow-hidden"
      onClick={() => onClick(flip)}
    >
      {flip.image_url && (
        <div className="relative">
          <img src={flip.image_url} alt={flip.item_name} className="w-full h-20 object-cover" />
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
            username={flip.posted_by_name?.[0] || 'U'}
            userName={flip.posted_by_name?.[0] || 'U'}
            className="absolute top-1.5 right-1.5"
          >
            <span className="px-1.5 py-0.5 rounded-full bg-black/70 backdrop-blur-sm text-white text-[8px] font-medium hover:opacity-80">
              {flip.posted_by_name?.[0] || 'U'}
            </span>
          </ProfileLink>
        </div>
      )}

      <div className="p-2 space-y-1">
        <div className="flex items-center gap-1">
          <ProfileLink userEmail={flip.posted_by} username={flip.posted_by_name} userName={flip.posted_by_name}>
            <p className="text-[8px] text-muted-foreground hover:text-foreground truncate">
              {flip.posted_by_name}
            </p>
          </ProfileLink>
          {flip.is_poster_pro && <Crown className="w-2.5 h-2.5 text-primary shrink-0" />}
        </div>

        <h3 className="font-bold text-xs leading-tight truncate">{flip.item_name}</h3>
        <p className="text-[10px] text-muted-foreground line-clamp-2 min-h-[2.5em]">{flip.description}</p>

        <div className="grid grid-cols-3 gap-1 pt-1">
          <div>
            <p className="text-[8px] text-muted-foreground">Buy</p>
            <p className="text-[10px] font-semibold">${buyPrice.toFixed(0)}</p>
          </div>
          <div>
            <p className="text-[8px] text-muted-foreground">Sell</p>
            <p className="text-[10px] font-semibold">${flip.price?.toFixed(0)}</p>
          </div>
          <div>
            <p className="text-[8px] text-muted-foreground">Margin</p>
            <p className="text-[10px] font-semibold text-primary">+{margin}%</p>
          </div>
        </div>

        {flip.location && (
          <div className="flex items-center gap-0.5 text-[8px] text-muted-foreground">
            <MapPin className="w-2.5 h-2.5 shrink-0" />
            <span className="truncate">{flip.location}</span>
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

  // Remove internal state management - tabs controlled by PageTabBar

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
        return { email, name: profile?.display_name || email.split('@')[0], avatar: profile?.avatar_url, score };
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
                    <ProfileLink userEmail={collector.email} username={collector.name} userName={collector.name}>
                      <div className="w-14 h-14 rounded-full overflow-hidden bg-secondary border-2 border-border mx-auto mb-1">
                        {collector.avatar ? (
                          <img src={collector.avatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-lg font-bold text-muted-foreground">
                            {collector.name[0]?.toUpperCase()}
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
                <FlipCard key={flip.id} flip={flip} user={user} onInterest={onInterest} onClick={onFlipClick} priority={i < 3} />
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
                <FlipCard key={flip.id} flip={flip} user={user} onInterest={onInterest} onClick={onFlipClick} />
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
                <FlipCard key={flip.id} flip={flip} user={user} onInterest={onInterest} onClick={onFlipClick} />
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
                <FlipCard key={flip.id} flip={flip} user={user} onInterest={onInterest} onClick={onFlipClick} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}