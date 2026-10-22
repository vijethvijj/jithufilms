import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const serverEntry = fileURLToPath(new URL("../dist/index.js", import.meta.url));
const child = spawn(process.execPath, [serverEntry], {
  stdio: "inherit",
  env: { ...process.env, NODE_ENV: "production" },
});

child.on("error", error => {
  console.error("Could not start the production server:", error);
  process.exitCode = 1;
});
child.on("exit", (code, signal) => {
  process.exitCode = code ?? (signal ? 1 : 0);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}
