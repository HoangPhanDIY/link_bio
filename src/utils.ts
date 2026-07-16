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

export const isCustomIcon = (icon: string): boolean => {
  return !!(
    icon &&
    (icon.startsWith("/uploads/") ||
      icon.startsWith("http://") ||
      icon.startsWith("https://") ||
      icon.startsWith("data:"))
  );
};

let cachedVisitorInfo: string | null = null;

export async function getVisitorInfo(): Promise<string> {
  if (cachedVisitorInfo) return cachedVisitorInfo;

  // Clean device detection as a fallback
  const userAgent = navigator.userAgent || "";
  let deviceType = "Desktop";
  if (/mobile/i.test(userAgent)) {
    deviceType = "Mobile";
  } else if (/tablet|ipad/i.test(userAgent)) {
    deviceType = "Tablet";
  }

  // 1. Try ipwho.is (Extremely fast, free up to 10k/day, fully HTTPS & CORS-compliant)
  try {
    const res = await fetch("https://ipwho.is/");
    if (res.ok) {
      const data = await res.json();
      if (data && data.success && data.ip) {
        const city = data.city || "Unknown City";
        const country = data.country || "Vietnam";
        cachedVisitorInfo = `${data.ip} (${city}, ${country})`;
        return cachedVisitorInfo;
      }
    }
  } catch (e) {
    console.warn("Failed to fetch from ipwho.is", e);
  }

  // 2. Try api.ip.sb (Excellent free service, fully HTTPS & CORS-compliant)
  try {
    const res = await fetch("https://api.ip.sb/geoip");
    if (res.ok) {
      const data = await res.json();
      if (data && data.ip) {
        const city = data.city || "Unknown City";
        const country = data.country || "Vietnam";
        cachedVisitorInfo = `${data.ip} (${city}, ${country})`;
        return cachedVisitorInfo;
      }
    }
  } catch (e) {
    console.warn("Failed to fetch from api.ip.sb", e);
  }

  // 2. Try ipapi.co (HTTPS support, occasionally rate-limited)
  try {
    const res = await fetch("https://ipapi.co/json/");
    if (res.ok) {
      const data = await res.json();
      if (data && data.ip) {
        const city = data.city || "Unknown City";
        const country = data.country_name || "Vietnam";
        cachedVisitorInfo = `${data.ip} (${city}, ${country})`;
        return cachedVisitorInfo;
      }
    }
  } catch (e) {
    console.warn("Failed to fetch from ipapi.co", e);
  }

  // 3. Try db-ip.com (HTTPS support, very reliable fallback)
  try {
    const res = await fetch("https://api.db-ip.com/v2/free/self");
    if (res.ok) {
      const data = await res.json();
      if (data && data.ipAddress) {
        const city = data.city || "Unknown City";
        const country = data.countryName || "Vietnam";
        cachedVisitorInfo = `${data.ipAddress} (${city}, ${country})`;
        return cachedVisitorInfo;
      }
    }
  } catch (e) {
    console.warn("Failed to fetch from db-ip.com", e);
  }

  // 4. Fallback to raw IP via ipify (very reliable but no geolocation)
  try {
    const res = await fetch("https://api64.ipify.org?format=json");
    if (res.ok) {
      const data = await res.json();
      if (data && data.ip) {
        cachedVisitorInfo = `${data.ip} (${deviceType})`;
        return cachedVisitorInfo;
      }
    }
  } catch (e) {
    console.warn("Failed to fetch raw IP from ipify", e);
  }

  // Final fallback to device type
  cachedVisitorInfo = deviceType;
  return deviceType;
}

