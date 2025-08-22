import React from "react";

const AvatarGroup = ({ avatars = [], maxVisible = 3 }) => {
  return (
    <div className="flex items-center">
      {avatars.slice(0, maxVisible).map((avatar, index) => (
        <img
          key={index}
          src={avatar}
          alt={`Avatar ${index}`}
          className="w-9 h-9 rounded-full border-2 border-white dark:border-slate-900 -ml-3 first:ml-0 object-cover"
        />
      ))}

      {avatars.length > maxVisible && (
        <div
          className="w-9 h-9 flex items-center justify-center rounded-full border-2
                     border-white dark:border-slate-900 -ml-3
                     bg-blue-50 text-blue-700 font-medium
                     dark:bg-slate-800 dark:text-slate-300"
        >
          +{avatars.length - maxVisible}
        </div>
      )}
    </div>
  );
};

export default AvatarGroup;
