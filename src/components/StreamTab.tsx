import React, { useState, useEffect } from "react";
import {
  Volume2,
  Tv,
  Settings,
  Play,
  Copy,
  Check,
  Sparkles,
  Upload,
  VolumeX,
  Clock,
  ExternalLink,
  Music,
  Image as ImageIcon,
  History,
} from "lucide-react";
import { AppearanceSettings } from "../types";
import { supabase, DBDonation, DBUser } from "../supabase";
import { dbService } from "../dbService";

interface StreamTabProps {
  appearance: AppearanceSettings;
  onUpdateAppearance: (updates: Partial<AppearanceSettings>) => void;
  onSaveStreamSettings: () => Promise<void>;
  dbUser: DBUser | null;
}

export default function StreamTab({
  appearance,
  onUpdateAppearance,
  onSaveStreamSettings,
  dbUser,
}: StreamTabProps) {
  const [isCopied, setIsCopied] = useState(false);
  const [isUploadingGif, setIsUploadingGif] = useState(false);
  const [isUploadingSound, setIsUploadingSound] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Test state
  const [testName, setTestName] = useState("Nguyễn Văn A");
  const [testAmount, setTestAmount] = useState(50000);
  const [testMessage, setTestMessage] = useState(
    "Chúc bạn live stream vui vẻ và gặt hái nhiều thành công!",
  );

  // List of today's donations
  const [todayDonations, setTodayDonations] = useState<DBDonation[]>([]);
  const [isLoadingDonations, setIsLoadingDonations] = useState(false);

  // Asset reuse lists
  const [historicalGifs, setHistoricalGifs] = useState<string[]>([]);
  const [historicalSounds, setHistoricalSounds] = useState<string[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyTab, setHistoryTab] = useState<"gif" | "sound">("gif");

  // System voices list
  const [systemVoices, setSystemVoices] = useState<SpeechSynthesisVoice[]>([]);

  // Default sounds
  const DEFAULT_SOUNDS = [
    {
      name: "Chime cổ điển",
      url: "https://assets.mixkit.co/active_storage/sfx/2869/2869-84.wav",
    },
    {
      name: "Retro Level Up",
      url: "https://assets.mixkit.co/active_storage/sfx/2019/2019-84.wav",
    },
    {
      name: "Game Coin",
      url: "https://assets.mixkit.co/active_storage/sfx/2017/2017-84.wav",
    },
    {
      name: "Magic Wand",
      url: "https://assets.mixkit.co/active_storage/sfx/2018/2018-84.wav",
    },
  ];

  // Fetch dynamic list of system voices
  useEffect(() => {
    if ("speechSynthesis" in window) {
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        const filtered = voices.filter(
          (v) => v.lang.startsWith("vi") || v.lang.includes("VI"),
        );
        setSystemVoices(filtered);
      };
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  // Fetch today's donations
  const fetchTodayDonations = async () => {
    setIsLoadingDonations(true);
    try {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from("ung_ho")
        .select("*")
        .eq("trang_thai", 1)
        .gte("created_at", startOfToday.toISOString())
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTodayDonations(data || []);
    } catch (err) {
      console.warn("Lỗi tải danh sách ủng hộ hôm nay:", err);
    } finally {
      setIsLoadingDonations(false);
    }
  };

  // Fetch uploaded historical assets
  const fetchHistoricalAssets = async () => {
    setIsLoadingHistory(true);
    try {
      const { gifs, sounds } = await dbService.listDonateAssets();
      setHistoricalGifs(gifs);
      setHistoricalSounds(sounds);
    } catch (err) {
      console.warn("Lỗi tải lịch sử tài nguyên:", err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchTodayDonations();
    fetchHistoricalAssets();
  }, []);

  // OBS Link
  const obsLink = `${window.location.origin}?view=stream-overlay`;

  const copyOBSLink = () => {
    navigator.clipboard.writeText(obsLink);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Upload file function supporting the "donate" folder in bucket
  const uploadToDonateFolder = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}.${fileExt}`;
      const filePath = `donate/${fileName}`; // Saved in "donate/" folder path inside the "images" bucket

      const { data, error } = await supabase.storage
        .from("images")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type,
        });

      if (error) throw error;

      const { data: publicUrlData } = supabase.storage
        .from("images")
        .getPublicUrl(filePath);

      // Refresh list of history
      fetchHistoricalAssets();

      return publicUrlData.publicUrl;
    } catch (err: any) {
      console.error("Lỗi tải tệp lên bucket Supabase:", err);
      alert(`Không thể tải tệp lên bucket: ${err.message || err}`);
      return null;
    }
  };

  // Upload GIF
  const handleGifUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingGif(true);
    try {
      const publicUrl = await uploadToDonateFolder(file);
      if (publicUrl) {
        onUpdateAppearance({ streamAlertGif: publicUrl });
        window.showNotification?.(
          "Tải lên GIF mới và lưu vào thư mục donate thành công!",
          "success",
        );
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsUploadingGif(false);
    }
  };

  // Upload Sound
  const handleSoundUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingSound(true);
    try {
      const publicUrl = await uploadToDonateFolder(file);
      if (publicUrl) {
        onUpdateAppearance({ streamAlertSound: publicUrl });
        window.showNotification?.(
          "Tải lên âm thanh mới và lưu vào thư mục donate thành công!",
          "success",
        );
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsUploadingSound(false);
    }
  };

  // Trigger test alert via API
  const handleSendTestAlert = async (
    name: string,
    amount: number,
    message: string,
  ) => {
    setIsTesting(true);
    try {
      const res = await fetch("/api/donate-alert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          amount,
          message,
          isTest: true,
        }),
      });
      const data = await res.json();
      if (data.success) {
        // Also play local preview of audio
        if (appearance.streamAlertSound) {
          const audio = new Audio(appearance.streamAlertSound);
          audio.volume = 0.5;
          audio.play().catch(() => {});
        }

        // Also preview TTS locally using active browser voice selection
        if (appearance.streamAlertTts && "speechSynthesis" in window) {
          setTimeout(() => {
            const cleanTemplate =
              appearance.streamAlertTemplate || "đã ủng hộ bạn";
            let speakText = "";
            if (
              cleanTemplate.includes("{name}") ||
              cleanTemplate.includes("{amount}")
            ) {
              speakText = cleanTemplate
                .replace("{name}", name)
                .replace("{amount}", amount.toLocaleString("vi-VN"));
            } else {
              speakText = `${name} ${amount.toLocaleString("vi-VN")} đồng ${cleanTemplate}`;
            }

            if (message) {
              speakText += `. Lời nhắn: ${message}`;
            }

            const utterance = new SpeechSynthesisUtterance(speakText);
            utterance.lang = "vi-VN";
            utterance.rate = 1.0;
            utterance.pitch = 1.0;

            const voices = window.speechSynthesis.getVoices();
            let selectedVoice = null;

            if (appearance.streamAlertVoiceName) {
              selectedVoice = voices.find(
                (v) => v.name === appearance.streamAlertVoiceName,
              );
            }

            if (!selectedVoice) {
              const viVoices = voices.filter(
                (v) => v.lang.startsWith("vi") || v.lang.includes("VI"),
              );
              if (appearance.streamAlertVoiceGender === "male") {
                selectedVoice = viVoices.find(
                  (v) =>
                    v.name.toLowerCase().includes("nam") ||
                    v.name.toLowerCase().includes("male") ||
                    v.name.toLowerCase().includes("minh"),
                );
                if (!selectedVoice) {
                  utterance.pitch = 0.75;
                  selectedVoice = viVoices[0];
                }
              } else if (appearance.streamAlertVoiceGender === "female") {
                selectedVoice = viVoices.find(
                  (v) =>
                    v.name.toLowerCase().includes("nữ") ||
                    v.name.toLowerCase().includes("female") ||
                    v.name.toLowerCase().includes("lý") ||
                    v.name.toLowerCase().includes("hoaimy"),
                );
                if (!selectedVoice) {
                  utterance.pitch = 1.15;
                  selectedVoice = viVoices[0];
                }
              } else {
                selectedVoice =
                  viVoices.find((v) =>
                    v.name.toLowerCase().includes("google"),
                  ) || viVoices[0];
              }
            }

            if (selectedVoice) {
              utterance.voice = selectedVoice;
            }

            window.speechSynthesis.speak(utterance);
          }, 1000);
        }

        window.showNotification?.(
          "Đã gửi thông báo chạy thử lên OBS Stream Overlay!",
          "success",
        );
      }
    } catch (err) {
      console.error(err);
      window.showNotification?.("Lỗi kết nối khi gửi thông báo test.", "error");
    } finally {
      setIsTesting(false);
    }
  };

  // Save Config to DB
  const handleSaveConfig = async () => {
    setIsSaving(true);
    try {
      await onSaveStreamSettings();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div id="stream-tab-container" className="space-y-6">
      {/* Overview Card */}
      <div className="bg-gradient-to-r from-purple-900/40 via-indigo-900/40 to-slate-900 border border-indigo-500/20 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-indigo-400 font-semibold text-lg">
              <Tv className="w-5 h-5 animate-pulse" />
              <span>Tích Hợp Live Stream & OBS Overlay</span>
            </div>
            <p className="text-sm text-slate-300">
              Công cụ hiển thị hộp quà tặng, phát âm thanh vui tai và đọc giọng
              nói (TTS) tự động trên livestream OBS mỗi khi có người ủng hộ
              (donate) thành công.
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => {
                fetchHistoricalAssets();
                setShowHistoryModal(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 text-slate-200 hover:text-white border border-slate-700 hover:border-slate-600 rounded-xl transition text-sm font-medium"
            >
              <History className="w-4 h-4 text-indigo-400" />
              <span>Tái sử dụng tệp cũ</span>
            </button>
            <a
              href={obsLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 text-slate-200 hover:text-white border border-slate-700 hover:border-slate-600 rounded-xl transition text-sm font-medium"
            >
              <span>Xem trước Overlay</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* OBS Copy link component */}
        <div className="mt-6 p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2">
          <label className="text-xs font-semibold text-indigo-300 uppercase tracking-wider block">
            Đường dẫn nguồn trình duyệt (OBS Browser Source)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={obsLink}
              className="flex-1 bg-slate-900/80 border border-slate-700/80 text-indigo-200 px-3 py-2 rounded-lg text-xs  focus:outline-none"
            />
            <button
              onClick={copyOBSLink}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition text-xs font-semibold flex items-center gap-1 shrink-0"
            >
              {isCopied ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span>{isCopied ? "Đã sao chép!" : "Sao chép Link"}</span>
            </button>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            * Thêm liên kết này vào OBS Studio dưới dạng <b>Browser Source</b>{" "}
            (Nguồn trình duyệt), cài đặt độ phân giải <b>1920x1080</b> và tích
            hợp âm thanh.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left column: Settings */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 shadow-md space-y-6">
            <h3 className="font-semibold text-white flex items-center gap-2 text-base pb-3 border-b border-slate-800">
              <Settings className="w-4.5 h-4.5 text-indigo-400" />
              <span>Cấu hình hiệu ứng thông báo</span>
            </h3>

            {/* GIF Selector */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-slate-200 block">
                  Ảnh động hiển thị (Alert GIF)
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setHistoryTab("gif");
                    setShowHistoryModal(true);
                  }}
                  className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                >
                  <History className="w-3 h-3" /> Sử dụng lại ảnh cũ
                </button>
              </div>
              <div className="flex gap-4 items-center">
                <div className="w-20 h-20 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-center overflow-hidden shrink-0">
                  <img
                    src={appearance.streamAlertGif || "/giphy.webp"}
                    alt="Alert GIF"
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
                <div className="flex-1 space-y-2">
                  <input
                    type="text"
                    value={appearance.streamAlertGif || ""}
                    onChange={(e) =>
                      onUpdateAppearance({ streamAlertGif: e.target.value })
                    }
                    placeholder="URL ảnh động .gif hoặc tệp tải lên"
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                  />
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 rounded-lg transition text-xs font-semibold cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    <span>
                      {isUploadingGif ? "Đang tải lên..." : "Tải lên tệp GIF"}
                    </span>
                    <input
                      type="file"
                      accept="image/gif,image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={handleGifUpload}
                      disabled={isUploadingGif}
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* Sound Selector */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-slate-200 block">
                  Âm thanh thông báo (Sound Effect)
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setHistoryTab("sound");
                    setShowHistoryModal(true);
                  }}
                  className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                >
                  <History className="w-3 h-3" /> Quản lý nâng cao
                </button>
              </div>
              <div className="flex gap-3 items-center">
                <input
                  type="text"
                  value={appearance.streamAlertSound || ""}
                  onChange={(e) =>
                    onUpdateAppearance({ streamAlertSound: e.target.value })
                  }
                  placeholder="URL âm thanh .mp3 / .wav"
                  className="flex-1 bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                />
                {appearance.streamAlertSound && (
                  <button
                    type="button"
                    onClick={() => {
                      const a = new Audio(appearance.streamAlertSound);
                      a.volume = 0.6;
                      a.play().catch((err) => {
                        window.showNotification?.(
                          "Không thể phát âm thanh này. Hãy kiểm tra URL.",
                          "error",
                        );
                      });
                    }}
                    className="px-3 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-semibold shrink-0"
                  >
                    Nghe thử
                  </button>
                )}
                <label className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 rounded-lg transition text-xs font-semibold cursor-pointer shrink-0">
                  <Upload className="w-3.5 h-3.5" />
                  <span>
                    {isUploadingSound ? "Đang tải..." : "Tải lên âm thanh"}
                  </span>
                  <input
                    type="file"
                    accept="audio/*"
                    className="hidden"
                    onChange={handleSoundUpload}
                    disabled={isUploadingSound}
                  />
                </label>
              </div>

              {/* Quick direct sound selector for both system and bucket assets */}
              <div className="space-y-2 mt-2 bg-slate-950/40 p-3 rounded-xl border border-slate-800/80">
                <div className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>Thư viện âm thanh</span>
                  <span className="text-[10px] text-slate-400">
                    ({historicalSounds.length} tệp đã tải lên)
                  </span>
                </div>
                <div className="max-h-52 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
                  {/* Default sounds */}
                  <div>
                    <div className="text-[10px] text-indigo-400 font-semibold uppercase tracking-wider mb-1">
                      Mặc định hệ thống
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {DEFAULT_SOUNDS.map((snd, idx) => (
                        <div
                          key={`default-${idx}`}
                          className={`p-2 rounded-lg border flex items-center justify-between gap-1 transition ${
                            appearance.streamAlertSound === snd.url
                              ? "bg-indigo-600/20 border-indigo-500 text-indigo-300"
                              : "bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-300"
                          }`}
                        >
                          <span className="text-xs truncate">{snd.name}</span>
                          <div className="flex gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                const a = new Audio(snd.url);
                                a.volume = 0.5;
                                a.play().catch(() => {});
                              }}
                              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded"
                              title="Nghe thử"
                            >
                              <Play className="w-3 h-3 fill-current" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                onUpdateAppearance({
                                  streamAlertSound: snd.url,
                                });
                              }}
                              className="px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[10px] font-semibold"
                            >
                              Chọn
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Uploaded sounds in bucket */}
                  {historicalSounds.length > 0 && (
                    <div>
                      <div className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider mb-1 mt-1">
                        Đã tải lên (Bucket)
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {historicalSounds.map((url, idx) => {
                          const name =
                            url.split("/").pop() || `Sound_${idx + 1}`;
                          const cleanName = decodeURIComponent(name).replace(
                            /^\d+-/,
                            "",
                          );
                          return (
                            <div
                              key={`uploaded-${idx}`}
                              className={`p-2 rounded-lg border flex items-center justify-between gap-1 transition ${
                                appearance.streamAlertSound === url
                                  ? "bg-indigo-600/20 border-indigo-500 text-indigo-300"
                                  : "bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-300"
                              }`}
                            >
                              <span
                                className="text-xs truncate max-w-[125px]"
                                title={cleanName}
                              >
                                {cleanName}
                              </span>
                              <div className="flex gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const a = new Audio(url);
                                    a.volume = 0.5;
                                    a.play().catch(() => {});
                                  }}
                                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded"
                                  title="Nghe thử"
                                >
                                  <Play className="w-3 h-3 fill-current" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    onUpdateAppearance({
                                      streamAlertSound: url,
                                    });
                                  }}
                                  className="px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[10px] font-semibold"
                                >
                                  Chọn
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Template text */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-slate-200 block">
                  Chữ thông báo sau tên & số tiền
                </label>
                <span className="text-[11px] text-indigo-400 font-semibold">
                  Ví dụ: đã ủng hộ bạn
                </span>
              </div>
              <input
                type="text"
                value={appearance.streamAlertTemplate || ""}
                onChange={(e) =>
                  onUpdateAppearance({ streamAlertTemplate: e.target.value })
                }
                placeholder="Nhập nội dung (ví dụ: đã ủng hộ bạn, vừa tặng stream...)"
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
              />
              <p className="text-[11px] text-slate-400">
                * Chỉ cần ghi chữ thông báo. Hệ thống sẽ tự động ghép tên và số
                tiền phía trước khi hiển thị (ví dụ:{" "}
                <b>Nguyễn Văn A 50.000đ đã ủng hộ bạn</b>).
              </p>
            </div>

            {/* TTS Settings section */}
            <div className="space-y-4 p-4 bg-slate-950/50 border border-slate-800/80 rounded-xl">
              <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5" /> Cấu hình giọng đọc Google
                (TTS)
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-200 block">
                    Bật đọc giọng nói (TTS)
                  </label>
                  <div className="flex items-center h-10 bg-slate-950 px-3 rounded-lg border border-slate-800">
                    <label className="flex items-center gap-2 cursor-pointer w-full select-none text-sm text-slate-300">
                      <input
                        type="checkbox"
                        checked={appearance.streamAlertTts !== false}
                        onChange={(e) =>
                          onUpdateAppearance({
                            streamAlertTts: e.target.checked,
                          })
                        }
                        className="w-4 h-4 rounded border-slate-800 bg-slate-950 text-indigo-600 focus:ring-0 focus:ring-offset-0"
                      />
                      <span>Kích hoạt phát âm thanh đọc</span>
                    </label>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-200 block">
                    Giọng đọc mong muốn
                  </label>
                  <select
                    value={appearance.streamAlertVoiceGender || "default"}
                    onChange={(e) =>
                      onUpdateAppearance({
                        streamAlertVoiceGender: e.target.value,
                      })
                    }
                    className="w-full h-10 bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-3 text-sm focus:outline-none focus:border-indigo-500"
                  >
                    <option value="default">Mặc định (Giọng Chị Google)</option>
                    <option value="female">Giọng Nữ (Tiếng Việt)</option>
                    <option value="male">Giọng Nam (Tiếng Việt)</option>
                  </select>
                </div>
              </div>

              {/* Advanced System Voices list if browser allows */}
              {systemVoices.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-800/60">
                  <label className="text-xs font-medium text-slate-400 block">
                    Tùy chọn nâng cao: Giọng đọc khả dụng trên máy của bạn
                  </label>
                  <select
                    value={appearance.streamAlertVoiceName || ""}
                    onChange={(e) =>
                      onUpdateAppearance({
                        streamAlertVoiceName: e.target.value,
                      })
                    }
                    className="w-full h-9 bg-slate-950/80 border border-slate-800/80 text-slate-300 rounded-lg px-2 text-xs focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">
                      -- Tự động lọc theo giọng phía trên --
                    </option>
                    {systemVoices.map((v, index) => (
                      <option key={index} value={v.name}>
                        {v.name} ({v.lang}){" "}
                        {v.localService ? "[Ngoại tuyến]" : "[Trực tuyến]"}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Nghe thử giọng đọc button */}
              <div className="pt-1 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const cleanTemplate =
                      appearance.streamAlertTemplate || "đã ủng hộ bạn";
                    let speakText = "";
                    if (
                      cleanTemplate.includes("{name}") ||
                      cleanTemplate.includes("{amount}")
                    ) {
                      speakText = cleanTemplate
                        .replace("{name}", testName)
                        .replace(
                          "{amount}",
                          testAmount.toLocaleString("vi-VN"),
                        );
                    } else {
                      speakText = `${testName} ${testAmount.toLocaleString("vi-VN")} đồng ${cleanTemplate}`;
                    }

                    if (testMessage) {
                      speakText += `. Lời nhắn: ${testMessage}`;
                    }

                    const useGoogleTTS =
                      appearance.streamAlertVoiceGender === "default" ||
                      !appearance.streamAlertVoiceGender;

                    if (useGoogleTTS) {
                      const encodedText = encodeURIComponent(
                        speakText.substring(0, 200),
                      );
                      const googleTtsUrl = `/api/tts?text=${encodedText}&lang=vi`;
                      const ttsAudio = new Audio(googleTtsUrl);
                      ttsAudio.volume = 1.0;
                      ttsAudio.play().catch((err) => {
                        console.warn(
                          "Google TTS failed/blocked, falling back to local speech synthesis:",
                          err,
                        );
                        playLocalSpeechSynthesis(speakText);
                      });
                    } else {
                      playLocalSpeechSynthesis(speakText);
                    }

                    function playLocalSpeechSynthesis(text: string) {
                      if (!("speechSynthesis" in window)) {
                        (window as any).showNotification?.(
                          "Trình duyệt không hỗ trợ đọc giọng nói.",
                          "error",
                        );
                        return;
                      }
                      try {
                        window.speechSynthesis.cancel();
                        const utterance = new SpeechSynthesisUtterance(text);
                        utterance.lang = "vi-VN";
                        utterance.rate = 1.0;
                        utterance.pitch = 1.0;

                        const voices = window.speechSynthesis.getVoices();
                        let selectedVoice = null;

                        if (appearance.streamAlertVoiceName) {
                          selectedVoice = voices.find(
                            (v) => v.name === appearance.streamAlertVoiceName,
                          );
                        }

                        if (!selectedVoice) {
                          const viVoices = voices.filter(
                            (v) =>
                              v.lang.startsWith("vi") || v.lang.includes("VI"),
                          );
                          if (appearance.streamAlertVoiceGender === "male") {
                            selectedVoice = viVoices.find(
                              (v) =>
                                v.name.toLowerCase().includes("nam") ||
                                v.name.toLowerCase().includes("male") ||
                                v.name.toLowerCase().includes("minh"),
                            );
                            if (!selectedVoice) {
                              utterance.pitch = 0.75;
                              selectedVoice = viVoices[0];
                            }
                          } else if (
                            appearance.streamAlertVoiceGender === "female"
                          ) {
                            selectedVoice = viVoices.find(
                              (v) =>
                                v.name.toLowerCase().includes("nữ") ||
                                v.name.toLowerCase().includes("female") ||
                                v.name.toLowerCase().includes("lý") ||
                                v.name.toLowerCase().includes("hoaimy"),
                            );
                            if (!selectedVoice) {
                              utterance.pitch = 1.15;
                              selectedVoice = viVoices[0];
                            }
                          } else {
                            selectedVoice =
                              viVoices.find((v) =>
                                v.name.toLowerCase().includes("google"),
                              ) || viVoices[0];
                          }
                        }

                        if (selectedVoice) {
                          utterance.voice = selectedVoice;
                        }

                        window.speechSynthesis.speak(utterance);
                      } catch (e) {
                        console.error(e);
                      }
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 hover:border-indigo-500/50 rounded-lg transition text-xs font-semibold"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Nghe thử giọng đọc</span>
                </button>
                <span className="text-[10px] text-slate-400 italic">
                  * Nhấp để phát thử giọng đọc theo thiết lập
                </span>
              </div>
            </div>

            {/* Smart Automated Display duration indicator */}
            <div className="space-y-1.5 bg-slate-950/20 p-3 rounded-xl border border-slate-800/60">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                <span>Thời gian hiển thị (Tự động)</span>
              </label>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                * Hệ thống đã được nâng cấp thông minh: thông báo sẽ{" "}
                <b>tự động giữ nguyên</b> trên màn hình livestream và chỉ biến
                mất <b>sau khi đọc xong</b> hoàn toàn tên, số tiền và nội dung
                lời nhắn, giúp người xem không bị lỡ thông tin.
              </p>
            </div>

            {/* Save Button */}
            <div className="pt-2">
              <button
                onClick={handleSaveConfig}
                disabled={isSaving}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white font-semibold rounded-xl shadow-lg transition text-sm"
              >
                {isSaving
                  ? "Đang lưu cấu hình..."
                  : "Lưu cấu hình và bảng (cau_hinh)"}
              </button>
            </div>
          </div>
        </div>

        {/* Right column: Test Area & Replay List */}
        <div className="lg:col-span-5 space-y-6">
          {/* Test area */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 shadow-md space-y-4">
            <h3 className="font-semibold text-white flex items-center gap-2 text-base pb-3 border-b border-slate-800">
              <Sparkles className="w-4.5 h-4.5 text-amber-400" />
              <span>Chạy thử thông báo</span>
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-300 block mb-1 font-medium">
                  Tên người donate test
                </label>
                <input
                  type="text"
                  value={testName}
                  onChange={(e) => setTestName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1 font-medium">
                  Số tiền donate test (đ)
                </label>
                <input
                  type="number"
                  value={testAmount}
                  onChange={(e) => setTestAmount(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1 font-medium">
                  Lời nhắn test
                </label>
                <textarea
                  rows={2}
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <button
                onClick={() =>
                  handleSendTestAlert(testName, testAmount, testMessage)
                }
                disabled={isTesting}
                className="w-full py-2 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 text-slate-950 font-bold rounded-lg transition text-xs flex items-center justify-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>
                  {isTesting ? "Đang gửi..." : "GỬI TEST LÊN STREAM (OBS)"}
                </span>
              </button>
            </div>
          </div>

          {/* Today's donations list */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 shadow-md space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <h3 className="font-semibold text-white flex items-center gap-2 text-base">
                <Clock className="w-4.5 h-4.5 text-emerald-400" />
                <span>Đã chuyển hôm nay</span>
              </h3>
              <button
                onClick={fetchTodayDonations}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
              >
                Làm mới
              </button>
            </div>

            {isLoadingDonations ? (
              <div className="text-center py-6 text-xs text-slate-400">
                Đang tải danh sách ủng hộ...
              </div>
            ) : todayDonations.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400 italic">
                Chưa có ai chuyển khoản hôm nay (trang_thai = 1).
              </div>
            ) : (
              <div className="max-h-60 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {todayDonations.map((don) => (
                  <div
                    key={don.id}
                    className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-xs text-emerald-400">
                        {don.ten_nguoi_ung_ho || "Ẩn danh"}
                      </div>
                      <div className="text-xs font-bold text-white mt-0.5">
                        {don.so_tien.toLocaleString("vi-VN")}đ
                      </div>
                      {don.noi_dung && (
                        <div className="text-[10px] text-slate-400 truncate max-w-[180px] mt-0.5">
                          "{don.noi_dung}"
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() =>
                        handleSendTestAlert(
                          don.ten_nguoi_ung_ho || "Người ủng hộ",
                          don.so_tien,
                          don.noi_dung || "",
                        )
                      }
                      className="px-2.5 py-1 bg-indigo-600/40 hover:bg-indigo-600 text-indigo-300 hover:text-white rounded-lg transition text-[10px] font-semibold shrink-0"
                    >
                      Phát lại Alert
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reusable Asset History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-2xl overflow-hidden flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-400" />
                <h3 className="font-semibold text-white">
                  Tái sử dụng tài nguyên đã tải lên
                </h3>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                Đóng ✕
              </button>
            </div>

            {/* Modal Navigation */}
            <div className="flex border-b border-slate-800 bg-slate-950/40">
              <button
                onClick={() => setHistoryTab("gif")}
                className={`flex-1 py-3 text-sm font-semibold border-b-2 transition flex items-center justify-center gap-1.5 ${
                  historyTab === "gif"
                    ? "border-indigo-500 text-indigo-400"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <ImageIcon className="w-4 h-4" />
                <span>Ảnh động / Gif ({historicalGifs.length})</span>
              </button>
              <button
                onClick={() => setHistoryTab("sound")}
                className={`flex-1 py-3 text-sm font-semibold border-b-2 transition flex items-center justify-center gap-1.5 ${
                  historyTab === "sound"
                    ? "border-indigo-500 text-indigo-400"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <Music className="w-4 h-4" />
                <span>Âm thanh / Nhạc ({historicalSounds.length})</span>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
              {isLoadingHistory ? (
                <div className="text-center py-12 text-slate-400">
                  Đang tải thư viện tài nguyên...
                </div>
              ) : historyTab === "gif" ? (
                historicalGifs.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 italic text-sm">
                    Chưa có ảnh nào được tải lên trong thư mục donate/
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                    {historicalGifs.map((url, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          onUpdateAppearance({ streamAlertGif: url });
                          setShowHistoryModal(false);
                          window.showNotification?.(
                            "Đã chọn sử dụng lại ảnh động!",
                            "success",
                          );
                        }}
                        className={`group relative aspect-square bg-slate-950 border border-slate-800 rounded-xl overflow-hidden hover:border-indigo-500 transition-all ${
                          appearance.streamAlertGif === url
                            ? "ring-2 ring-indigo-500"
                            : ""
                        }`}
                      >
                        <img
                          src={url}
                          alt="Historical resource"
                          className="w-full h-full object-contain p-1"
                        />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="text-[10px] text-white font-bold bg-indigo-600 px-2 py-1 rounded">
                            CHỌN
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )
              ) : historicalSounds.length === 0 ? (
                <div className="text-center py-12 text-slate-400 italic text-sm">
                  Chưa có âm thanh nào được tải lên trong thư mục donate/
                </div>
              ) : (
                <div className="space-y-2">
                  {historicalSounds.map((url, i) => {
                    const name = url.split("/").pop() || `Sound_${i + 1}`;
                    return (
                      <div
                        key={i}
                        className={`p-3 bg-slate-950/80 border rounded-xl flex items-center justify-between gap-3 ${
                          appearance.streamAlertSound === url
                            ? "border-indigo-500"
                            : "border-slate-800"
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <span className="text-xs text-slate-200  truncate block">
                            {decodeURIComponent(name)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              const a = new Audio(url);
                              a.volume = 0.5;
                              a.play().catch(() => {});
                            }}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs"
                          >
                            Nghe thử
                          </button>
                          <button
                            onClick={() => {
                              onUpdateAppearance({ streamAlertSound: url });
                              setShowHistoryModal(false);
                              window.showNotification?.(
                                "Đã chọn sử dụng lại âm thanh!",
                                "success",
                              );
                            }}
                            className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold"
                          >
                            Chọn dùng
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/60 flex justify-end gap-2 text-xs text-slate-400">
              * Toàn bộ tệp tin được lấy trực tiếp từ thư mục{" "}
              <b className="text-indigo-400 font-semibold">donate/</b> của
              bucket chứa ảnh của bạn.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
