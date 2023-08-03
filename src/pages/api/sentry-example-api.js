// A faulty API route to test Sentry's error monitoring
// @ts-expect-error just a test file, don't care about types
export default function handler(_req, res) {
  throw new Error("Sentry Example API Route Error");
  res.status(200).json({ name: "John Doe" });
}
