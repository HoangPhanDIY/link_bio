import React, { useState } from 'react';
import { BioLink } from '../types';
import LucideIcon from './LucideIcon';
import BrandIcon from './BrandIcon';
import { supabase } from '../supabase';
import ImageCropperModal from './ImageCropperModal';

interface ManageLinksTabProps {
  links: BioLink[];
  onAddLink: (title: string, url: string, icon: string) => void;
  onUpdateLink?: (id: string, title: string, url: string, icon: string) => void;
  onDeleteLink: (id: string) => void;
  onToggleLink: (id: string, enabled: boolean) => void;
  onReorderLinks: (newLinks: BioLink[]) => void;
  accentColor: string;
}

const isCustomIcon = (icon: string) => {
  return icon && (
    icon.startsWith('/uploads/') || 
    icon.startsWith('http://') || 
    icon.startsWith('https://') || 
    icon.startsWith('data:')
  );
};

const PRESET_ICONS = [
  { label: 'Facebook', value: 'Facebook' },
  { label: 'Instagram', value: 'Instagram' },
  { label: 'TikTok', value: 'Tiktok' },
  { label: 'YouTube', value: 'Youtube' },
  { label: 'Zalo', value: 'Zalo' },
  { label: 'GitHub', value: 'Github' },
  { label: 'Gmail', value: 'Gmail' },
  { label: 'Website', value: 'Globe' }
];

