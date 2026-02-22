export const RuntimeConfig = () => {
  // Cloud builds have NEXT_PUBLIC_CONVEX_URL baked in at build time — no runtime injection needed
  if (process.env.NEXT_PUBLIC_CLAWE_EDITION === "cloud") {
    return null;
  }

  const config = {
    convexUrl:
      process.env.NEXT_PUBLIC_CONVEX_URL || process.env.CONVEX_URL || "",
  };

  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `window.__CLAWE_CONFIG__=${JSON.stringify(config)}`,
      }}
    />
  );
};
