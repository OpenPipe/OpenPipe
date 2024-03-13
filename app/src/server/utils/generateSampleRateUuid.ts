import { v4 as uuidv4 } from "uuid";

export const generateSampleRateUuid = (percentage: number) => {
  // Ensure the percentage is within bounds
  if (percentage < 0 || percentage > 100) {
    throw new Error("Percentage must be between 0 and 100");
  }

  // Convert the percentage to a fraction of the maximum value of the first 6 hex digits of UUID
  // The first 6 hex digits are chosen for simplicity and to avoid interfering with UUID version and variant bits
  const fraction = percentage / 100;
  const maxFirst6HexValue = 0xffffff; // Max value for 6 hex digits
  const thresholdValue = Math.floor(fraction * maxFirst6HexValue);

  // Format the threshold value into a 6-digit hex string
  const thresholdHex = thresholdValue.toString(16).padStart(6, "0");

  // Generate a random UUID
  let uuid = uuidv4();

  // Replace the first 6 hex digits of the UUID with our threshold-based hex digits
  // Ensuring it aligns with the percentage-based sampling requirement
  uuid = thresholdHex + uuid.slice(6);

  return uuid;
};
