import React, { useState } from "react";
import { DBPost, supabase } from "../supabase";
import LucideIcon from "./LucideIcon";
import ImageCropperModal from "./ImageCropperModal";

interface PostsTabProps {
  posts: DBPost[];
  links: any[];
  onAddPost: (
    content: string,
    imageUrl: string | null,
    lienKetId: string | null,
  ) => Promise<void>;
  onUpdatePost: (
    id: string,
    content: string,
    imageUrl: string | null,
    lienKetId: string | null,
  ) => Promise<void>;
  onDeletePost: (id: string) => Promise<void>;
  onTogglePinPost?: (id: string, currentStatus?: number) => Promise<void>;
  accentColor: string;
}

export default function PostsTab({
  posts,
  links,
  onAddPost,
  onUpdatePost,
  onDeletePost,
  onTogglePinPost,
  accentColor,
}: PostsTabProps) {
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [selectedLinkId, setSelectedLinkId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingPost, setEditingPost] = useState<DBPost | null>(null);

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
        window.showNotification(
          `Không thể tải ảnh bài viết lên: ${err.message || err}`,
          "error",
        );
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
      if (editingPost) {
        await onUpdatePost(editingPost.id, content, imageUrl, selectedLinkId);
        setEditingPost(null);
      } else {
        await onAddPost(content, imageUrl, selectedLinkId);
      }
      setContent("");
      setImageUrl(null);
      setSelectedLinkId(null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEdit = (post: DBPost) => {
    setEditingPost(post);
    setContent(post.noi_dung || "");
    setImageUrl(post.url_hinh_anh);
    setSelectedLinkId(post.lien_ket_id);

    // Scroll smoothly to form
    const formElement = document.getElementById("post-form-card");
    if (formElement) {
      formElement.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const handleCancelEdit = () => {
    setEditingPost(null);
    setContent("");
    setImageUrl(null);
    setSelectedLinkId(null);
  };

  const handleDelete = async (id: string) => {
    if (editingPost?.id === id) {
      handleCancelEdit();
    }
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
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left column: Create Post Form */}
        <div
          id="post-form-card"
          className="lg:col-span-5 bg-slate-900/50 border border-slate-100 p-5 shadow-xs space-y-4"
        >
          <h2 className="font-display font-bold text-[#fce3bc] text-sm sm:text-base flex items-center justify-between">
            <span>
              {editingPost ? "Chỉnh sửa bài viết" : "Tạo bài viết mới"} - Số
              bài: {posts.length}
            </span>
            {editingPost && (
              <span className="bg-amber-100 text-amber-800 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded animate-pulse">
                Đang sửa
              </span>
            )}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[#fce3bc]">
                Nội dung bài viết *
              </label>
              <textarea
                required
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Nhập nội dung status của bạn ở đây... (hỗ trợ xuống dòng)"
                rows={5}
                className="w-full p-3 rounded border border-slate-200 outline-none transition-all text-xs sm:text-sm font-sans font-medium resize-none focus:ring-1 focus:ring-indigo-100 focus:border-indigo-500 placeholder:text-[#fce3bc]"
              />
              <div className="text-right text-[10px] text-[#fce3bc] font-semibold ">
                {content.length}/1000 kí tự
              </div>
            </div>

            {/* Post image select */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[#fce3bc]">
                Hình ảnh đính kèm (Không bắt buộc)
              </label>

              {imageUrl ? (
                <div className="relative rounded overflow-hidden border border-slate-150 max-h-56 bg-slate-50 flex items-center justify-center">
                  <img
                    src={imageUrl}
                    alt="Uploaded post preview"
                    className="max-w-full max-h-56 object-contain"
                  />
                  <button
                    type="button"
                    onClick={() => setImageUrl(null)}
                    className="absolute top-2 right-2 bg-slate-900/80 hover:bg-slate-900 text-[#fce3bc] p-1.5 rounded-full shadow-md transition-colors cursor-pointer"
                  >
                    <LucideIcon name="Trash2" size={12} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 hover:bg-slate-50 rounded text-xs font-bold text-[#fce3bc] transition-colors cursor-pointer border-dashed w-full justify-center">
                    <LucideIcon
                      name="Image"
                      size={14}
                      className="text-[#fce3bc]"
                    />
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
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[#fce3bc]">
                Liên kết điều hướng (Nút "Liên hệ")
              </label>
              <select
                value={selectedLinkId || ""}
                onChange={(e) => setSelectedLinkId(e.target.value || null)}
                className="w-full p-2.5 rounded border border-slate-200 outline-none transition-all text-xs sm:text-sm font-sans font-medium focus:ring-1 focus:ring-indigo-100 focus:border-indigo-500 bg-slate-900/50"
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
              <p className="text-[10px] text-[#fce3bc] font-medium">
                Chọn liên kết hoạt động để người đọc click nút "Liên hệ" sẽ tự
                động chuyển hướng đến đó.
              </p>
            </div>

            <div className="flex gap-2">
              {editingPost && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-4 py-2.5 rounded border border-slate-200 hover:bg-slate-50 text-[#fce3bc] font-bold text-xs sm:text-sm transition-all cursor-pointer active:scale-95"
                >
                  Hủy bỏ
                </button>
              )}
              <button
                type="submit"
                disabled={isSubmitting || !content.trim()}
                className="flex-1 py-2.5 rounded text-[#fce3bc] font-bold transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer hover:opacity-95 active:scale-[0.99] text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: accentColor }}
              >
                {isSubmitting ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <LucideIcon name={editingPost ? "Save" : "Send"} size={14} />
                )}
                <span>
                  {editingPost ? "Cập nhật bài viết" : "Đăng trạng thái"}
                </span>
              </button>
            </div>
          </form>
        </div>

        {/* Right column: Recent Statuses Feed */}
        <div className="lg:col-span-7 space-y-4">
          <div className="space-y-4">
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
                  className="bg-slate-900/50 border p-5 shadow-xs hover:shadow-md transition-all flex flex-col gap-3 relative group"
                >
                  <div className="absolute top-4 right-4 flex items-center gap-2 lg:opacity-0 group-hover:opacity-100 transition-all duration-200">
                    {onTogglePinPost && (
                      <button
                        onClick={() =>
                          onTogglePinPost(post.id, post.trang_thai)
                        }
                        className={`p-2 rounded transition-colors cursor-pointer ${
                          post.trang_thai === 2
                            ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
                            : "bg-slate-100 text-[#fce3bc] hover:bg-slate-200"
                        }`}
                        title={
                          post.trang_thai === 2
                            ? "Bỏ ghim bài viết"
                            : "Ghim bài viết lên đầu"
                        }
                      >
                        <LucideIcon
                          name="Pin"
                          size={14}
                          className={
                            post.trang_thai === 2 ? "fill-amber-600" : ""
                          }
                        />
                      </button>
                    )}
                    <button
                      onClick={() => handleStartEdit(post)}
                      className="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 hover:text-indigo-700 p-2 rounded transition-colors cursor-pointer"
                      title="Sửa bài viết"
                    >
                      <LucideIcon name="Edit" size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(post.id)}
                      className="bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 p-2 rounded transition-colors cursor-pointer"
                      title="Xóa bài viết"
                    >
                      <LucideIcon name="Trash2" size={14} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2.5">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs sm:text-sm font-extrabold white">
                            Quản trị viên
                          </h4>
                          {post.trang_thai === 2 && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-300 text-[10px] font-extrabold uppercase">
                              <LucideIcon
                                name="Pin"
                                size={10}
                                className="fill-amber-600"
                              />
                              Đã ghim
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-[#fce3bc]">
                          {formattedDate}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 text-xs font-bold text-rose-500 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-100 shrink-0">
                      <LucideIcon
                        name="Heart"
                        size={12}
                        className="fill-rose-500"
                      />
                      <span>{post.luot_xem || 0} lượt thích</span>
                    </div>
                  </div>

                  <p className="text-[#fce3bc] text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-sans">
                    {post.noi_dung}
                  </p>

                  {post.url_hinh_anh && (
                    <div className="rounded overflow-hidden border border-slate-100 bg-slate-50 max-h-80 flex items-center justify-center">
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
              <div className="text-center p-12 border border-dashed border-slate-200 rounded-md font-sans text-sm text-[#fce3bc] bg-slate-900/50">
                Chưa có bài viết nào được đăng. Hãy bắt đầu đăng suy nghĩ đầu
                tiên của bạn!
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
