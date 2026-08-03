import React from "react";
import { BioLink, AppearanceSettings } from "../types";
import LucideIcon from "./LucideIcon";
import BrandIcon from "./BrandIcon";
import { isCustomIcon } from "../utils";

interface PublicLinksTabProps {
  links: BioLink[];
  appearance: AppearanceSettings;
  isDarkPublic: boolean;
  onLinkClick: (linkId: string) => void;
  colorMode?: "light" | "dark" | "system";
}

export default function PublicLinksTab({
  links,
  appearance,
  isDarkPublic,
  onLinkClick,
  colorMode = "system",
}: PublicLinksTabProps) {
  const isSystem = colorMode === "system";

  return (
    <div className="space-y-3 animate-in fade-in duration-300">
      {/* Section Title */}
      <div className="flex items-center">
        <h2 className="font-extrabold text-xl bg-gradient-to-t from-[#bd9867] to-[#fce3bc] bg-clip-text text-transparent">
          LIÊN KẾT CÁ NHÂN
        </h2>
      </div>

      {/* Public Links list */}
      <div className="w-full grid grid-cols-1 gap-3">
        {links
          .filter((l) => l.enabled)
          .map((link) => {
            return (
              <a
                key={link.id}
                href={`https://${link.url}`}
                target="_blank"
                rel="noreferrer"
                onClick={() => onLinkClick(link.id)}
                className="flex items-center p-3 border-1 transition-all hover:-translate-y-0.5 group active:scale-[0.99] shadow-xs backdrop-blur-md"
                style={{
                  borderColor: "rgb(156, 140, 103)",
                  background: "rgba(29, 24, 43, 0.75)",
                }}
                // className={`flex items-center p-3.5 px-4.5 border-2 transition-all hover:-translate-y-0.5 group active:scale-[0.99] bg-white shadow-xs hover:bg-slate-50/50`}
                // style={{
                //   backgroundColor:
                //     (isSystem && appearance.linkBackgroundColor) || undefined,
                //   borderColor:
                //     isSystem && appearance.linkBackgroundColor
                //       ? "transparent"
                //       : `${appearance.accentColor}30`, // semi-transparent primary color border
                //   borderLeft: `5px solid ${appearance.accentColor}`, // solid main primary color thick left accent
                // }}
              >
                <div
                  className={`w-11 h-11 flex items-center justify-center mr-4 shrink-0 transition-all ${
                    isCustomIcon(link.icon)
                      ? "p-0 bg-transparent border-0"
                      : "p-1 bg-white  shadow-sm border border-slate-100  text-slate-800 "
                  }`}
                >
                  <BrandIcon
                    title={link.title}
                    iconName={link.icon}
                    size={isCustomIcon(link.icon) ? 44 : 22}
                  />
                </div>

                <div className="flex-1 min-w-0 pr-3">
                  <p
                    className="font-extrabold text-lg bg-gradient-to-t from-[#bd9867] to-[#fce3bc] bg-clip-text text-transparent"
                    // style={{
                    //   color:
                    //     (isSystem && appearance.linkTextColor) ||
                    //     (isDarkPublic ? "#ffffff" : "#1e293b"),
                    // }}
                    // onMouseEnter={(e) => {
                    //   e.currentTarget.style.color = appearance.accentColor;
                    // }}
                    // onMouseLeave={(e) => {
                    //   e.currentTarget.style.color =
                    //     (isSystem && appearance.linkTextColor) ||
                    //     (isDarkPublic ? "#ffffff" : "#1e293b");
                    // }}
                  >
                    {link.title}
                  </p>
                </div>

                <LucideIcon
                  name="chevron_right"
                  className="text-[#fce3bc] transition-all duration-200 group-hover:translate-x-1"
                  // style={{
                  //   color:
                  //     (isSystem && appearance.linkTextColor) ||
                  //     appearance.accentColor,
                  // }}
                  // size={18}
                />
              </a>
            );
          })}

        {links.filter((l) => l.enabled).length === 0 && (
          <div
            className={`text-center p-12 border border-dashed font-sans text-sm ${
              isDarkPublic
                ? "border-slate-800 text-slate-500 bg-slate-900/50"
                : "border-slate-200 text-slate-400 bg-slate-50/50"
            }`}
          >
            Hồ sơ này chưa có liên kết hoạt động nào.
          </div>
        )}
      </div>
    </div>
  );
}
