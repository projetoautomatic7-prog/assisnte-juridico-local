const { spawn } = require("child_process");
const path = require("path");

const args = process.argv.slice(2);
const getArgValue = (flag) => {
  const idx = args.indexOf(flag);
  return idx !== -1 && idx + 1 < args.length ? args[idx + 1] : undefined;
};

const host = getArgValue("--host") || process.env.HOST || "0.0.0.0";
const port = getArgValue("--port") || process.env.PORT || "5000";
const apiPort = getArgValue("--api-port") || process.env.DEV_API_PORT || "3001";

console.log(`Starting Vite dev server on ${host}:${port} and local API on ${apiPort}...`);

const vite = spawn("npx", ["vite", "--host", host, "--port", port], {
  stdio: "inherit",
  cwd: process.cwd(),
  shell: true,
  env: { ...process.env, NODE_ENV: "development" },
});

const api = spawn("node", [path.join(__dirname, "dev-api-server.cjs")], {
  stdio: "inherit",
  cwd: process.cwd(),
  shell: true,
  env: { ...process.env, DEV_API_PORT: apiPort },
});

process.on("SIGINT", () => {
  vite.kill();
  api.kill();
  process.exit(0);
});

process.on("SIGTERM", () => {
  vite.kill();
  api.kill();
  process.exit(0);
});
