import React from "react";
import { BioLink, AppearanceSettings } from "../types";
import { DBPost } from "../dbService";
import LucideIcon from "./LucideIcon";

interface PublicPostsTabProps {
  posts: DBPost[];
  links: BioLink[];
  appearance: AppearanceSettings;
  isDarkPublic: boolean;
  showNotification: (
    message: string,
    type?: "success" | "error" | "info",
  ) => void;
}

export default function PublicPostsTab({
  posts,
  links,
  appearance,
  isDarkPublic,
  showNotification,
}: PublicPostsTabProps) {
  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-8 text-left">
      {/* Section Title */}
      <div className="flex items-center gap-2">
        <h2 className={`text-xl font-bold uppercase tracking-wider text-black`}>
          Bài viết
        </h2>
      </div>

      <div className="space-y-6">
        {posts.map((post) => {
          const formattedDate = post.created_at
            ? new Date(post.created_at).toLocaleString("vi-VN", {
                hour: "2-digit",
                minute: "2-digit",
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              })
            : "Vừa xong";

          return (
            <div
              key={post.id}
              className={`border rounded-xl p-3 shadow-xs flex flex-col gap-2 ${
                isDarkPublic
                  ? "bg-slate-900 border-slate-800 text-white"
                  : "bg-white border-slate-100 text-slate-800"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-indigo-500 bg-slate-150">
                  <img
                    src={
                      appearance.avatarUrl ||
                      "/image/tuong/DauSi/Florentino.jpg"
                    }
                    alt="Author avatar"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-black">
                    {appearance.name || "Admin"}
                  </h4>
                  <p className="text-[10px] text-slate-400 ">{formattedDate}</p>
                </div>
              </div>

              <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-sans">
                {post.noi_dung}
              </p>

              {post.url_hinh_anh && (
                <div className="rounded-md overflow-hidden border border-slate-100/10 /80 bg-slate-950 flex items-center justify-center max-h-96">
                  <img
                    src={post.url_hinh_anh}
                    alt="Status visual assets"
                    className="w-full object-cover max-h-96"
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}

              {/* Interactive edge-aligned reactions: Like, Contact, Share */}
              <div className="flex justify-between items-center w-full border-t border-slate-100/10 /60 pt-3 px-1">
                {/* Like Button */}
                <button
                  onClick={() => {
                    showNotification(
                      "Cảm ơn bạn đã bày tỏ cảm xúc!",
                      "success",
                    );
                  }}
                  className="flex items-center gap-1.5 text-slate-400 hover:text-red-500 transition-colors text-xs font-bold cursor-pointer"
                >
                  <LucideIcon name="Heart" size={14} />
                  <span>Thích</span>
                </button>

                {/* Contact (Liên hệ) Button */}
                <button
                  onClick={() => {
                    const associatedLink = post.lien_ket_id
                      ? links.find((l) => l.id === post.lien_ket_id)
                      : null;

                    if (associatedLink) {
                      window.open(`https://${associatedLink.url}`, "_blank");
                      showNotification(
                        `Đang chuyển hướng đến ${associatedLink.title}...`,
                        "info",
                      );
                    } else {
                      // Fallback to first active link
                      const firstActive = links.find((l) => l.enabled);
                      if (firstActive) {
                        window.open(`https://${firstActive.url}`, "_blank");
                        showNotification(
                          `Đang chuyển hướng đến ${firstActive.title}...`,
                          "info",
                        );
                      } else {
                        showNotification(
                          "Chưa có liên kết liên hệ nào hoạt động!",
                          "error",
                        );
                      }
                    }
                  }}
                  className="flex items-center gap-1.5 text-slate-400 hover:text-emerald-500 transition-colors text-xs font-bold cursor-pointer"
                >
                  <LucideIcon name="Phone" size={14} />
                  <span>Liên hệ</span>
                </button>

                {/* Share Button */}
                <button
                  onClick={() => {
                    if (navigator.share) {
                      navigator
                        .share({
                          title: `Bài viết từ ${appearance.name}`,
                          text: post.noi_dung,
                          url: window.location.href,
                        })
                        .catch(console.error);
                    } else {
                      navigator.clipboard.writeText(
                        `${post.noi_dung}\n- ${appearance.name}`,
                      );
                      showNotification(
                        "Đã sao chép nội dung bài viết!",
                        "success",
                      );
                    }
                  }}
                  className="flex items-center gap-1.5 text-slate-400 hover:text-indigo-500 transition-colors text-xs font-bold cursor-pointer"
                >
                  <LucideIcon name="Share2" size={14} />
                  <span>Chia sẻ</span>
                </button>
              </div>
            </div>
          );
        })}

        {posts.length === 0 && (
          <div
            className={`text-center p-12 border border-dashed rounded-3xl font-sans text-xs border-slate-200 text-slate-400 bg-slate-50/50`}
          >
            Chưa có nào được đăng gần đây.
          </div>
        )}
      </div>
    </div>
  );
}
