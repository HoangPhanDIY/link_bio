import React, { useState } from "react";
import { DBPost, supabase } from "../supabase";
import LucideIcon from "./LucideIcon";
import ImageCropperModal from "./ImageCropperModal";

interface PostsTabProps {
  posts: DBPost[];
  links: any[];
  onAddPost: (content: string, imageUrl: string | null, lienKetId: string | null) => Promise<void>;
  onDeletePost: (id: string) => Promise<void>;
  accentColor: string;
}

export default function PostsTab({
  posts,
  links,
  onAddPost,
  onDeletePost,
  accentColor,
}: PostsTabProps) {
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [selectedLinkId, setSelectedLinkId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Cropper states
  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropperFile, setCropperFile] = useState<File | null>(null);

  const uploadFileToSupabase = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `uploads/posts/${fileName}`;

      const { error } = await supabase.storage
        .from("images")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type,
        });

      if (error) {
        throw error;
      }

      const { data: publicUrlData } = supabase.storage
        .from("images")
        .getPublicUrl(filePath);

      return publicUrlData.publicUrl;
    } catch (err: any) {
      console.error("Error uploading post image to Storage:", err);
      if (window.showNotification) {
        window.showNotification(`Không thể tải ảnh bài viết lên: ${err.message || err}`, "error");
      } else {
        alert(`Không thể tải ảnh bài viết lên: ${err.message || err}`);
      }
      return null;
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCropperFile(file);
      setCropperOpen(true);
    }
  };

  const handleCropComplete = async (croppedFile: File) => {
    setCropperOpen(false);
    if (!cropperFile) return;

    if (window.showNotification) {
      window.showNotification("Đang tải ảnh đã cắt lên...", "info");
    }

    const uploadedUrl = await uploadFileToSupabase(croppedFile);
    if (uploadedUrl) {
      setImageUrl(uploadedUrl);
      if (window.showNotification) {
        window.showNotification("Cắt và tải ảnh lên thành công!", "success");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setIsSubmitting(true);
    try {
      await onAddPost(content, imageUrl, selectedLinkId);
      setContent("");
      setImageUrl(null);
      setSelectedLinkId(null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa bài viết này không?")) {
      try {
        await onDeletePost(id);
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-800">Bài viết & Status</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Đăng trạng thái, chia sẻ suy nghĩ và thông báo đến người theo dõi của bạn ở chế độ công khai.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left column: Create Post Form */}
        <div className="lg:col-span-5 bg-white border border-slate-100 rounded-2xl p-5 shadow-xs space-y-4">
          <h2 className="font-display font-bold text-slate-800 text-sm sm:text-base">Tạo bài viết mới</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Nội dung bài viết *
              </label>
              <textarea
                required
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Nhập nội dung status của bạn ở đây... (hỗ trợ xuống dòng)"
                rows={5}
                className="w-full p-3 rounded-xl border border-slate-200 outline-none transition-all text-xs sm:text-sm font-sans font-medium resize-none focus:ring-1 focus:ring-indigo-100 focus:border-indigo-500 placeholder:text-slate-400"
              />
              <div className="text-right text-[10px] text-slate-400 font-semibold font-mono">
                {content.length}/1000 kí tự
              </div>
            </div>

            {/* Post image select */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Hình ảnh đính kèm (Không bắt buộc)
              </label>
              
              {imageUrl ? (
                <div className="relative rounded-xl overflow-hidden border border-slate-150 max-h-56 bg-slate-50 flex items-center justify-center">
                  <img src={imageUrl} alt="Uploaded post preview" className="max-w-full max-h-56 object-contain" />
                  <button
                    type="button"
                    onClick={() => setImageUrl(null)}
                    className="absolute top-2 right-2 bg-slate-900/80 hover:bg-slate-900 text-white p-1.5 rounded-full shadow-md transition-colors cursor-pointer"
                  >
                    <LucideIcon name="Trash2" size={12} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-600 transition-colors cursor-pointer border-dashed w-full justify-center">
                    <LucideIcon name="Image" size={14} className="text-slate-400" />
                    <span>Chọn và cắt ảnh status</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="hidden"
                    />
                  </label>
                </div>
              )}
            </div>

            {/* Associated Bio Link Selection */}
            <div className="space-y-1">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Liên kết điều hướng (Nút "Liên hệ")
              </label>
              <select
                value={selectedLinkId || ""}
                onChange={(e) => setSelectedLinkId(e.target.value || null)}
                className="w-full p-2.5 rounded-xl border border-slate-200 outline-none transition-all text-xs sm:text-sm font-sans font-medium focus:ring-1 focus:ring-indigo-100 focus:border-indigo-500 bg-white"
              >
                <option value="">-- Không điều hướng --</option>
                {links
                  .filter((l) => l.enabled)
                  .map((link) => (
                    <option key={link.id} value={link.id}>
                      {link.title} ({link.url})
                    </option>
                  ))}
              </select>
              <p className="text-[10px] text-slate-400 font-medium">
                Chọn liên kết hoạt động để người đọc click nút "Liên hệ" sẽ tự động chuyển hướng đến đó.
              </p>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !content.trim()}
              className="w-full py-2.5 rounded-xl text-white font-bold transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer hover:opacity-95 active:scale-[0.99] text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: accentColor }}
            >
              {isSubmitting ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <LucideIcon name="Send" size={14} />
              )}
              <span>Đăng trạng thái</span>
            </button>
          </form>
        </div>

        {/* Right column: Recent Statuses Feed */}
        <div className="lg:col-span-7 space-y-4">
          <h2 className="font-display font-bold text-slate-800 text-sm sm:text-base">Các status đã đăng ({posts.length})</h2>

          <div className="space-y-4">
            {posts.map((post) => {
              const formattedDate = post.ngay_tao
                ? new Date(post.ngay_tao).toLocaleString("vi-VN", {
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
                  className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col gap-3 relative group"
                >
                  <button
                    onClick={() => handleDelete(post.id)}
                    className="absolute top-4 right-4 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 p-2 rounded-xl transition-colors cursor-pointer lg:opacity-0 group-hover:opacity-100"
                    title="Xóa bài viết"
                  >
                    <LucideIcon name="Trash2" size={14} />
                  </button>

                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-600 border border-slate-200">
                      AD
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-extrabold text-slate-800">Quản trị viên</h4>
                      <p className="text-[10px] text-slate-400 font-mono">{formattedDate}</p>
                    </div>
                  </div>

                  <p className="text-slate-700 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-sans">
                    {post.noi_dung}
                  </p>

                  {post.url_hinh_anh && (
                    <div className="rounded-xl overflow-hidden border border-slate-100 bg-slate-50 max-h-80 flex items-center justify-center">
                      <img
                        src={post.url_hinh_anh}
                        alt="Status asset"
                        className="max-h-80 w-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  )}
                </div>
              );
            })}

            {posts.length === 0 && (
              <div className="text-center p-12 border border-dashed border-slate-200 rounded-2xl font-sans text-sm text-slate-400 bg-white">
                Chưa có status/bài viết nào được đăng. Hãy bắt đầu đăng suy nghĩ đầu tiên của bạn!
              </div>
            )}
          </div>
        </div>
      </div>

      {cropperOpen && cropperFile && (
        <ImageCropperModal
          isOpen={cropperOpen}
          imageFile={cropperFile}
          aspectRatio={16 / 9} // elegant aspect ratio for statuses
          title="Cắt ảnh bài viết (Status)"
          onConfirm={handleCropComplete}
          onClose={() => setCropperOpen(false)}
        />
      )}
    </div>
  );
}
