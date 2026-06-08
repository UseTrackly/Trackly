import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

/**
 * ProfileLink - Makes any user identity clickable to open their profile
 * 
 * Props:
 * - userEmail: The email of the user whose profile to open (for lookup)
 * - username: The username/handle for the URL (optional, falls back to email)
 * - userName: Display name to show (falls back to email)
 * - avatarUrl: Profile picture URL
 * - showAvatar: Whether to show avatar (default: true)
 * - className: Additional CSS classes
 * - children: Custom content (if provided, wraps children with click handler)
 */
export default function ProfileLink({ 
  userEmail, 
  username,
  userName, 
  avatarUrl, 
  showAvatar = true,
  className = '',
  children,
}) {
  const navigate = useNavigate();

  const handleClick = (e) => {
    e.stopPropagation();
    // Use username for URL if available, otherwise fall back to email
    const routeParam = username || userEmail;
    if (routeParam) {
      navigate(`/profile/${encodeURIComponent(routeParam)}`);
    }
  };

  // If children provided, wrap them with click handler
  if (children) {
    return (
      <button 
        onClick={handleClick} 
        className={`cursor-pointer hover:opacity-80 transition-opacity ${className}`}
        type="button"
      >
        {children}
      </button>
    );
  }

  // Default: render avatar + name
  return (
    <button 
      onClick={handleClick}
      className={`flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity ${className}`}
      type="button"
    >
      {showAvatar && (
        <div className="w-6 h-6 rounded-full overflow-hidden bg-secondary shrink-0">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-muted-foreground">
              {(userName || userEmail || '?')[0]?.toUpperCase()}
            </div>
          )}
        </div>
      )}
      {userName && (
        <span className="text-sm font-medium text-foreground truncate">
          {userName}
        </span>
      )}
    </button>
  );
}