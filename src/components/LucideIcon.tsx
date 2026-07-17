import React from 'react';
import * as Icons from 'lucide-react';

interface LucideIconProps {
  name: string;
  className?: string;
  size?: number;
  style?: React.CSSProperties;
}

export default function LucideIcon({ name, className = '', size, style }: LucideIconProps) {
  // Map some custom screenshot keys (like "language", "photo_camera", "public") to standard Lucide name keys.
  const normalizedName = (() => {
    const lower = name.toLowerCase();
    if (lower === 'language' || lower === 'public' || lower === 'globe') return 'Globe';
    if (lower === 'photo_camera' || lower === 'camera' || lower === 'instagram') return 'Camera';
    if (lower === 'code' || lower === 'latest repo') return 'Code';
    if (lower === 'facebook' || lower === 'face_nod') return 'Facebook';
    if (lower === 'messagesquare' || lower === 'message' || lower === 'chat') return 'MessageSquare';
    if (lower === 'music' || lower === 'music_note' || lower === 'music_video' || lower === 'tiktok') return 'Music';
    if (lower === 'trash' || lower === 'delete') return 'Trash2';
    if (lower === 'drag_indicator' || lower === 'drag') return 'GripVertical';
    if (lower === 'palette' || lower === 'colorize') return 'Palette';
    if (lower === 'image' || lower === 'banner') return 'Image';
    if (lower === 'cloud_upload' || lower === 'upload') return 'Upload';
    if (lower === 'search') return 'Search';
    if (lower === 'mail' || lower === 'alternate_email') return 'Mail';
    if (lower === 'location_on' || lower === 'map_pin') return 'MapPin';
    if (lower === 'info') return 'Info';
    if (lower === 'add' || lower === 'plus') return 'Plus';
    if (lower === 'chevron_right' || lower === 'arrow_forward_ios') return 'ChevronRight';
    if (lower === 'share') return 'Share2';
    if (lower === 'more_vert') return 'MoreVertical';
    if (lower === 'close' || lower === 'x') return 'X';
    if (lower === 'desktop_windows' || lower === 'desktop') return 'Laptop';
    
    // Fallback: try to find exact match in lucide-react keys
    const match = Object.keys(Icons).find(
      (key) => key.toLowerCase() === lower
    );
    return match || 'Link';
  })();

  const IconComponent = (Icons as any)[normalizedName] || Icons.Link;

  return <IconComponent className={className} size={size} style={style} />;
}
