import React, { useState, useEffect } from "react";
import { DBUser, supabase } from "../supabase";
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
  const [mode, setMode] = useState<"login" | "register">("login");

  // Login form state
  const [loginKey, setLoginKey] = useState(""); // Email or Username
  const [loginPassword, setLoginPassword] = useState("");

  // Registration form state
  const [regUsername, setRegUsername] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleRegisterDirectly = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regUsername.trim() || !regEmail.trim() || !regPassword.trim()) {
      setErrorMessage("Vui lòng nhập đầy đủ thông tin!");
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setErrorMessage("Mật khẩu xác nhận không khớp!");
      return;
    }

    if (regPassword.length < 6) {
      setErrorMessage("Mật khẩu phải dài ít nhất 6 ký tự!");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      // Check if username already exists in profiles
      const { data: existingUser } = await supabase
        .from("profiles")
        .select("id")
        .eq("ten_dang_nhap", regUsername.trim())
        .maybeSingle();

      if (existingUser) {
        setErrorMessage("Tên đăng nhập này đã tồn tại!");
        setIsSubmitting(false);
        return;
      }

      const newUser = await dbService.registerUser(
        regUsername.trim(),
        regEmail.trim(),
        regPassword.trim(),
      );

      if (window.showNotification) {
        window.showNotification("Đăng ký tài khoản thành công!", "success");
      }

      onLoginSuccess(newUser);
    } catch (err: any) {
      setErrorMessage(err.message || "Không thể tạo tài khoản.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLocalLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginKey.trim() || !loginPassword.trim()) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      // Check if it is the legacy admin account
      if (
        loginKey.trim() === "admin@vividpersona.com" &&
        loginPassword.trim() === "1234567890hH@@"
      ) {
        const adminProfile = await dbService.getProfile();
        if (adminProfile) {
          onLoginSuccess(adminProfile);
          if (window.showNotification) {
            window.showNotification(
              "Chào mừng Quản trị viên trở lại!",
              "success",
            );
          }
          return;
        }
      }

      // 1. Try admin login
      const adminAttempt = await dbService.loginAdmin(
        loginKey.trim(),
        loginPassword.trim(),
      );
      if (adminAttempt) {
        onLoginSuccess(adminAttempt);
        if (window.showNotification) {
          window.showNotification(
            "Chào mừng Quản trị viên trở lại!",
            "success",
          );
        }
        return;
      }

      // 2. Try normal user login (using plain-text password)
      const user = await dbService.loginUser(loginKey.trim(), loginPassword.trim());
      if (user) {
        onLoginSuccess(user);
        if (window.showNotification) {
          window.showNotification(
            `Chào mừng ${user.ten_dang_nhap} trở lại!`,
            "success",
          );
        }
      } else {
        setErrorMessage("Tên đăng nhập/Email hoặc mật khẩu không đúng.");
      }
    } catch (err) {
      console.error(err);
      setErrorMessage("Đã xảy ra lỗi khi đăng nhập. Vui lòng thử lại!");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white w-full max-w-md rounded-2xl border border-slate-100 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Banner header top */}
        <div
          className="p-6 text-center border-b border-slate-100 relative space-y-2 bg-gradient-to-b from-slate-50 to-white"
          style={{ borderTop: `5px solid ${accentColor}` }}
        >
          <div
            className="mx-auto w-12 h-12 rounded-full flex items-center justify-center shadow-md"
            style={{ backgroundColor: `${accentColor}10`, color: accentColor }}
          >
            <LucideIcon
              name={mode === "login" ? "LogIn" : "UserPlus"}
              size={22}
            />
          </div>

          <div>
            <h2 className="font-display text-lg font-black text-slate-800">
              {mode === "login" && "Đăng nhập"}
              {mode === "register" && "Tạo tài khoản mới"}
            </h2>
            <p className="text-xs text-slate-400 font-medium">
              {mode === "login" && "Sử dụng tài khoản cá nhân để kết nối"}
              {mode === "register" &&
                "Đăng ký thành viên để khám phá giáo án và tiện ích"}
            </p>
          </div>

          <button
            onClick={onCancel}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer p-1 rounded-full hover:bg-slate-100"
            title="Đóng"
          >
            <LucideIcon name="X" size={16} />
          </button>
        </div>

        <div className="p-6 sm:p-8 space-y-4">
          {/* Messages block */}
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs font-semibold flex items-start gap-2.5 animate-shake">
              <LucideIcon
                name="AlertCircle"
                size={14}
                className="shrink-0 mt-0.5"
              />
              <span className="flex-1">{errorMessage}</span>
            </div>
          )}

          {/* MODE 1: LOGIN */}
          {mode === "login" && (
            <form onSubmit={handleLocalLoginSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider font-sans">
                  Email hoặc Tên đăng nhập
                </label>
                <div className="relative">
                  <LucideIcon
                    name="Mail"
                    className="absolute left-3.5 top-3 text-slate-400"
                    size={16}
                  />
                  <input
                    type="text"
                    required
                    placeholder="Nhập email hoặc tên đăng nhập..."
                    value={loginKey}
                    onChange={(e) => setLoginKey(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 text-sm text-slate-800 transition-all font-medium"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider font-sans">
                  Mật khẩu
                </label>
                <div className="relative">
                  <LucideIcon
                    name="Lock"
                    className="absolute left-3.5 top-3 text-slate-400"
                    size={16}
                  />
                  <input
                    type="password"
                    required
                    placeholder="Nhập mật khẩu..."
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 text-sm text-slate-800 transition-all font-medium"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full text-white py-3 rounded-xl font-bold transition-all hover:brightness-105 active:scale-[0.98] flex items-center justify-center gap-1.5 shadow-md text-sm cursor-pointer mt-2"
                style={{ backgroundColor: accentColor }}
              >
                {isSubmitting ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <LucideIcon name="LogIn" size={16} />
                )}
                <span>Đăng nhập ngay</span>
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setMode("register");
                    setErrorMessage(null);
                  }}
                  className="text-xs text-slate-500 hover:text-indigo-600 font-bold transition-all"
                >
                  Bạn chưa có tài khoản?{" "}
                  <span className="underline">Đăng ký thành viên</span>
                </button>
              </div>
            </form>
          )}

          {/* MODE 2: REGISTER */}
          {mode === "register" && (
            <form onSubmit={handleRegisterDirectly} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider font-sans">
                  Tên đăng nhập (Username)
                </label>
                <div className="relative">
                  <LucideIcon
                    name="User"
                    className="absolute left-3.5 top-3 text-slate-400"
                    size={16}
                  />
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: hoangdev99"
                    value={regUsername}
                    onChange={(e) =>
                      setRegUsername(
                        e.target.value.toLowerCase().replace(/\s+/g, ""),
                      )
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 text-sm text-slate-800 transition-all font-medium"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider font-sans">
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
                    placeholder="Ví dụ: example@gmail.com"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 text-sm text-slate-800 transition-all font-medium"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider font-sans">
                  Mật khẩu
                </label>
                <div className="relative">
                  <LucideIcon
                    name="Lock"
                    className="absolute left-3.5 top-3 text-slate-400"
                    size={16}
                  />
                  <input
                    type="password"
                    required
                    placeholder="Mật khẩu tối thiểu 6 ký tự..."
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 text-sm text-slate-800 transition-all font-medium"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider font-sans">
                  Nhập lại Mật khẩu
                </label>
                <div className="relative">
                  <LucideIcon
                    name="Lock"
                    className="absolute left-3.5 top-3 text-slate-400"
                    size={16}
                  />
                  <input
                    type="password"
                    required
                    placeholder="Xác nhận lại mật khẩu..."
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 text-sm text-slate-800 transition-all font-medium"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full text-white py-3 rounded-xl font-bold transition-all hover:brightness-105 active:scale-[0.98] flex items-center justify-center gap-1.5 shadow-md text-sm cursor-pointer mt-2"
                style={{ backgroundColor: accentColor }}
              >
                {isSubmitting ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <LucideIcon name="UserPlus" size={16} />
                )}
                <span>Đăng ký thành viên</span>
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setMode("login");
                    setErrorMessage(null);
                  }}
                  className="text-xs text-slate-500 hover:text-indigo-600 font-bold transition-all"
                >
                  Đã có tài khoản?{" "}
                  <span className="underline">Quay lại đăng nhập</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
