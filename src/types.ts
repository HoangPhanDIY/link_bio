export interface BioLink {
  id: string;
  title: string;
  url: string;
  icon: string; // Key name for lucide icon
  enabled: boolean;
  clicks: number;
  conversions: number; // For analytics
  status: 'Active' | 'Paused';
}

export type InterfaceMode = 'light' | 'dark';

export type FontFamilyType = 'Plus Jakarta Sans' | 'Inter' | 'JetBrains Mono';

export interface AppearanceSettings {
  mode: InterfaceMode;
  fontFamily: FontFamilyType;
  accentColor: string; // Tailwind class background color/hex
  bannerUrl: string;
  avatarUrl: string;
  name: string;
  bio: string;
  newsletterEnabled: boolean;
  featuredBannerEnabled?: boolean;
  selectedBanners?: string[]; // List of banner URLs for the slideshow
  bankName?: string;
  bankAccount?: string;
  bankOwner?: string;
  momoNumber?: string;
  momoName?: string;
  donateNote?: string;
  bankEnabled?: boolean;
  momoEnabled?: boolean;
  backgroundColor?: string;      // Custom web page background color
  linkBackgroundColor?: string;  // Custom link card background color
  linkTextColor?: string;        // Custom link card text color
}

export interface ActivityLog {
  id: string;
  type: 'create' | 'milestone' | 'spike' | 'cleanup';
  message: string;
  boldText?: string;
  time: string;
}

export interface MetricCardData {
  title: string;
  value: string;
  change: string;
  isPositive: boolean;
  icon: string;
}
