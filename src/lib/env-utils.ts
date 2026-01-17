export function isProduction(): boolean {
  const viteEnv = (import.meta as unknown as { env?: { PROD?: boolean } }).env;
  if (typeof viteEnv?.PROD === "boolean") return viteEnv.PROD;

  const nodeEnv =
    typeof process !== "undefined" && typeof process.env !== "undefined"
      ? process.env.NODE_ENV
      : undefined;
  return nodeEnv === "production";
}
