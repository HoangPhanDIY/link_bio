import React from "react";
import { AppearanceSettings } from "../types";
import LucideIcon from "./LucideIcon";

interface PublicBottomNavProps {
  publicTab:
    | "links"
    | "guides"
    | "donate"
    | "posts"
    | "profile"
    | "notifications"
    | "accounts";
  setPublicTab: (
    tab:
      | "links"
      | "guides"
      | "donate"
      | "posts"
      | "profile"
      | "notifications"
      | "accounts",
  ) => void;
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
      <div className="grid grid-cols-5 gap-1">
        {/* Button 1: Liên hệ / Liên kết */}
        <button
          onClick={() => setPublicTab("links")}
          className={`flex flex-col items-center justify-center py-1.5 transition-all cursor-pointer ${
            publicTab === "links"
              ? "bg-gradient-to-t from-[#bd9867] to-[#fce3bc] font-extrabold shadow-sm"
              : "hover:opacity-80"
          }`}
        >
          <LucideIcon
            name="Link2"
            size={17}
            className={
              publicTab === "links" ? "text-slate-950" : "stroke-[#bd9867]"
            }
          />
          <span
            className={`text-[9.5px] font-bold mt-0.5 tracking-wider uppercase ${
              publicTab === "links"
                ? "text-slate-950"
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
              ? "bg-gradient-to-t from-[#bd9867] to-[#fce3bc] font-extrabold shadow-sm"
              : "hover:opacity-80"
          }`}
        >
          <LucideIcon
            name="GraduationCap"
            size={17}
            className={
              publicTab === "guides" ? "text-slate-950" : "stroke-[#bd9867]"
            }
          />
          <span
            className={`text-[9.5px] font-bold mt-0.5 tracking-wider uppercase ${
              publicTab === "guides"
                ? "text-slate-950"
                : "bg-gradient-to-t from-[#bd9867] to-[#fce3bc] bg-clip-text text-transparent"
            }`}
          >
            Học Viện
          </span>
        </button>

        {/* Button 3: Kho Acc */}
        <button
          onClick={() => setPublicTab("accounts")}
          className={`flex flex-col items-center justify-center py-1.5 transition-all cursor-pointer ${
            publicTab === "accounts"
              ? "bg-gradient-to-t from-[#bd9867] to-[#fce3bc] font-extrabold shadow-sm"
              : "hover:opacity-80"
          }`}
        >
          <LucideIcon
            name="ShoppingBag"
            size={17}
            className={
              publicTab === "accounts" ? "text-slate-950" : "stroke-[#bd9867]"
            }
          />
          <span
            className={`text-[9.5px] font-bold mt-0.5 tracking-wider uppercase ${
              publicTab === "accounts"
                ? "text-slate-950"
                : "bg-gradient-to-t from-[#bd9867] to-[#fce3bc] bg-clip-text text-transparent"
            }`}
          >
            Kho Acc
          </span>
        </button>

        {/* Button 4: Bài viết */}
        <button
          onClick={() => setPublicTab("posts")}
          className={`flex flex-col items-center justify-center py-1.5 transition-all cursor-pointer relative ${
            publicTab === "posts"
              ? "bg-gradient-to-t from-[#bd9867] to-[#fce3bc] text-slate-950 font-extrabold shadow-sm"
              : "hover:opacity-80"
          }`}
        >
          <LucideIcon
            name="FileText"
            size={17}
            className={
              publicTab === "posts" ? "text-slate-950" : "stroke-[#bd9867]"
            }
          />
          <span
            className={`text-[9.5px] font-bold mt-0.5 tracking-wider uppercase ${
              publicTab === "posts"
                ? "text-slate-950"
                : "bg-gradient-to-t from-[#bd9867] to-[#fce3bc] bg-clip-text text-transparent"
            }`}
          >
            Bài viết
          </span>
        </button>

        {/* Button 5: Ủng hộ */}
        <button
          onClick={() => setPublicTab("donate")}
          className={`flex flex-col items-center justify-center py-1.5 transition-all cursor-pointer ${
            publicTab === "donate"
              ? "bg-gradient-to-t from-[#bd9867] to-[#fce3bc] text-slate-950 font-extrabold shadow-sm"
              : "hover:opacity-80"
          }`}
        >
          <LucideIcon
            name="Heart"
            size={17}
            className={
              publicTab === "donate" ? "text-slate-950" : "stroke-[#bd9867]"
            }
          />
          <span
            className={`text-[9.5px] font-bold mt-0.5 tracking-wider uppercase ${
              publicTab === "donate"
                ? "text-slate-950"
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
