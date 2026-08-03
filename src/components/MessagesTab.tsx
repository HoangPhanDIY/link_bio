import React, { useState } from "react";
import { DBMessage } from "../supabase";
import LucideIcon from "./LucideIcon";

interface MessagesTabProps {
  messages: DBMessage[];
  onDeleteMessage: (id: string) => Promise<void>;
  accentColor: string;
}

export default function MessagesTab({
  messages,
  onDeleteMessage,
  accentColor,
}: MessagesTabProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // Filter messages based on search query (name or email or content)
  const filteredMessages = messages.filter((msg) => {
    const term = searchTerm.toLowerCase();
    const name = (msg.ho_ten || "").toLowerCase();
    const email = (msg.email || "").toLowerCase();
    const content = (msg.noi_dung || "").toLowerCase();
    return (
      name.includes(term) || email.includes(term) || content.includes(term)
    );
  });

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa tin nhắn này khỏi hệ thống?"))
      return;
    setIsDeleting(id);
    try {
      await onDeleteMessage(id);
    } finally {
      setIsDeleting(null);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "Không rõ thời gian";
    try {
      const d = new Date(dateStr);
      return d.toLocaleString("vi-VN", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Tab Header and Statistics */}
      <div className="bg-[#1d182b]/90 border border-[#bd9867]/60 p-6 sm:p-8 shadow-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-[#bd9867]/20 text-[#fce3bc]">
              <LucideIcon name="MessageSquare" size={20} />
            </span>
            <h2 className="font-extrabold text-xl text-[#fce3bc] uppercase tracking-wider">
              Tin nhắn từ độc giả
            </h2>
          </div>
          <p className="text-slate-300 text-xs pl-1">
            Nơi nhận các tin nhắn, phản hồi hoặc lời chúc trực tiếp từ những
            người truy cập trang hồ sơ của bạn.
          </p>
        </div>

        <div className="flex gap-4">
          <div className="bg-black/40 border border-[#bd9867]/40 p-3 px-4 text-center">
            <span className="block text-xl font-black text-[#fce3bc]">
              {messages.length}
            </span>
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
              Tổng số
            </span>
          </div>
          <div className="bg-black/40 border border-[#bd9867]/40 p-3 px-4 text-center">
            <span className="block text-xl font-black text-[#fce3bc]">
              {filteredMessages.length}
            </span>
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
              Tìm thấy
            </span>
          </div>
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="relative">
        <LucideIcon
          name="Search"
          className="absolute left-4 top-3.5 text-[#bd9867]"
          size={18}
        />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Tìm kiếm tin nhắn theo họ tên, email hoặc từ khóa nội dung..."
          className="w-full bg-slate-900 border border-[#bd9867]/60 text-white pl-12 pr-4 py-3.5 outline-none focus:border-[#fce3bc] transition-all text-sm font-medium placeholder:text-slate-500 shadow-md"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm("")}
            className="absolute right-4 top-3.5 text-[#fce3bc] hover:underline font-bold text-xs cursor-pointer"
          >
            Xóa lọc
          </button>
        )}
      </div>

      {/* Messages List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredMessages.map((msg) => (
          <div
            key={msg.id}
            className="bg-[#1d182b]/90 border border-[#bd9867]/60 hover:border-[#fce3bc] p-5 shadow-xl transition-all flex flex-col justify-between group"
          >
            <div className="space-y-3.5">
              {/* Sender Metadata Row */}
              <div className="flex justify-between items-start gap-2">
                <div className="space-y-0.5 min-w-0">
                  <h4 className="font-bold text-[#fce3bc] text-sm truncate flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-[#bd9867]" />
                    {msg.ho_ten || "Người dùng ẩn danh"}
                  </h4>
                  <p className="text-xs text-slate-400 truncate">
                    {msg.email || "Không có email"}
                  </p>
                </div>

                <span className="text-[10px] text-[#fce3bc] font-bold bg-black/40 border border-[#bd9867]/40 px-2 py-1 shrink-0">
                  {formatDate(msg.created_at)}
                </span>
              </div>

              {/* Message content block */}
              <div className="bg-black/40 p-3 border border-[#bd9867]/40 text-slate-200 text-xs leading-relaxed whitespace-pre-wrap">
                {msg.noi_dung || "Nội dung tin nhắn trống."}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex justify-between items-center pt-4 mt-2 border-t border-[#bd9867]/30">
              <a
                href={
                  msg.email
                    ? `mailto:${msg.email}?subject=Phản hồi từ Vivid Persona`
                    : "#"
                }
                className={`inline-flex items-center gap-1 text-xs font-bold ${msg.email ? "text-[#fce3bc] hover:underline" : "text-slate-500 opacity-50 cursor-not-allowed"}`}
                onClick={(e) => {
                  if (!msg.email) e.preventDefault();
                }}
              >
                <LucideIcon name="Mail" size={13} />
                <span>Trả lời email</span>
              </a>

              <button
                type="button"
                onClick={() => handleDelete(msg.id)}
                disabled={isDeleting === msg.id}
                className="text-red-400 hover:text-red-300 hover:bg-red-950/40 p-1.5 transition-all text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                {isDeleting === msg.id ? (
                  <span className="w-3 h-3 border-2 border-red-500/30 border-t-red-500 animate-spin" />
                ) : (
                  <LucideIcon name="Trash2" size={13} />
                )}
                <span>Xóa tin</span>
              </button>
            </div>
          </div>
        ))}

        {filteredMessages.length === 0 && (
          <div className="col-span-full bg-[#1d182b]/90 border border-dashed border-[#bd9867]/60 p-16 text-center text-slate-400 flex flex-col items-center justify-center space-y-3 shadow-xl">
            <div className="p-4 bg-black/40 border border-[#bd9867]/40 text-[#fce3bc]">
              <LucideIcon name="MessageSquare" size={32} />
            </div>
            <div className="space-y-1">
              <p className="font-extrabold text-[#fce3bc] text-sm">
                Chưa có tin nhắn nào
              </p>
              <p className="text-xs max-w-xs mx-auto text-slate-300">
                {searchTerm
                  ? "Không tìm thấy tin nhắn nào khớp với từ khóa tìm kiếm."
                  : "Hộp thư hiện tại đang trống. Khi có người truy cập nhắn tin từ hồ sơ công khai, tin nhắn sẽ xuất hiện tại đây."}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
