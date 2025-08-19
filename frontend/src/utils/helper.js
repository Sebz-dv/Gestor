export const validateEmail = (email) => {
  const v = String(email || "").trim();
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(v);
};
export default validateEmail;
    