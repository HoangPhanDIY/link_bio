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
    <div
      className="fixed bottom-0 left-0 right-0 z-50 backdrop-blur-md border-t border-[#bd9867]/60 sm:py-2 shadow-[0_-4px_24px_rgba(0,0,0,0.3)] bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: `url('image/Decor/bg-header.jpg')`,
      }}
    >
      <div className="max-w-md mx-auto grid grid-cols-4 gap-1">
        {/* Button 1: Liên hệ / Liên kết */}
        <button
          onClick={() => setPublicTab("links")}
          className={`flex flex-col items-center justify-center py-1.5 transition-all cursor-pointer ${
            publicTab === "links"
              ? "bg-gradient-to-t from-[#bd9867] to-[#fce3bc] text-white font-extrabold shadow-sm"
              : "hover:opacity-80"
          }`}
        >
          <LucideIcon
            name="Link2"
            size={18}
            className={
              publicTab === "links" ? "text-white" : "stroke-[#bd9867]"
            }
          />
          <span
            className={`text-[10px] font-bold mt-1 tracking-wider uppercase ${
              publicTab === "links"
                ? "text-white"
                : "bg-gradient-to-t from-[#bd9867] to-[#fce3bc] bg-clip-text text-transparent"
            }`}
          >
            Liên hệ
          </span>
        </button>

        {/* Button 2: Học Viện */}
        <button
          onClick={() => setPublicTab("guides")}
          className={`flex flex-col items-center justify-center py-1.5 transition-all cursor-pointer ${
            publicTab === "guides"
              ? "bg-gradient-to-t from-[#bd9867] to-[#fce3bc] text-white font-extrabold shadow-sm"
              : "hover:opacity-80"
          }`}
        >
          <LucideIcon
            name="GraduationCap"
            size={18}
            className={
              publicTab === "guides" ? "text-white" : "stroke-[#bd9867]"
            }
          />
          <span
            className={`text-[10px] font-bold mt-1 tracking-wider uppercase ${
              publicTab === "guides"
                ? "text-white"
                : "bg-gradient-to-t from-[#bd9867] to-[#fce3bc] bg-clip-text text-transparent"
            }`}
          >
            Học Viện
          </span>
        </button>

        {/* Button 3: Bài viết */}
        <button
          onClick={() => setPublicTab("posts")}
          className={`flex flex-col items-center justify-center py-1.5 transition-all cursor-pointer relative ${
            publicTab === "posts"
              ? "bg-gradient-to-t from-[#bd9867] to-[#fce3bc] text-white font-extrabold shadow-sm"
              : "hover:opacity-80"
          }`}
        >
          <LucideIcon
            name="FileText"
            size={18}
            className={
              publicTab === "posts" ? "text-white" : "stroke-[#bd9867]"
            }
          />
          <span
            className={`text-[10px] font-bold mt-1 tracking-wider uppercase ${
              publicTab === "posts"
                ? "text-white"
                : "bg-gradient-to-t from-[#bd9867] to-[#fce3bc] bg-clip-text text-transparent"
            }`}
          >
            Bài viết
          </span>
        </button>

        {/* Button 4: Ủng hộ */}
        <button
          onClick={() => setPublicTab("donate")}
          className={`flex flex-col items-center justify-center py-1.5 transition-all cursor-pointer ${
            publicTab === "donate"
              ? "bg-gradient-to-t from-[#bd9867] to-[#fce3bc] text-white font-extrabold shadow-sm"
              : "hover:opacity-80"
          }`}
        >
          <LucideIcon
            name="Heart"
            size={18}
            className={
              publicTab === "donate"
                ? "text-white fill-white"
                : "stroke-[#bd9867]"
            }
          />
          <span
            className={`text-[10px] font-bold mt-1 tracking-wider uppercase ${
              publicTab === "donate"
                ? "text-white"
                : "bg-gradient-to-t from-[#bd9867] to-[#fce3bc] bg-clip-text text-transparent"
            }`}
          >
            Ủng hộ
          </span>
        </button>
      </div>
    </div>
  );
}
