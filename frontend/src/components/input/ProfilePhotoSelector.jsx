// components/ProfilePhotoSelector.jsx
import React, { useRef, useState, useEffect } from "react";
import { LuUser, LuUpload, LuTrash } from "react-icons/lu";

const ProfilePhotoSelector = ({
  image,
  setImage,
  accept = "image/png,image/jpeg,image/jpg",
  disabled = false,
  className = "",
}) => {
  const inputRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  useEffect(() => {
    if (!image) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(image);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [image]);

  const handleImageChange = (event) => {
    const file = event.target.files && event.target.files[0];
    if (file) setImage(file);
  };

  const handleRemoveImage = () => {
    setImage(null);
    if (inputRef.current) inputRef.current.value = ""; // reset input
  };

  const onChooseFile = () => {
    if (!disabled) inputRef.current?.click();
  };

  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <div className="w-16 h-16 rounded-full overflow-hidden grid place-items-center
                      bg-slate-100 border border-slate-200
                      dark:bg-slate-800 dark:border-slate-700">
        {previewUrl ? (
          <img
            src={previewUrl}
            alt="Profile preview"
            className="w-full h-full object-cover"
          />
        ) : (
          <LuUser className="text-slate-400 dark:text-slate-300" size={28} />
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onChooseFile}
          disabled={disabled}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm
                     bg-white text-slate-700 hover:bg-slate-50
                     border-slate-200
                     focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
                     disabled:opacity-50
                     dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/60
                     dark:border-slate-700 dark:focus-visible:ring-blue-400"
        >
          <LuUpload size={18} />
          Choose Photo
        </button>

        {image && (
          <button
            type="button"
            onClick={handleRemoveImage}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm
                       text-rose-600 hover:bg-rose-50 border-rose-200
                       focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500
                       dark:text-rose-400 dark:hover:bg-rose-900/20 dark:border-rose-800
                       dark:focus-visible:ring-rose-400"
          >
            <LuTrash size={18} />
            Remove
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleImageChange}
        disabled={disabled}
      />
    </div>
  );
};

export default ProfilePhotoSelector;
