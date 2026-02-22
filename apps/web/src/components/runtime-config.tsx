export const RuntimeConfig = () => {
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
