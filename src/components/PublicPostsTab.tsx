import React from "react";
import { BioLink, AppearanceSettings } from "../types";
import { DBPost } from "../dbService";
import LucideIcon from "./LucideIcon";
import { formatExternalUrl } from "../utils";

interface PublicPostsTabProps {
  posts: DBPost[];
  links: BioLink[];
  appearance: AppearanceSettings;
  isDarkPublic: boolean;
  onLikePost?: (postId: string) => void;
  showNotification: (
    message: string,
    type?: "success" | "error" | "info",
  ) => void;
  isLoading?: boolean;
}

export default function PublicPostsTab({
  posts,
  links,
  appearance,
  isDarkPublic,
  onLikePost,
  showNotification,
}: PublicPostsTabProps) {
  return (
    <div className="space-y-3 animate-in fade-in duration-300 pb-8 text-left">
      {/* <div className="flex items-center">
        <h2 className="font-extrabold text-xl bg-gradient-to-t from-[#bd9867] to-[#fce3bc] bg-clip-text text-transparent">
          BÀI VIẾT
        </h2>
      </div> */}

      <div className="space-y-3">
        {(() => {
          const sortedPosts = [...posts].sort((a, b) => {
            const aPinned = a.trang_thai === 2 ? 1 : 0;
            const bPinned = b.trang_thai === 2 ? 1 : 0;
            if (bPinned !== aPinned) return bPinned - aPinned;
            return (
              new Date(b.created_at || 0).getTime() -
              new Date(a.created_at || 0).getTime()
            );
          });

          return sortedPosts.map((post) => {
            const isPinned = post.trang_thai === 2;
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
                className={`border-1 p-2 shadow-xs flex flex-col gap-2.5 relative text-slate-100 bg-slate-900/50 backdrop-blur-md [border-image:linear-gradient(to_top,#bd9867,#fce3bc)_1] ${
                  isPinned ? "border-amber-400/60 ring-1 ring-amber-400/20" : ""
                } `}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-indigo-500 bg-slate-150 shrink-0">
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
                      <p className="text-[10px] text-slate-400 ">
                        {formattedDate}
                      </p>
                    </div>
                  </div>

                  {isPinned && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 text-amber-500 shrink-0">
                      <LucideIcon
                        name="Pin"
                        size={15}
                        className="fill-amber-500"
                      />
                    </div>
                  )}
                </div>

                <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-sans">
                  {post.noi_dung}
                </p>

                {post.url_hinh_anh && (
                  <div className="rounded-md overflow-hidden border border-slate-100/10 bg-slate-950 flex items-center justify-center max-h-96">
                    <img
                      src={post.url_hinh_anh}
                      alt="Status visual assets"
                      className="w-full object-cover max-h-96"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}

                {/* Interactive edge-aligned reactions: Like, Contact, Share */}
                <div className="flex justify-between items-center w-full border-t border-slate-100/10 pt-3 px-1">
                  {/* Like Button */}
                  <button
                    onClick={() => {
                      if (onLikePost) {
                        onLikePost(post.id);
                      }
                      showNotification(
                        "Cảm ơn bạn đã thích bài viết!",
                        "success",
                      );
                    }}
                    className="flex items-center gap-1.5 text-red-600 hover:text-red-500 transition-colors text-xs font-bold cursor-pointer group"
                  >
                    <LucideIcon
                      name="Heart"
                      size={15}
                      className="fill-red-500 text-red-500"
                    />
                    <span>{post.luot_xem || 0}</span>
                  </button>

                  {/* Contact (Liên hệ) Button */}
                  <button
                    onClick={() => {
                      const associatedLink = post.lien_ket_id
                        ? links.find((l) => l.id === post.lien_ket_id)
                        : null;

                      if (associatedLink) {
                        window.open(
                          formatExternalUrl(associatedLink.url),
                          "_blank",
                        );
                        showNotification(
                          `Đang chuyển hướng đến ${associatedLink.title}...`,
                          "info",
                        );
                      } else {
                        // Fallback to first active link
                        const firstActive = links.find((l) => l.enabled);
                        if (firstActive) {
                          window.open(
                            formatExternalUrl(firstActive.url),
                            "_blank",
                          );
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
          });
        })()}

        {posts.length === 0 && (
          <div
            className={`text-center font-sans text-xs border-slate-200 text-slate-400 pt-10`}
          >
            Chưa có bài viết nào.
          </div>
        )}
      </div>
    </div>
  );
}
