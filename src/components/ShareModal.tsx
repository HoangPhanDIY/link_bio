import { useState } from "react";
import LucideIcon from "./LucideIcon";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  accentColor: string;
}

export default function ShareModal({ isOpen, onClose, accentColor }: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  if (!isOpen) return null;

  const shareUrl = window.location.href;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareOptions = [
    {
      name: "Facebook",
      icon: "Facebook",
      color: "#1877F2",
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
    },
    {
      name: "Messenger",
      icon: "MessageCircle",
      color: "#0084FF",
      url: `https://www.facebook.com/dialog/send?link=${encodeURIComponent(shareUrl)}&app_id=291494419107518&redirect_uri=${encodeURIComponent(shareUrl)}`,
    },
    {
      name: "Zalo",
      icon: "PhoneCall", // Lucide fallback will match
      color: "#0068FF",
      url: `https://zalo.me/share?to=&url=${encodeURIComponent(shareUrl)}`,
    },
    {
      name: "Telegram",
      icon: "Send",
      color: "#0088cc",
      url: `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}`,
    },
    {
      name: "Twitter / X",
      icon: "Twitter",
      color: "#1DA1F2",
      url: `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}`,
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 flex flex-col gap-4 animate-in zoom-in-95 duration-200 text-slate-800">
        <div className="flex justify-between items-center pb-2 border-b border-slate-100">
          <h3 className="font-display font-extrabold text-slate-800 text-base flex items-center gap-2">
            <LucideIcon name="Share2" size={18} style={{ color: accentColor }} />
            <span>Chia sẻ trang web</span>
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <LucideIcon name="X" size={16} />
          </button>
        </div>

        <p className="text-xs text-slate-500 font-medium leading-relaxed">
          Chia sẻ trang hồ sơ Vivid Persona của bạn đến bạn bè hoặc cộng đồng thông qua các ứng dụng yêu thích.
        </p>

        {/* Copy link bar */}
        <div className="flex gap-2 items-center bg-slate-50 border border-slate-200 rounded-lg p-2">
          <input
            type="text"
            readOnly
            value={shareUrl}
            className="bg-transparent text-xs text-slate-600 outline-none flex-1 font-mono font-medium truncate"
          />
          <button
            onClick={handleCopy}
            className="px-3 py-1.5 rounded-md text-[10px] font-bold text-white transition-all cursor-pointer select-none shrink-0"
            style={{ backgroundColor: accentColor }}
          >
            {copied ? "Đã chép" : "Sao chép"}
          </button>
        </div>

        {/* Grid of sharing options */}
        <div className="grid grid-cols-5 gap-2 py-2">
          {shareOptions.map((opt) => (
            <a
              key={opt.name}
              href={opt.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-1.5 p-1 rounded-xl hover:bg-slate-50 transition-colors text-center group"
            >
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-white shadow-xs group-hover:scale-105 transition-transform"
                style={{ backgroundColor: opt.color }}
              >
                <LucideIcon name={opt.icon} size={16} />
              </div>
              <span className="text-[9px] font-extrabold text-slate-600 group-hover:text-slate-800 transition-colors truncate w-full">
                {opt.name}
              </span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
