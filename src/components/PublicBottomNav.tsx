import React from "react";
import { AppearanceSettings } from "../types";
import LucideIcon from "./LucideIcon";

interface PublicBottomNavProps {
  publicTab: "links" | "guides" | "donate" | "posts";
  setPublicTab: (tab: "links" | "guides" | "donate" | "posts") => void;
  appearance: AppearanceSettings;
  postsCount: number;
}

export default function PublicBottomNav({
  publicTab,
  setPublicTab,
  appearance,
  postsCount,
}: PublicBottomNavProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-t border-slate-100 dark:border-slate-800/80 px-4 py-2 sm:py-3 shadow-[0_-4px_24px_rgba(0,0,0,0.06)]">
      <div className="max-w-md mx-auto grid grid-cols-4 gap-1">
        {/* Button 1: Liên hệ / Liên kết */}
        <button
          onClick={() => setPublicTab("links")}
          className={`flex flex-col items-center justify-center py-1.5 rounded-xl transition-all cursor-pointer ${
            publicTab === "links"
              ? "font-extrabold"
              : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          }`}
          style={
            publicTab === "links"
              ? { color: appearance.accentColor }
              : {}
          }
        >
          <LucideIcon name="Link2" size={18} />
          <span className="text-[10px] font-bold mt-1 tracking-wider uppercase">
            Liên hệ
          </span>
        </button>

        {/* Button 2: Trang bị */}
        <button
          onClick={() => setPublicTab("guides")}
          className={`flex flex-col items-center justify-center py-1.5 rounded-xl transition-all cursor-pointer ${
            publicTab === "guides"
              ? "font-extrabold"
              : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          }`}
          style={
            publicTab === "guides"
              ? { color: appearance.accentColor }
              : {}
          }
        >
          <LucideIcon name="BookOpen" size={18} />
          <span className="text-[10px] font-bold mt-1 tracking-wider uppercase">
            Trang bị
          </span>
        </button>

        {/* Button 3: Bài viết */}
        <button
          onClick={() => setPublicTab("posts")}
          className={`flex flex-col items-center justify-center py-1.5 rounded-xl transition-all cursor-pointer relative ${
            publicTab === "posts"
              ? "font-extrabold"
              : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          }`}
          style={
            publicTab === "posts"
              ? { color: appearance.accentColor }
              : {}
          }
        >
          <LucideIcon name="FileText" size={18} />
          <span className="text-[10px] font-bold mt-1 tracking-wider uppercase">
            Bài viết
          </span>
          {postsCount > 0 && (
            <span className="absolute top-1 right-5 bg-red-500 text-white text-[8px] w-3.5 h-3.5 rounded-full flex items-center justify-center font-bold animate-pulse">
              {postsCount}
            </span>
          )}
        </button>

        {/* Button 4: Ủng hộ */}
        <button
          onClick={() => setPublicTab("donate")}
          className={`flex flex-col items-center justify-center py-1.5 rounded-xl transition-all cursor-pointer ${
            publicTab === "donate"
              ? "font-extrabold"
              : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          }`}
          style={
            publicTab === "donate"
              ? { color: appearance.accentColor }
              : {}
          }
        >
          <LucideIcon name="Heart" size={18} />
          <span className="text-[10px] font-bold mt-1 tracking-wider uppercase">
            Ủng hộ
          </span>
        </button>
      </div>
    </div>
  );
}
