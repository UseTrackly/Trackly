/**
 * Pro gate helpers — single source of truth for all free-tier limits.
 * Import these anywhere you need to check or enforce plan limits.
 */

export const FREE_LIMITS = {
  flips_per_day: 3,          // Max flips tracked per day
  community_posts: 3,         // Max active community posts ever
  inventory_items: 10,        // Max inventory items
};

/**
 * Count how many flips the user has created TODAY.
 * @param {Array} flips - array of flip records with created_date
 */
export function countTodayFlips(flips = []) {
  const today = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
  return flips.filter(f => {
    const d = f.created_date || f.date_sold || '';
    return d.slice(0, 10) === today;
  }).length;
}

/**
 * Returns true if this user is allowed to save another flip today.
 */
export function canSaveFlip(user, flips = []) {
  if (user?.is_pro) return true;
  return countTodayFlips(flips) < FREE_LIMITS.flips_per_day;
}

/**
 * Returns true if this user is allowed to post to community.
 */
export function canPostCommunity(user, myPosts = []) {
  if (user?.is_pro) return true;
  return myPosts.length < FREE_LIMITS.community_posts;
}

/**
 * Returns true if this user is allowed to add another inventory item.
 */
export function canAddInventory(user, myItems = []) {
  if (user?.is_pro) return true;
  return myItems.length < FREE_LIMITS.inventory_items;
}

/**
 * Returns true if the user can export CSV/PDF.
 */
export function canExport(user) {
  return !!user?.is_pro;
}

/**
 * Returns true if the user can use Profile Song feature.
 */
export function canUseProfileSong(user) {
  return !!user?.is_pro;
}