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
  loadingWebGif?: string;        // Custom GIF for loading web application
  loadingDataGif?: string;       // Custom GIF for loading page data
  streamAlertGif?: string;       // Custom GIF for live stream donation alerts
  streamAlertSound?: string;     // Custom sound URL or base64 for live stream donation alerts
  streamAlertTemplate?: string;  // Custom template text for alerts (e.g. "{name} đã ủng hộ bạn")
  streamAlertTts?: boolean;      // Toggle Text-to-speech reading for alerts
  streamAlertDuration?: number;  // Duration of alert in seconds
  streamAlertVoiceGender?: string; // Voice gender: 'default' | 'male' | 'female'
  streamAlertVoiceName?: string;   // Selected Web Speech voice name
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
