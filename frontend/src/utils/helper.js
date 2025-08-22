export const validateEmail = (email) => {
  const v = String(email || "").trim();
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(v);
};
export default validateEmail;

export const addThousandsSeparator = (num) => {
  if (num == null || isNaN(num)) return "";
  // Separa parte entera y decimal (si existe)
  const [integerPart, fractionalPart] = num.toString().split(".");
  // Agrega comas cada 3 dígitos
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  return fractionalPart
    ? `${formattedInteger}.${fractionalPart}`
    : formattedInteger;
};
