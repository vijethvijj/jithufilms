import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const tsxCli = fileURLToPath(
  new URL("../node_modules/tsx/dist/cli.mjs", import.meta.url)
);
const serverEntry = fileURLToPath(
  new URL("../server/_core/index.ts", import.meta.url)
);
const child = spawn(process.execPath, [tsxCli, "watch", serverEntry], {
  stdio: "inherit",
  env: { ...process.env, NODE_ENV: "development" },
});

child.on("error", error => {
  console.error("Could not start the development server:", error);
  process.exitCode = 1;
});
child.on("exit", (code, signal) => {
  process.exitCode = code ?? (signal ? 1 : 0);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}
