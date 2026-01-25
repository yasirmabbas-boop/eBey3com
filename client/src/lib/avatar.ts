/**
 * Get a stable Facebook profile picture URL that doesn't expire
 * @param user - User object with avatar and facebookId
 * @returns URL string for the profile picture
 */
export function getFacebookProfilePicture(user: { avatar?: string | null; facebookId?: string | null }): string | null {
  // If we have a Facebook ID, always use the Graph API URL (permanent, doesn't expire)
  if (user.facebookId) {
    return `https://graph.facebook.com/${user.facebookId}/picture?type=large`;
  }
  
  // Fallback to stored avatar if no Facebook ID
  return user.avatar || null;
}

/**
 * Get user avatar src with fallback to Facebook Graph API
 * @param user - User object
 * @returns Avatar URL or null
 */
export function getUserAvatarSrc(user: { avatar?: string | null; facebookId?: string | null }): string | null {
  return getFacebookProfilePicture(user);
}
