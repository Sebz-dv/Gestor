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

  // Genera / limpia el preview cuando cambia `image`
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
      <div className="w-16 h-16 rounded-full overflow-hidden bg-slate-100 border grid place-items-center">
        {previewUrl ? (
          <img
            src={previewUrl}
            alt="Profile preview"
            className="w-full h-full object-cover"
          />
        ) : (
          <LuUser className="text-slate-400" size={28} />
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onChooseFile}
          disabled={disabled}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border bg-white text-sm hover:bg-slate-50 disabled:opacity-50"
        >
          <LuUpload size={18} />
          Choose Photo
        </button>

        {image && (
          <button
            type="button"
            onClick={handleRemoveImage}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm hover:bg-red-50 text-red-600 border-red-200"
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
