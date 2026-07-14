import React, { useState } from "react";
import { DBUser } from "../supabase";
import { dbService } from "../dbService";
import LucideIcon from "./LucideIcon";

interface AdminLoginProps {
  onLoginSuccess: (user: DBUser) => void;
  onCancel: () => void;
  accentColor: string;
}

export default function AdminLogin({
  onLoginSuccess,
  onCancel,
  accentColor,
}: AdminLoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const user = await dbService.loginAdmin(email.trim(), password.trim());
      if (user) {
        onLoginSuccess(user);
      } else {
        setErrorMessage(
          "Tài khoản hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại!",
        );
      }
    } catch (err) {
      console.error(err);
      setErrorMessage(
        "Đã xảy ra lỗi kết nối. Hãy chắc chắn bảng nguoi_dung đã tồn tại hoặc sử dụng tài khoản thử nghiệm!",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUseDemoAccount = () => {
    setEmail("admin@vividpersona.com");
    setPassword("1234567890hH@@");
    setErrorMessage(null);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl border border-slate-100 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Banner header top */}
        <div
          className="p-6 text-center border-b border-slate-100 relative space-y-2"
          style={{ borderTop: `4px solid ${accentColor}` }}
        >
          {/* Logo brand */}
          <div
            className="mx-auto w-12 h-12 rounded-full flex items-center justify-center shadow-xs"
            style={{ backgroundColor: `${accentColor}10`, color: accentColor }}
          >
            <LucideIcon name="ShieldAlert" size={24} />
          </div>

          <div>
            <h2 className="font-display text-lg font-bold text-slate-800">
              Đăng nhập vào Hệ thống
            </h2>
            <p className="text-xs text-slate-400">
              Chỉ dành cho quản trị viên cấu hình Vivid Persona
            </p>
          </div>

          <button
            onClick={onCancel}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            title="Đóng"
          >
            <LucideIcon name="X" size={16} />
          </button>
        </div>

        {/* Login Form Body */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-4">
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs font-semibold flex items-start gap-2 animate-shake">
              <LucideIcon
                name="AlertCircle"
                size={14}
                className="shrink-0 mt-0.5"
              />
              <span>{errorMessage}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 font-mono">
              Địa chỉ Email
            </label>
            <div className="relative">
              <LucideIcon
                name="Mail"
                className="absolute left-3.5 top-3 text-slate-400"
                size={16}
              />
              <input
                type="email"
                required
                placeholder="admin@vividpersona.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 text-sm text-slate-800 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 font-mono">
              Mật khẩu Admin
            </label>
            <div className="relative">
              <LucideIcon
                name="KeyRound"
                className="absolute left-3.5 top-3 text-slate-400"
                size={16}
              />
              <input
                type="password"
                required
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 text-sm text-slate-800 transition-all font-mono"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full text-white py-3 rounded-xl font-bold transition-all hover:brightness-110 active:scale-[0.98] flex items-center justify-center gap-1.5 shadow-sm text-sm cursor-pointer"
            style={{ backgroundColor: accentColor }}
          >
            {isSubmitting ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <LucideIcon name="LogIn" size={16} />
            )}
            <span>Đăng nhập hệ thống</span>
          </button>

          {/* Quick Demo Helper */}
          {/* <div className="border-t border-slate-100 pt-4 text-center space-y-2">
            <p className="text-[10px] text-slate-400">
              Bạn chưa có tài khoản hoặc đang chạy thử nghiệm?
            </p>
            <button
              type="button"
              onClick={handleUseDemoAccount}
              className="inline-flex items-center gap-1 bg-slate-50 hover:bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg text-[10px] font-bold border border-slate-200 transition-all cursor-pointer"
            >
              <LucideIcon name="UserCheck" size={12} />
              Sử dụng tài khoản Thử nghiệm (Demo)
            </button>
            <div className="text-[9px] text-slate-400 font-mono mt-1">
              Email: admin@vividpersona.com | Pass: 1234567890hH@@
            </div>
          </div> */}
        </form>
      </div>
    </div>
  );
}
