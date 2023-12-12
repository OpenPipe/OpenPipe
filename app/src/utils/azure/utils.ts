// Ensure blobs are sorted by date in descending order
export const inverseDatePrefix = () => {
  return new Date(2070, 0, 1).getTime() - new Date().getTime();
};
