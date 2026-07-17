import React from "react";
import {
  Facebook,
  Instagram,
  Tiktok,
  Youtube,
  Zalo,
  Github,
  Gmail,
  Google,
} from "@thesvg/react";
import LucideIcon from "./LucideIcon";

interface BrandIconProps {
  title: string;
  iconName: string;
  className?: string;
  size?: number;
}

export default function BrandIcon({
  title,
  iconName,
  className = "",
  size = 20,
}: BrandIconProps) {
  const lowerTitle = (title || "").toLowerCase();
  const lowerIcon = (iconName || "").toLowerCase();

  // Define size-specific style if needed
  const style = { width: size, height: size };

  // If it's a custom uploaded image URL
  if (
    iconName &&
    (iconName.startsWith("/uploads/") ||
      iconName.startsWith("http://") ||
      iconName.startsWith("https://") ||
      iconName.startsWith("data:"))
  ) {
    return (
      <img
        src={iconName}
        alt=""
        className={`${className} w-full h-full object-cover rounded`}
        style={{ backgroundColor: "transparent" }}
        referrerPolicy="no-referrer"
      />
    );
  }

  if (lowerTitle.includes("facebook") || lowerIcon.includes("facebook")) {
    return <Facebook className={className} style={style} />;
  }
  if (
    lowerTitle.includes("instagram") ||
    lowerIcon.includes("instagram") ||
    lowerIcon.includes("camera")
  ) {
    return <Instagram className={className} style={style} />;
  }
  if (
    lowerTitle.includes("tiktok") ||
    lowerIcon.includes("tiktok") ||
    lowerIcon.includes("music")
  ) {
    return <Tiktok className={className} style={style} />;
  }
  if (
    lowerTitle.includes("youtube") ||
    lowerIcon.includes("youtube") ||
    lowerIcon.includes("playcircle")
  ) {
    return <Youtube className={className} style={style} />;
  }
  if (
    lowerTitle.includes("zalo") ||
    lowerIcon.includes("zalo") ||
    lowerIcon.includes("messagesquare")
  ) {
    return <Zalo className={className} style={style} />;
  }
  if (
    lowerTitle.includes("github") ||
    lowerIcon.includes("github") ||
    lowerIcon.includes("code")
  ) {
    return <Github className={className} style={style} />;
  }
  if (
    lowerTitle.includes("gmail") ||
    lowerTitle.includes("email") ||
    lowerTitle.includes("mail") ||
    lowerIcon.includes("mail")
  ) {
    return <Gmail className={className} style={style} />;
  }
  if (lowerTitle.includes("google") || lowerIcon.includes("google")) {
    return <Google className={className} style={style} />;
  }

  // Fallback to standard Lucide icon
  return <LucideIcon name={iconName} size={size} className={className} />;
}
