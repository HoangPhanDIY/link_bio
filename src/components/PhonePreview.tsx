import React from "react";
import { BioLink, AppearanceSettings } from "../types";
import LucideIcon from "./LucideIcon";
import BannerSlideshow from "./BannerSlideshow";
import BrandIcon from "./BrandIcon";

interface PhonePreviewProps {
  links: BioLink[];
  appearance: AppearanceSettings;
  onLinkClick?: (linkId: string) => void;
}

const isCustomIcon = (icon: string) => {
  return (
    icon &&
    (icon.startsWith("/uploads/") ||
      icon.startsWith("http://") ||
      icon.startsWith("https://") ||
      icon.startsWith("data:"))
  );
};

export default function PhonePreview({
  links,
  appearance,
  onLinkClick,
}: PhonePreviewProps) {
  const {
    mode,
    fontFamily,
    accentColor,
    bannerUrl,
    avatarUrl,
    name,
    bio,
    newsletterEnabled,
    backgroundColor = "",
    linkBackgroundColor = "",
    linkTextColor = "",
  } = appearance;

  // Font class resolver
  const getFontFamilyClass = () => {
    if (fontFamily === "Plus Jakarta Sans") return "font-display";
    if (fontFamily === "JetBrains Mono") return "font-mono";
    return "font-sans";
  };

  const isDark = mode === "dark";

  return (
    <div className={`flex flex-col items-center w-full max-w-[340px] mx-auto`}>
      {/* Interactive Title above the Phone */}
      {/* <div className="text-center mb-5">
        <h3 className="font-display text-lg font-bold text-slate-800">Xem trước trực tiếp</h3>
        <p className="font-mono text-xs text-slate-400 uppercase tracking-wider">
          vivid-persona.me/{name.toLowerCase().replace(/\s+/g, '-')}
        </p>
      </div> */}

      {/* iPhone Mockup Shell */}
      <div
        id="phone-frame"
        className="relative w-full aspect-[9/18] min-h-[580px] rounded-[2.5rem] bg-white border-[10px] border-slate-900 shadow-2xl overflow-hidden transition-all duration-300"
        style={{
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 4px #1e293b",
        }}
      >
        {/* Dynamic Island / Speaker Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-[22px] bg-slate-900 rounded-b-2xl z-40 flex items-center justify-center">
          <div className="w-12 h-1 bg-slate-800 rounded-full"></div>
        </div>

        {/* Inner Phone Screen Canvas with scrollbar hidden */}
        <div
          className={`h-full overflow-y-auto preview-scroll pb-12 transition-all duration-300 ${
            isDark
              ? "bg-slate-950 text-slate-100"
              : "bg-slate-50 text-slate-900"
          } ${getFontFamilyClass()}`}
          style={{
            backgroundColor: backgroundColor || undefined,
          }}
        >
          {/* Banner Graphic Card */}
          <div className="px-4 pt-4">
            <div className="h-28 w-full relative overflow-hidden rounded-3xl bg-indigo-950 shadow-sm">
              <img
                src={bannerUrl}
                alt="Profile banner"
                className="w-full h-full object-cover opacity-90 transition-all duration-500"
                referrerPolicy="no-referrer"
              />
              {/* Subtle Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent"></div>
            </div>
          </div>

          {/* Profile Details Container */}
          <div className="px-5 -mt-10 relative z-10 flex flex-col items-center text-center">
            {/* Profile Avatar circle with glow */}
            <div
              className={`w-20 h-20 rounded-full border-4 ${isDark ? "border-slate-950" : "border-white"} shadow-md overflow-hidden bg-slate-200 transition-colors duration-300`}
            >
              <img
                src={avatarUrl}
                alt={name}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>

            {/* Profile Details */}
            <h2 className="text-lg font-bold mt-2.5 leading-tight tracking-tight text-slate-800">
              {name || "Tên của bạn"}
            </h2>
            <p
              className={`text-xs mt-1.5 leading-relaxed max-w-[240px] text-slate-500`}
            >
              {bio || "Viết tiểu sử ngắn về bản thân bạn..."}
            </p>

            {/* Banner Slideshow Block (Auto-rotates every 5s) */}
            <div className="w-full mt-4">
              <BannerSlideshow
                images={appearance.selectedBanners || [bannerUrl]}
                autoplayInterval={5000}
                className="h-28 w-full shadow-md"
              />
            </div>

            {/* Main Links List inside Phone */}
            <div className="w-full space-y-3.5 px-1 mt-6">
              {links
                .filter((l) => l.enabled)
                .map((link) => {
                  // Determine brand color dynamically
                  const lowerTitle = link.title.toLowerCase();
                  const lowerIcon = link.icon.toLowerCase();

                  let brandBgStyle = { backgroundColor: `${accentColor}12` };
                  let brandIconColor = accentColor;

                  if (
                    lowerTitle.includes("facebook") ||
                    lowerIcon.includes("facebook")
                  ) {
                    brandBgStyle = { backgroundColor: "#e8f0fe" };
                    brandIconColor = "#1877F2";
                  } else if (
                    lowerTitle.includes("instagram") ||
                    lowerIcon.includes("camera") ||
                    lowerIcon.includes("instagram")
                  ) {
                    brandBgStyle = { backgroundColor: "#fdf0f5" };
                    brandIconColor = "#E4405F";
                  } else if (
                    lowerTitle.includes("tiktok") ||
                    lowerIcon.includes("music") ||
                    lowerIcon.includes("tiktok")
                  ) {
                    brandBgStyle = { backgroundColor: "#18181b" };
                    brandIconColor = "#ffffff";
                  } else if (
                    lowerTitle.includes("youtube") ||
                    lowerIcon.includes("playcircle") ||
                    lowerIcon.includes("youtube")
                  ) {
                    brandBgStyle = { backgroundColor: "#fef2f2" };
                    brandIconColor = "#FF0000";
                  } else if (
                    lowerTitle.includes("zalo") ||
                    lowerIcon.includes("messagesquare") ||
                    lowerIcon.includes("zalo")
                  ) {
                    brandBgStyle = { backgroundColor: "#e0f2fe" };
                    brandIconColor = "#0068FF";
                  }

                  return (
                    <div
                      key={link.id}
                      onClick={() => onLinkClick && onLinkClick(link.id)}
                      className={`w-full p-3 px-3.5 rounded-2xl border text-left cursor-pointer transition-all duration-300 group flex items-center hover:scale-[1.02] active:scale-[0.98] ${
                        isDark
                          ? "bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-200"
                          : "bg-white border-slate-100/80 hover:border-slate-200 text-slate-800"
                      }`}
                      style={{
                        boxShadow: "0 2px 8px rgba(0,0,0,0.015)",
                        backgroundColor: linkBackgroundColor || undefined,
                        borderColor: linkBackgroundColor
                          ? "transparent"
                          : undefined,
                        color: linkTextColor || undefined,
                      }}
                    >
                      {/* Left Side Icon */}
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center mr-3 shrink-0 transition-all ${
                          isCustomIcon(link.icon)
                            ? "p-0 bg-transparent border-0"
                            : "p-1 bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-800 text-slate-800 dark:text-slate-100"
                        }`}
                      >
                        <BrandIcon
                          title={link.title}
                          iconName={link.icon}
                          size={isCustomIcon(link.icon) ? 36 : 20}
                        />
                      </div>

                      {/* Middle Content */}
                      <div className="flex-1 min-w-0 pr-2">
                        <p
                          className="text-sm font-semibold leading-snug truncate group-hover:text-indigo-500 transition-colors"
                          style={
                            {
                              "--hover-color": brandIconColor,
                              color: linkTextColor || undefined,
                            } as React.CSSProperties
                          }
                        >
                          {link.title}
                        </p>
                      </div>

                      {/* Right chevron indicator */}
                      <LucideIcon
                        name="chevron_right"
                        className={`shrink-0 transition-transform group-hover:translate-x-0.5 ${isDark ? "text-slate-600" : "text-slate-300"}`}
                        style={{ color: linkTextColor || undefined }}
                        size={14}
                      />
                    </div>
                  );
                })}

              {links.filter((l) => l.enabled).length === 0 && (
                <div
                  className={`p-6 border border-dashed rounded-xl text-center text-xs ${isDark ? "border-slate-800 text-slate-600" : "border-slate-200 text-slate-400"}`}
                >
                  Chưa có liên kết hoạt động nào được hiển thị. Hãy kích hoạt
                  liên kết trong trình chỉnh sửa.
                </div>
              )}
            </div>

            {/* Contact Form / Send Message Box */}
            {newsletterEnabled && (
              <div
                className={`w-full mt-7 p-4 rounded-xl border ${
                  isDark
                    ? "bg-slate-900/40 border-slate-800/80"
                    : "bg-slate-100/60 border-slate-200/50"
                }`}
              >
                <h4 className="text-xs font-bold mb-1.5 flex items-center gap-1">
                  <LucideIcon
                    name="MessageSquare"
                    size={12}
                    style={{ color: accentColor }}
                  />
                  Nhắn tin cho tôi
                </h4>
                <div className="space-y-1.5">
                  <input
                    type="text"
                    placeholder="Họ và tên"
                    disabled
                    className={`w-full text-[10px] px-2.5 py-1.5 rounded-lg border focus:outline-none transition-all ${
                      isDark
                        ? "bg-slate-950 border-slate-800 text-slate-300 placeholder:text-slate-600"
                        : "bg-white border-slate-200 text-slate-600 placeholder:text-slate-400"
                    }`}
                  />
                  <input
                    type="email"
                    placeholder="Địa chỉ Email"
                    disabled
                    className={`w-full text-[10px] px-2.5 py-1.5 rounded-lg border focus:outline-none transition-all ${
                      isDark
                        ? "bg-slate-950 border-slate-800 text-slate-300 placeholder:text-slate-600"
                        : "bg-white border-slate-200 text-slate-600 placeholder:text-slate-400"
                    }`}
                  />
                  <textarea
                    placeholder="Nội dung lời nhắn..."
                    disabled
                    rows={2}
                    className={`w-full text-[10px] px-2.5 py-1.5 rounded-lg border focus:outline-none transition-all resize-none ${
                      isDark
                        ? "bg-slate-950 border-slate-800 text-slate-300 placeholder:text-slate-600"
                        : "bg-white border-slate-200 text-slate-600 placeholder:text-slate-400"
                    }`}
                  />
                  <button
                    disabled
                    className="w-full text-[10px] font-semibold py-1.5 rounded-lg transition-all text-white shadow-sm"
                    style={{ backgroundColor: accentColor }}
                  >
                    Gửi tin nhắn
                  </button>
                </div>
              </div>
            )}

            {/* Bottom social footer lookup icons */}
            <div
              className={`mt-8 flex justify-center gap-4 ${isDark ? "text-slate-500" : "text-slate-400"}`}
            >
              <LucideIcon
                name="Globe"
                size={16}
                className="hover:text-indigo-500 cursor-pointer transition-colors"
              />
              <LucideIcon
                name="Mail"
                size={16}
                className="hover:text-indigo-500 cursor-pointer transition-colors"
              />
              <LucideIcon
                name="Info"
                size={16}
                className="hover:text-indigo-500 cursor-pointer transition-colors"
              />
            </div>

            {/* Logo/Branding credits */}
            <p
              className={`mt-7 text-[8px] uppercase tracking-[0.2em] ${isDark ? "text-slate-600" : "text-slate-300"}`}
            >
              Được tạo bởi Vivid Persona
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
