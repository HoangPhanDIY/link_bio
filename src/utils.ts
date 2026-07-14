/**
 * Helper to get the direct official SVG logo URL of standard social media brands.
 * This is used to replace font icons with direct source images/logos.
 */
export function getBrandIconUrl(title: string, iconName: string): string {
  const lowerTitle = (title || '').toLowerCase();
  const lowerIcon = (iconName || '').toLowerCase();
  
  if (lowerTitle.includes('facebook') || lowerIcon.includes('facebook')) {
    return 'https://upload.wikimedia.org/wikipedia/commons/0/51/Facebook_logo_%282019%29.svg';
  }
  if (lowerTitle.includes('instagram') || lowerIcon.includes('instagram') || lowerIcon.includes('camera')) {
    return 'https://upload.wikimedia.org/wikipedia/commons/e/e7/Instagram_logo_2016.svg';
  }
  if (lowerTitle.includes('tiktok') || lowerIcon.includes('tiktok') || lowerIcon.includes('music')) {
    return 'https://upload.wikimedia.org/wikipedia/commons/3/34/Ionicons_logo-tiktok.svg';
  }
  if (lowerTitle.includes('youtube') || lowerIcon.includes('youtube') || lowerIcon.includes('playcircle')) {
    return 'https://upload.wikimedia.org/wikipedia/commons/0/09/YouTube_full-color_icon_%282017%29.svg';
  }
  if (lowerTitle.includes('zalo') || lowerIcon.includes('zalo') || lowerIcon.includes('messagesquare')) {
    return 'https://upload.wikimedia.org/wikipedia/commons/9/91/Icon_of_Zalo.svg';
  }
  if (lowerTitle.includes('github') || lowerIcon.includes('github') || lowerIcon.includes('code')) {
    return 'https://upload.wikimedia.org/wikipedia/commons/9/91/Octicons-mark-github.svg';
  }
  if (lowerTitle.includes('gmail') || lowerTitle.includes('email') || lowerTitle.includes('mail') || lowerIcon.includes('mail')) {
    return 'https://upload.wikimedia.org/wikipedia/commons/7/7e/Gmail_icon_%282020%29.svg';
  }
  // Fallback high-quality direct vector globe
  return 'https://upload.wikimedia.org/wikipedia/commons/c/c4/Globe_icon.svg';
}
