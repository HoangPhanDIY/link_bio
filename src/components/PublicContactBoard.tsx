import React, { useState } from "react";
import { AppearanceSettings } from "../types";
import { DBMessage, dbService } from "../dbService";
import LucideIcon from "./LucideIcon";

interface PublicContactBoardProps {
  appearance: AppearanceSettings;
  isDarkPublic: boolean;
  onSendMessage: (savedMessage: DBMessage) => void;
}

export default function PublicContactBoard({
  appearance,
  isDarkPublic,
  onSendMessage,
}: PublicContactBoardProps) {
  const [visitorName, setVisitorName] = useState("");
  const [visitorEmail, setVisitorEmail] = useState("");
  const [visitorContent, setVisitorContent] = useState("");
  const [isSending, setIsSending] = useState(false);

  const handleSendMessageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!visitorName.trim() || !visitorEmail.trim() || !visitorContent.trim()) {
      alert("Vui lòng điền đầy đủ các trường thông tin!");
      return;
    }

    setIsSending(true);
    try {
      const saved = await dbService.saveMessage({
        ho_ten: visitorName.trim(),
        email: visitorEmail.trim(),
        noi_dung: visitorContent.trim(),
      });
      if (saved) {
        onSendMessage(saved);
        setVisitorName("");
        setVisitorEmail("");
        setVisitorContent("");
      } else {
        alert("Gửi lời nhắn thất bại. Vui lòng kiểm tra lại cấu hình DB.");
      }
    } catch (err) {
      console.error(err);
      alert("Lỗi kết nối hệ thống khi gửi tin nhắn.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div
      className={`w-full p-6 sm:p-8 rounded-md border text-left transition-colors duration-300 mt-8 ${
        isDarkPublic
          ? "bg-slate-900 border-slate-800"
          : "bg-white border-slate-150 shadow-sm"
      }`}
    >
      <h3 className="font-bold text-sm sm:text-base mb-1 flex items-center gap-2">
        <LucideIcon
          name="MessageSquare"
          size={16}
          style={{ color: appearance.accentColor }}
        />
        Nhắn tin cho tôi
      </h3>
      <p
        className={`text-xs sm:text-sm mb-6 leading-relaxed ${
          isDarkPublic ? "text-slate-400" : "text-slate-500"
        }`}
      >
        Gửi lời chúc, góp ý hoặc tin nhắn liên hệ trực tiếp cho quản trị viên.
      </p>
      <form onSubmit={handleSendMessageSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label
              className={`text-[10px] font-bold uppercase tracking-wider ${
                isDarkPublic ? "text-slate-400" : "text-slate-500"
              }`}
            >
              Họ và tên
            </label>
            <input
              type="text"
              required
              placeholder="Họ và tên của bạn"
              value={visitorName}
              onChange={(e) => setVisitorName(e.target.value)}
              className={`w-full rounded-xl px-4 py-3 outline-none transition-all text-xs sm:text-sm border ${
                isDarkPublic
                  ? "bg-slate-950 border-slate-800 text-slate-100 focus:border-indigo-500"
                  : "bg-slate-50 border-slate-200 text-slate-800 focus:border-indigo-500"
              }`}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label
              className={`text-[10px] font-bold uppercase tracking-wider ${
                isDarkPublic ? "text-slate-400" : "text-slate-500"
              }`}
            >
              Địa chỉ Email
            </label>
            <input
              type="email"
              required
              placeholder="Địa chỉ Email"
              value={visitorEmail}
              onChange={(e) => setVisitorEmail(e.target.value)}
              className={`w-full rounded-xl px-4 py-3 outline-none transition-all text-xs sm:text-sm border ${
                isDarkPublic
                  ? "bg-slate-950 border-slate-800 text-slate-100 focus:border-indigo-500"
                  : "bg-slate-50 border-slate-200 text-slate-800 focus:border-indigo-500"
              }`}
            />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label
            className={`text-[10px] font-bold uppercase tracking-wider ${
              isDarkPublic ? "text-slate-400" : "text-slate-500"
            }`}
          >
            Nội dung lời nhắn
          </label>
          <textarea
            required
            rows={4}
            placeholder="Nội dung lời nhắn..."
            value={visitorContent}
            onChange={(e) => setVisitorContent(e.target.value)}
            className={`w-full rounded-xl px-4 py-3 outline-none transition-all text-xs sm:text-sm border resize-none ${
              isDarkPublic
                ? "bg-slate-950 border-slate-800 text-slate-100 focus:border-indigo-500"
                : "bg-slate-50 border-slate-200 text-slate-800 focus:border-indigo-500"
            }`}
          />
        </div>
        <div className="flex justify-end mt-2">
          <button
            type="submit"
            disabled={isSending}
            className="text-white px-6 py-3 rounded-xl font-bold hover:brightness-110 active:scale-[0.98] transition-all text-xs sm:text-sm cursor-pointer shadow-md w-full sm:w-auto flex items-center justify-center gap-1.5"
            style={{ backgroundColor: appearance.accentColor }}
          >
            {isSending && (
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            <span>Gửi tin nhắn</span>
          </button>
        </div>
      </form>
    </div>
  );
}
