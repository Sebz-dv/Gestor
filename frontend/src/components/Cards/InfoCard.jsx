import React from "react";

const InfoCard = ({ icon: Icon, label, value, color }) => {
  return (
    <div className="flex items-center gap-3">
      {/* Indicador de color o icono */}
      <div className={`w-3 md:w-4 h-3 md:h-4 ${color} rounded-full flex items-center justify-center`}>
        {Icon && <Icon className="text-white w-2.5 h-2.5 md:w-3 md:h-3" />}
      </div>
      {/* Texto */}
      <p className="text-xs md:text-sm text-gray-500">
        <span className="text-sm md:text-base font-medium text-gray-900">
          {value}
        </span>
        {label}
      </p>
    </div>
  );
};

export default InfoCard;
