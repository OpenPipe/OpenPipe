const KEY_LENGTH = 42;

export const generateApiKey = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let randomChars = "";
  for (let i = 0; i < KEY_LENGTH; i++) {
    randomChars += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return `opc_${randomChars}`;
};
