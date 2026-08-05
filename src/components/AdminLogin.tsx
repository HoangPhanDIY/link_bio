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
      const user = await dbService.loginUser(
        loginKey.trim(),
        loginPassword.trim(),
      );
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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-[#1d182b]/95 w-full max-w-md border border-[#bd9867] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Banner header top */}
        <div className="p-6 pb-0 text-center relative space-y-2">
          <div className="mx-auto w-12 h-12 flex items-center justify-center shadow-md border border-[#bd9867] bg-[#bd9867]/20 text-[#fce3bc]">
            <LucideIcon
              name={mode === "login" ? "LogIn" : "UserPlus"}
              size={22}
            />
          </div>

          <div>
            <h2 className="font-display text-lg uppercase font-black bg-gradient-to-t from-[#bd9867] to-[#fce3bc] bg-clip-text text-transparent">
              {mode === "login" && "Đăng nhập"}
              {mode === "register" && "Tạo tài khoản mới"}
            </h2>
          </div>

          <button
            onClick={onCancel}
            className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors cursor-pointer p-1 hover:bg-[#bd9867]/20"
            title="Đóng"
          >
            <LucideIcon name="X" size={16} />
          </button>
        </div>

        <div className="p-6 sm:p-8 space-y-4">
          {/* Messages block */}
          {errorMessage && (
            <div className="p-3 bg-red-950/60 border border-red-500/60 text-red-300 text-xs font-semibold flex items-start gap-2.5 animate-shake">
              <LucideIcon
                name="AlertCircle"
                size={14}
                className="shrink-0 mt-0.5 text-red-400"
              />
              <span className="flex-1">{errorMessage}</span>
            </div>
          )}

          {/* MODE 1: LOGIN */}
          {mode === "login" && (
            <form onSubmit={handleLocalLoginSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#fce3bc] uppercase tracking-wider font-sans">
                  Email hoặc Tên đăng nhập
                </label>
                <div className="relative">
                  <LucideIcon
                    name="Mail"
                    className="absolute left-3.5 top-3 text-[#bd9867]"
                    size={16}
                  />
                  <input
                    type="text"
                    required
                    placeholder="Nhập email hoặc tên đăng nhập..."
                    value={loginKey}
                    onChange={(e) => setLoginKey(e.target.value)}
                    className="w-full bg-slate-900/90 border border-[#bd9867]/60 pl-10 pr-4 py-2.5 outline-none focus:border-[#fce3bc] text-sm text-white transition-all font-medium placeholder-slate-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#fce3bc] uppercase tracking-wider font-sans">
                  Mật khẩu
                </label>
                <div className="relative">
                  <LucideIcon
                    name="Lock"
                    className="absolute left-3.5 top-3 text-[#bd9867]"
                    size={16}
                  />
                  <input
                    type="password"
                    required
                    placeholder="Nhập mật khẩu..."
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full bg-slate-900/90 border border-[#bd9867]/60 pl-10 pr-4 py-2.5 outline-none focus:border-[#fce3bc] text-sm text-white transition-all font-medium placeholder-slate-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full text-slate-900 uppercase bg-gradient-to-t from-[#bd9867] to-[#fce3bc] py-3 font-extrabold transition-all hover:brightness-110 active:scale-[0.98] flex items-center justify-center gap-1.5 shadow-md text-sm cursor-pointer mt-2"
              >
                {isSubmitting ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white animate-spin rounded-full" />
                ) : (
                  <LucideIcon name="LogIn" size={16} />
                )}
                <span>Đăng nhập</span>
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setMode("register");
                    setErrorMessage(null);
                  }}
                  className="text-xs text-slate-300 hover:text-[#fce3bc] font-bold transition-all cursor-pointer"
                >
                  Bạn chưa có tài khoản?{" "}
                  <span className="underline text-[#fce3bc]">
                    Đăng ký thành viên
                  </span>
                </button>
              </div>
            </form>
          )}

          {/* MODE 2: REGISTER */}
          {mode === "register" && (
            <form onSubmit={handleRegisterDirectly} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#fce3bc] uppercase tracking-wider font-sans">
                  Tên đăng nhập
                </label>
                <div className="relative">
                  <LucideIcon
                    name="User"
                    className="absolute left-3.5 top-3 text-[#bd9867]"
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
                    className="w-full bg-slate-900/90 border border-[#bd9867]/60 pl-10 pr-4 py-2.5 outline-none focus:border-[#fce3bc] text-sm text-white transition-all font-medium placeholder-slate-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#fce3bc] uppercase tracking-wider font-sans">
                  Địa chỉ Email
                </label>
                <div className="relative">
                  <LucideIcon
                    name="Mail"
                    className="absolute left-3.5 top-3 text-[#bd9867]"
                    size={16}
                  />
                  <input
                    type="email"
                    required
                    placeholder="Ví dụ: example@gmail.com"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    className="w-full bg-slate-900/90 border border-[#bd9867]/60 pl-10 pr-4 py-2.5 outline-none focus:border-[#fce3bc] text-sm text-white transition-all font-medium placeholder-slate-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#fce3bc] uppercase tracking-wider font-sans">
                  Mật khẩu
                </label>
                <div className="relative">
                  <LucideIcon
                    name="Lock"
                    className="absolute left-3.5 top-3 text-[#bd9867]"
                    size={16}
                  />
                  <input
                    type="password"
                    required
                    placeholder="Mật khẩu tối thiểu 6 ký tự..."
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    className="w-full bg-slate-900/90 border border-[#bd9867]/60 pl-10 pr-4 py-2.5 outline-none focus:border-[#fce3bc] text-sm text-white transition-all font-medium placeholder-slate-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#fce3bc] uppercase tracking-wider font-sans">
                  Nhập lại Mật khẩu
                </label>
                <div className="relative">
                  <LucideIcon
                    name="Lock"
                    className="absolute left-3.5 top-3 text-[#bd9867]"
                    size={16}
                  />
                  <input
                    type="password"
                    required
                    placeholder="Xác nhận lại mật khẩu..."
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    className="w-full bg-slate-900/90 border border-[#bd9867]/60 pl-10 pr-4 py-2.5 outline-none focus:border-[#fce3bc] text-sm text-white transition-all font-medium placeholder-slate-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full text-slate-900 uppercase bg-gradient-to-t from-[#bd9867] to-[#fce3bc] py-3 font-extrabold transition-all hover:brightness-110 active:scale-[0.98] flex items-center justify-center gap-1.5 shadow-md text-sm cursor-pointer mt-2"
              >
                {isSubmitting ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white animate-spin rounded-full" />
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
                  className="text-xs text-slate-300 hover:text-[#fce3bc] font-bold transition-all cursor-pointer"
                >
                  Đã có tài khoản?{" "}
                  <span className="underline text-[#fce3bc]">
                    Quay lại đăng nhập
                  </span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
