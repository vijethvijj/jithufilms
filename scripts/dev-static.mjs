import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const viteCli = fileURLToPath(
  new URL("../node_modules/vite/bin/vite.js", import.meta.url)
);
const port = process.env.PORT || "3001";
const child = spawn(
  process.execPath,
  [viteCli, "--host", "0.0.0.0", "--port", port, "--strictPort"],
  {
    stdio: "inherit",
    env: process.env,
  }
);

child.on("error", error => {
  console.error("Could not start the static Vite server:", error);
  process.exitCode = 1;
});
child.on("exit", (code, signal) => {
  process.exitCode = code ?? (signal ? 1 : 0);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}
