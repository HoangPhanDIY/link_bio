import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { supabase, DBDonation, DBUser } from "../supabase";
import { dbService } from "../dbService";

export default function StreamOverlay() {
  const [profile, setProfile] = useState<DBUser | null>(null);
  const [streamSettings, setStreamSettings] = useState<any>({
    stream_alert_gif: "/giphy.webp",
    stream_alert_sound: "https://assets.mixkit.co/active_storage/sfx/2869/2869-84.wav",
    stream_alert_template: "{name} đã ủng hộ bạn {amount}Đ",
    stream_alert_tts: true,
    stream_alert_duration: 8,
    stream_alert_voice_gender: "default",
    stream_alert_voice_name: "",
  });

  const [currentAlert, setCurrentAlert] = useState<{
    id: string;
    name: string;
    amount: number;
    message: string;
  } | null>(null);

  const [queue, setQueue] = useState<any[]>([]);
  const displayedIdsRef = useRef<Set<string>>(new Set());
  const isPlayingRef = useRef(false);
  const [showUnlockOverlay, setShowUnlockOverlay] = useState(true);

  // Helper to unlock browser's strict autoplay block
  const unlockAudio = () => {
    setShowUnlockOverlay(false);
    
    // Play a quick sound to unlock audio context
    if (streamSettings.stream_alert_sound) {
      const audio = new Audio(streamSettings.stream_alert_sound);
      audio.volume = 0.3;
      audio.play().catch((err) => console.log("Unlock sound failed:", err));
    }

    // Trigger SpeechSynthesis once to unlock web speech API
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance("Đã kích hoạt giọng đọc thành công!");
      utterance.lang = "vi-VN";
      window.speechSynthesis.speak(utterance);
    }
  };

  // 1. Fetch settings from cau_hinh and profile to load alert configuration
  useEffect(() => {
    async function loadConfig() {
      try {
        const { data: profileData } = await supabase
          .from("nguoi_dung")
          .select("*")
          .eq("vai_tro", 0) // Admin
          .limit(1)
          .maybeSingle();

        if (profileData) {
          setProfile(profileData);
        }

        const settings = await dbService.getStreamAlertSettings();
        if (settings && Object.keys(settings).length > 0) {
          setStreamSettings({
            stream_alert_gif: settings.stream_alert_gif || profileData?.stream_alert_gif || "/giphy.webp",
            stream_alert_sound: settings.stream_alert_sound || profileData?.stream_alert_sound || "https://assets.mixkit.co/active_storage/sfx/2869/2869-84.wav",
            stream_alert_template: settings.stream_alert_template || profileData?.stream_alert_template || "{name} đã ủng hộ bạn {amount}Đ",
            stream_alert_tts: settings.stream_alert_tts !== undefined ? settings.stream_alert_tts : (profileData?.stream_alert_tts !== false),
            stream_alert_duration: settings.stream_alert_duration || profileData?.stream_alert_duration || 8,
            stream_alert_voice_gender: settings.stream_alert_voice_gender || "default",
            stream_alert_voice_name: settings.stream_alert_voice_name || "",
          });
        } else if (profileData) {
          setStreamSettings({
            stream_alert_gif: profileData.stream_alert_gif || "/giphy.webp",
            stream_alert_sound: profileData.stream_alert_sound || "https://assets.mixkit.co/active_storage/sfx/2869/2869-84.wav",
            stream_alert_template: profileData.stream_alert_template || "{name} đã ủng hộ bạn {amount}Đ",
            stream_alert_tts: profileData.stream_alert_tts !== false,
            stream_alert_duration: profileData.stream_alert_duration || 8,
            stream_alert_voice_gender: "default",
            stream_alert_voice_name: "",
          });
        }
      } catch (err) {
        console.warn("Lỗi tải cấu hình live stream:", err);
      }
    }
    loadConfig();
  }, []);

  // 2. Initialize already completed donations so we don't alert pre-existing items on startup
  useEffect(() => {
    async function initializePreExistingDonations() {
      try {
        const { data, error } = await supabase
          .from("ung_ho")
          .select("id")
          .eq("trang_thai", 1);
        
        if (data) {
          data.forEach((item) => {
            displayedIdsRef.current.add(item.id);
          });
          console.log(`Đã nạp ${displayedIdsRef.current.size} lịch sử donate để bỏ qua trùng lặp.`);
        }
      } catch (err) {
        console.warn("Lỗi đồng bộ danh sách donate cũ:", err);
      }
    }
    initializePreExistingDonations();
  }, []);

  // 3. Poll for both Supabase updates AND custom API alerts
  useEffect(() => {
    let active = true;

    async function checkForNewAlerts() {
      if (!active) return;

      try {
        // --- A. Poll from custom local memory API (for manual / testing alerts) ---
        const apiRes = await fetch("/api/stream-alerts");
        const apiData = await apiRes.json();
        if (apiData.success && apiData.alerts && apiData.alerts.length > 0) {
          apiData.alerts.forEach((alert: any) => {
            setQueue((prev) => [...prev, alert]);
          });
        }

        // --- B. Poll from Supabase donations (completed status) ---
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        const { data, error } = await supabase
          .from("ung_ho")
          .select("*")
          .eq("trang_thai", 1)
          .gte("ngay_tao", startOfToday.toISOString());

        if (data) {
          const newDonations = data.filter((item) => !displayedIdsRef.current.has(item.id));
          if (newDonations.length > 0) {
            newDonations.forEach((item) => {
              // Add to displayed set
              displayedIdsRef.current.add(item.id);
              // Push to alert queue
              setQueue((prev) => [
                ...prev,
                {
                  id: item.id,
                  name: item.ten_nguoi_ung_ho || "Ẩn danh",
                  amount: item.so_tien,
                  message: item.noi_dung || "",
                },
              ]);
            });
          }
        }
      } catch (err) {
        console.warn("Lỗi kiểm tra alert mới:", err);
      }
    }

    // Check immediately, then every 3 seconds
    checkForNewAlerts();
    const interval = setInterval(checkForNewAlerts, 3000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  // 4. Alert playback engine
  useEffect(() => {
    if (isPlayingRef.current || queue.length === 0) return;

    isPlayingRef.current = true;
    const nextAlert = queue[0];
    
    // Remove from queue
    setQueue((prev) => prev.slice(1));
    setCurrentAlert(nextAlert);

    // Play Alert Sound
    if (streamSettings.stream_alert_sound) {
      const audio = new Audio(streamSettings.stream_alert_sound);
      audio.volume = 0.6;
      audio.play().catch((err) => console.log("Không thể tự động phát nhạc:", err));
    }

    // Play Voice (TTS)
    if (streamSettings.stream_alert_tts) {
      setTimeout(() => {
        let speakText = streamSettings.stream_alert_template
          .replace("{name}", nextAlert.name)
          .replace("{amount}", nextAlert.amount.toLocaleString("vi-VN"));

        if (nextAlert.message) {
          speakText += `. Lời nhắn: ${nextAlert.message}`;
        }

        const useGoogleTTS = streamSettings.stream_alert_voice_gender === "default" || !streamSettings.stream_alert_voice_gender;

        if (useGoogleTTS) {
          // Play using Google Translate TTS (authentic premium Chị Google voice)
          const encodedText = encodeURIComponent(speakText.substring(0, 250));
          const googleTtsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=vi&client=tw-ob&q=${encodedText}`;
          const ttsAudio = new Audio(googleTtsUrl);
          ttsAudio.volume = 1.0;
          ttsAudio.play().catch((err) => {
            console.warn("Google TTS failed/blocked, falling back to local speech synthesis:", err);
            playLocalSpeechSynthesis(speakText);
          });
        } else {
          playLocalSpeechSynthesis(speakText);
        }

        // Inner fallback speech synthesis function
        function playLocalSpeechSynthesis(text: string) {
          if (!("speechSynthesis" in window)) return;
          
          try {
            // Cancel any previously stuck speech
            window.speechSynthesis.cancel();

            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = "vi-VN";
            utterance.rate = 1.0;
            utterance.pitch = 1.0;

            const voices = window.speechSynthesis.getVoices();
            let selectedVoice = null;

            if (streamSettings.stream_alert_voice_name) {
              selectedVoice = voices.find((v) => v.name === streamSettings.stream_alert_voice_name);
            }

            if (!selectedVoice) {
              const viVoices = voices.filter((v) => v.lang.startsWith("vi") || v.lang.includes("VI"));
              
              if (streamSettings.stream_alert_voice_gender === "male") {
                selectedVoice = viVoices.find((v) => 
                  v.name.toLowerCase().includes("nam") || 
                  v.name.toLowerCase().includes("male") || 
                  v.name.toLowerCase().includes("minh")
                );
                if (!selectedVoice) {
                  utterance.pitch = 0.75;
                  utterance.rate = 0.95;
                  selectedVoice = viVoices[0];
                }
              } else if (streamSettings.stream_alert_voice_gender === "female") {
                selectedVoice = viVoices.find((v) => 
                  v.name.toLowerCase().includes("nữ") || 
                  v.name.toLowerCase().includes("female") || 
                  v.name.toLowerCase().includes("lý") || 
                  v.name.toLowerCase().includes("linh") || 
                  v.name.toLowerCase().includes("an") || 
                  v.name.toLowerCase().includes("hoaimy") ||
                  v.name.toLowerCase().includes("google")
                );
                if (!selectedVoice) {
                  utterance.pitch = 1.15;
                  selectedVoice = viVoices[0];
                }
              } else {
                selectedVoice = viVoices.find((v) => v.name.toLowerCase().includes("google")) || viVoices[0];
              }
            }

            if (selectedVoice) {
              utterance.voice = selectedVoice;
            }

            window.speechSynthesis.speak(utterance);
          } catch (e) {
            console.error("Local speech synthesis error:", e);
          }
        }
      }, 1200); // Small delay after sound chime
    }

    // Dismiss alert after configured duration
    setTimeout(() => {
      setCurrentAlert(null);
      isPlayingRef.current = false;
    }, (streamSettings.stream_alert_duration || 8) * 1000);

  }, [queue, currentAlert, streamSettings]);

  return (
    <div id="stream-overlay-root" className="relative w-screen h-screen bg-transparent flex flex-col items-center justify-center overflow-hidden select-none">
      {/* 1. Unlock Autoplay Interaction Screen */}
      {showUnlockOverlay && (
        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex flex-col items-center justify-center p-6 text-center pointer-events-auto cursor-pointer" onClick={unlockAudio}>
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="max-w-md p-8 rounded-3xl border border-indigo-500/30 bg-slate-900/80 shadow-[0_0_50px_rgba(99,102,241,0.2)] space-y-6 flex flex-col items-center"
          >
            <div className="w-16 h-16 bg-indigo-600/10 rounded-full flex items-center justify-center border border-indigo-500/20 text-indigo-400 animate-bounce">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              </svg>
            </div>
            
            <div className="space-y-2">
              <h1 className="text-xl font-bold text-white tracking-tight">Kích hoạt âm thanh & giọng đọc</h1>
              <p className="text-sm text-slate-400 leading-relaxed">
                Trình duyệt yêu cầu bạn tương tác với màn hình một lần để cho phép phát âm thanh thông báo và đọc giọng nói tự động.
              </p>
            </div>

            <button className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl shadow-lg shadow-indigo-600/30 transition transform hover:scale-105">
              🔊 Click để kích hoạt âm thanh
            </button>

            <span className="text-[11px] text-slate-500">
              * Đối với OBS: Click chuột phải vào Browser Source → Chọn "Tương tác" (Interact) rồi bấm nút này.
            </span>
          </motion.div>
        </div>
      )}

      {/* 2. Main Alert Overlay Content */}
      <div className="w-full h-full flex items-center justify-center pointer-events-none">
        <AnimatePresence>
          {currentAlert && (
            <motion.div
              key={currentAlert.id}
              initial={{ opacity: 0, y: 100, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -100, scale: 0.8 }}
              transition={{ type: "spring", damping: 15, stiffness: 100 }}
              className="flex flex-col items-center text-center space-y-4 max-w-xl p-8 rounded-3xl bg-slate-950/95 border-2 border-indigo-500 shadow-[0_0_50px_rgba(79,70,229,0.3)] backdrop-blur-md"
            >
              {/* Custom Alert Gif */}
              <div className="w-56 h-56 flex items-center justify-center overflow-hidden rounded-2xl bg-black/40">
                <img
                  src={streamSettings.stream_alert_gif}
                  alt="Alert Effect"
                  className="max-w-full max-h-full object-contain"
                />
              </div>

              {/* Alert content */}
              <div className="space-y-2">
                <h2 className="text-2xl font-black text-amber-400 tracking-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                  {streamSettings.stream_alert_template
                    .replace("{name}", currentAlert.name)
                    .replace("{amount}", currentAlert.amount.toLocaleString("vi-VN"))}
                </h2>
                {currentAlert.message && (
                  <div className="px-6 py-3 bg-slate-900/80 border border-indigo-500/10 rounded-xl">
                    <p className="text-base text-slate-200 font-medium italic drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">
                      "{currentAlert.message}"
                    </p>
                  </div>
                )}
              </div>

              {/* Accent light shine effect */}
              <div className="absolute inset-0 bg-gradient-to-t from-indigo-500/10 to-transparent rounded-3xl pointer-events-none" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
