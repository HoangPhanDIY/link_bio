import React from "react";
import { AppearanceSettings } from "../types";
import BannerSlideshow from "./BannerSlideshow";

interface PublicHeaderProps {
  appearance: AppearanceSettings;
  isDarkPublic: boolean;
}

export default function PublicHeader({
  appearance,
  isDarkPublic,
}: PublicHeaderProps) {
  return (
    <>
      {/* 1. Cover Banner (Ảnh bìa tĩnh) at the very top */}
      <div className="w-full relative overflow-hidden rounded-md bg-slate-950 shadow-md h-40 sm:h-56 md:h-64 transition-all duration-300">
        {appearance.bannerUrl ? (
          <img
            src={appearance.bannerUrl}
            alt="Cover banner"
            className="w-full h-full object-cover opacity-95"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-indigo-950 via-slate-950 to-indigo-950 opacity-95 flex items-center justify-center">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(99,102,241,0.15),transparent_60%)]"></div>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent"></div>
      </div>

      {/* 2. Avatar overlaps the banner slightly and the text aligns to its lower quarter consistently */}
      <div className="relative px-4 sm:px-8 z-10 md:-mt-12 -mt-6 mb-8">
        <div className="flex items-end gap-4">
          {/* Overlapping Avatar */}
          <div className="shrink-0 -mt-2">
            <div
              className={`md:w-36 md:h-36 w-24 h-24 sm:w-18 sm:h-18 rounded-full border-4 shadow-xl overflow-hidden transition-all duration-300 ${
                isDarkPublic
                  ? "border-slate-900 bg-slate-950"
                  : "border-white bg-white"
              }`}
            >
              <img
                src={
                  appearance.avatarUrl || "/image/tuong/DauSi/Florentino.jpg"
                }
                alt={appearance.name}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>

          {/* Identity details */}
          <div className="flex-1 min-w-0 text-left self-end pb-2">
            <h1
              className={`text-xl sm:text-2xl md:text-3xl font-black leading-tight tracking-tight ${isDarkPublic ? "text-white" : "text-slate-800"}`}
            >
              {appearance.name || "N/A"}
            </h1>
            <p
              className={`text-xs sm:text-sm font-medium mt-1 leading-relaxed max-w-2xl ${isDarkPublic ? "text-slate-400" : "text-slate-600"}`}
            >
              {appearance.bio || "N/A"}
            </p>
          </div>
        </div>
      </div>

      {/* 3. Sliding Banner (Banner chạy slide) */}
      <div className="w-full relative overflow-hidden rounded-md sm:rounded-3xl shadow-md mt-6">
        <BannerSlideshow
          images={
            appearance.selectedBanners && appearance.selectedBanners.length > 0
              ? appearance.selectedBanners
              : [appearance.bannerUrl]
          }
          autoplayInterval={5000}
          className="h-40 sm:h-56 md:h-64 w-full"
        />
      </div>

      {/* 4. Subtle accent color divider for public layout space */}
      <div
        className="h-[1px] w-full mt-6 opacity-20"
        style={{ backgroundColor: appearance.accentColor }}
      />
    </>
  );
}