export default function ManageLinksTab({
  links,
  onAddLink,
  onUpdateLink,
  onDeleteLink,
  onToggleLink,
  onReorderLinks,
  accentColor
}: ManageLinksTabProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<BioLink | null>(null);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [icon, setIcon] = useState('Globe');
  const [customIcon, setCustomIcon] = useState('');

  // Drag interaction states
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const [isUploading, setIsUploading] = useState(false);

  // Cropper Modal States
  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropperFile, setCropperFile] = useState<File | null>(null);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCropperFile(file);
      setCropperOpen(true);
      e.target.value = "";
    }
  };

  const handleCropperConfirm = async (croppedFile: File) => {
    setCropperOpen(false);
    setCropperFile(null);
    setIsUploading(true);

    try {
      const fileExt = croppedFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `uploads/${fileName}`;

      // Upload to bucket 'images'
      const { data, error } = await supabase.storage
        .from('images')
        .upload(filePath, croppedFile, {
          cacheControl: '3600',
          upsert: false,
          contentType: croppedFile.type
        });

      if (error) {
        throw error;
      }

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from('images')
        .getPublicUrl(filePath);

      if (publicUrlData.publicUrl) {
        setCustomIcon(publicUrlData.publicUrl);
        setIcon(''); // clear preset
        window.showNotification?.("Tải lên logo tùy chỉnh thành công!", "success");
      } else {
        window.showNotification?.("Không tìm thấy URL ảnh sau khi tải lên!", "error");
      }
    } catch (err: any) {
      console.error('Error uploading to Supabase Storage:', err);
      window.showNotification?.(`Đã xảy ra lỗi khi tải ảnh lên: ${err.message || err}`, "error");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !url.trim()) return;

    const finalIcon = customIcon.trim() ? customIcon.trim() : icon;
    
    if (editingLink) {
      if (onUpdateLink) {
        onUpdateLink(editingLink.id, title, url, finalIcon);
      }
    } else {
      onAddLink(title, url, finalIcon);
    }

    // Reset Form
    setTitle('');
    setUrl('');
    setIcon('Globe');
    setCustomIcon('');
    setEditingLink(null);
    setIsModalOpen(false);
  };

  const moveLink = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= links.length) return;

    const updated = [...links];
    const temp = updated[index];
    updated[index] = updated[newIndex];
    updated[newIndex] = temp;
    onReorderLinks(updated);
  };

  return (
    <div className="space-y-6">
      {/* Header and Add Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-slate-800">Quản lý liên kết</h2>
          <p className="text-slate-500 text-sm font-sans">Sắp xếp và tùy chỉnh các liên kết của bạn.</p>
        </div>
        <button 
          onClick={() => {
            setEditingLink(null);
            setTitle('');
            setUrl('');
            setIcon('Globe');
            setCustomIcon('');
            setIsModalOpen(true);
          }}
          className="text-white px-5 py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-md hover:brightness-110 active:scale-95 transition-all text-sm cursor-pointer"
          style={{ backgroundColor: accentColor }}
        >
          <LucideIcon name="add" size={18} />
          Thêm liên kết mới
        </button>
      </div>

      {/* Draggable List */}
      <div className="space-y-4">
        {links.map((link, idx) => {
          const isDragged = draggedId === link.id;

          return (
            <div 
              key={link.id}
              className={`flex items-center gap-4 p-4 bg-white border border-slate-100 rounded-xl transition-all duration-300 shadow-sm hover:shadow-md ${
                isDragged ? 'opacity-40 border-dashed border-indigo-400 bg-indigo-50/20' : ''
              }`}
            >
              {/* Grab Handles & Order Actions */}
              <div className="flex flex-col items-center gap-1">
                <button 
                  onClick={() => moveLink(idx, 'up')}
                  disabled={idx === 0}
                  className={`p-1 rounded hover:bg-slate-50 text-slate-400 disabled:opacity-20 disabled:hover:bg-transparent`}
                  title="Di chuyển lên"
                >
                  <LucideIcon name="ChevronUp" size={14} />
                </button>
                <div 
                  className="cursor-grab active:cursor-grabbing text-slate-300 p-1 hover:bg-slate-50 rounded"
                  onMouseDown={() => setDraggedId(link.id)}
                  onMouseUp={() => setDraggedId(null)}
                >
                  <LucideIcon name="drag_indicator" size={16} />
                </div>
                <button 
                  onClick={() => moveLink(idx, 'down')}
                  disabled={idx === links.length - 1}
                  className={`p-1 rounded hover:bg-slate-50 text-slate-400 disabled:opacity-20 disabled:hover:bg-transparent`}
                  title="Di chuyển xuống"
                >
                  <LucideIcon name="ChevronDown" size={14} />
                </button>
              </div>

              {/* Icon Visual */}
              <div 
                className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold transition-all ${
                  isCustomIcon(link.icon)
                    ? 'p-0 bg-transparent border-0'
                    : 'p-1 bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-800 text-slate-800 dark:text-slate-100'
                }`}
              >
                <BrandIcon 
                  title={link.title} 
                  iconName={link.icon} 
                  size={isCustomIcon(link.icon) ? 48 : 24} 
                />
              </div>

              {/* Meta details */}
              <div className="flex-1 min-w-0">
                <h4 className="font-display font-bold text-slate-800 text-sm sm:text-base truncate">
                  {link.title}
                </h4>
                <p className="text-slate-400 text-xs sm:text-sm font-mono truncate">
                  {link.url}
                </p>
                {/* Embedded dynamic analytics count badge */}
                <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-400">
                  <span className="flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100 font-mono">
                    <strong>{link.clicks.toLocaleString()}</strong> Lượt click
                  </span>
                  <span className="flex items-center gap-1 bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full border border-emerald-100 font-mono">
                    <strong>{link.conversions}%</strong> Tỷ lệ chuyển đổi
                  </span>
                </div>
              </div>

              {/* Interactive Controls on the Right */}
              <div className="flex items-center gap-3 shrink-0">
                {/* Switch Toggle */}
                <button
                  onClick={() => onToggleLink(link.id, !link.enabled)}
                  className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-300 focus:outline-none relative ${
                    link.enabled ? '' : 'bg-slate-200'
                  }`}
                  style={{ backgroundColor: link.enabled ? accentColor : undefined }}
                >
                  <div 
                    className={`w-5 h-5 rounded-full bg-white shadow-md transform duration-300 ${
                      link.enabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
 
                {/* Edit button */}
                <button 
                  onClick={() => {
                    setEditingLink(link);
                    setTitle(link.title);
                    setUrl(link.url);
                    const isPreset = PRESET_ICONS.some(p => p.value === link.icon);
                    if (isPreset) {
                      setIcon(link.icon);
                      setCustomIcon('');
                    } else {
                      setIcon('Globe');
                      setCustomIcon(link.icon);
                    }
                    setIsModalOpen(true);
                  }}
                  className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                  title="Chỉnh sửa liên kết"
                >
                  <LucideIcon name="edit" size={18} />
                </button>

                {/* Delete button */}
                <button 
                  onClick={() => onDeleteLink(link.id)}
                  className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                  title="Xóa liên kết"
                >
                  <LucideIcon name="delete" size={18} />
                </button>
              </div>
            </div>
          );
        })}

        {links.length === 0 && (
          <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-12 text-center text-slate-400">
            <LucideIcon name="Globe" size={40} className="mx-auto mb-3 text-slate-300" />
            <h4 className="font-display font-bold text-slate-700">Chưa có liên kết nào được tạo</h4>
            <p className="text-sm text-slate-400 mt-1 max-w-xs mx-auto">
              Thêm liên kết đầu tiên của bạn bằng cách nhấp vào nút phía trên để bắt đầu xây dựng trang tiểu sử của bạn.
            </p>
          </div>
        )}
      </div>

      {/* Add Link Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl border border-slate-100 transform transition-all animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="flex justify-between items-start mb-5">
              <div>
                <h3 className="font-display text-lg font-bold text-slate-800">
                  {editingLink ? 'Chỉnh sửa liên kết' : 'Thêm liên kết mới'}
                </h3>
                <p className="text-slate-400 text-xs mt-1">
                  {editingLink ? 'Cập nhật thông tin chi tiết cho liên kết của bạn.' : 'Điền thông tin chi tiết cho liên kết tiểu sử mới.'}
                </p>
              </div>
              <button 
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingLink(null);
                }}
                className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
              >
                <LucideIcon name="close" size={16} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Title Input */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 font-mono">
                  Tiêu đề hiển thị
                </label>
                <input 
                  type="text"
                  required
                  placeholder="Ví dụ: Website cá nhân, Facebook,..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all text-sm text-slate-800"
                />
              </div>

              {/* Destination URL Input */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 font-mono">
                  Đường dẫn liên kết (URL)
                </label>
                <input 
                  type="text"
                  required
                  placeholder="Ví dụ: facebook.com/ten-cua-ban"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all text-sm text-slate-800"
                />
              </div>

              {/* Preset Icon Selector */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 font-mono">
                  Biểu tượng liên kết (Có sẵn)
                </label>
                <div className="grid grid-cols-4 gap-2.5">
                  {PRESET_ICONS.map((preset) => (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => {
                        setIcon(preset.value);
                        setCustomIcon('');
                      }}
                      className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all aspect-square relative ${
                        icon === preset.value && !customIcon
                          ? 'border-indigo-500 bg-indigo-50/10 font-semibold text-indigo-600 ring-2 ring-indigo-500/10'
                          : 'border-slate-100 bg-white hover:bg-slate-50 text-slate-600'
                      }`}
                      title={preset.label}
                    >
                      <div className="w-7 h-7 flex items-center justify-center mb-1">
                        <BrandIcon title={preset.label} iconName={preset.value} size={24} />
                      </div>
                      <span className="text-[10px] text-slate-500 truncate w-full text-center">
                        {preset.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Upload Custom Logo Option */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-150">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 font-mono">
                  Hoặc Tải ảnh logo liên kết lên (Tùy chọn)
                </label>
                {customIcon && (customIcon.startsWith('/uploads/') || customIcon.startsWith('http://') || customIcon.startsWith('https://')) ? (
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white rounded-xl border border-slate-200 flex items-center justify-center p-1 shrink-0 shadow-sm">
                      <img src={customIcon} alt="Custom Logo" className="w-10 h-10 object-contain rounded-lg" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-700 truncate">{customIcon.split('/').pop()}</p>
                      <button
                        type="button"
                        onClick={() => {
                          setCustomIcon('');
                          setIcon('Globe');
                        }}
                        className="text-[10px] font-bold text-rose-500 hover:underline mt-0.5"
                      >
                        Xóa ảnh logo này
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <input
                      type="file"
                      id="link-logo-upload"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                    <label
                      htmlFor="link-logo-upload"
                      className="flex items-center justify-center gap-2 border border-dashed border-slate-300 bg-white hover:bg-slate-50 rounded-xl py-3 px-4 cursor-pointer text-xs font-semibold text-slate-600 transition-colors"
                    >
                      {isUploading ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                          Đang tải lên...
                        </>
                      ) : (
                        <>
                          <LucideIcon name="UploadCloud" size={14} className="text-indigo-500" />
                          Chọn ảnh logo từ máy tính
                        </>
                      )}
                    </label>
                    <p className="text-[10px] text-slate-400 mt-1.5 font-mono leading-normal">
                      Hỗ trợ JPG, PNG, WEBP. Tự động cắt bo góc và vừa vặn kích cỡ, không nền.
                    </p>
                  </div>
                )}
              </div>

              {/* Custom Lucide Icon Search */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 font-mono">
                  Hoặc tên biểu tượng Lucide tùy chọn
                </label>
                <div className="relative">
                  <input 
                    type="text"
                    placeholder="Ví dụ: Github, Code, Youtube, Sparkles"
                    value={customIcon}
                    onChange={(e) => setCustomIcon(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 pl-10 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all text-sm text-slate-800"
                  />
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <LucideIcon name="search" size={14} />
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 mt-1 font-mono">
                  Hỗ trợ bất kỳ tên biểu tượng tiêu chuẩn nào từ thư viện Lucide.
                </p>
              </div>

              {/* Actions */}
              <div className="pt-2 flex gap-3">
                <button 
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingLink(null);
                  }}
                  className="flex-1 bg-slate-50 text-slate-700 py-3.5 rounded-xl font-bold hover:bg-slate-100 transition-colors text-sm"
                >
                  Hủy
                </button>
                <button 
                  type="submit"
                  className="flex-1 text-white py-3.5 rounded-xl font-bold hover:brightness-110 shadow-md hover:shadow-indigo-500/10 active:scale-95 transition-all text-sm"
                  style={{ backgroundColor: accentColor }}
                >
                  {editingLink ? 'Cập nhật' : 'Lưu liên kết'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Image Cropper Modal */}
      <ImageCropperModal
        isOpen={cropperOpen}
        imageFile={cropperFile}
        aspectRatio={1}
        title="Cắt logo liên kết (Tỷ lệ 1:1)"
        onClose={() => {
          setCropperOpen(false);
          setCropperFile(null);
        }}
        onConfirm={handleCropperConfirm}
      />

    </div>
  );
}
