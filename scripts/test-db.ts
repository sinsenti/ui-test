import { spawn, type ChildProcess } from "node:child_process";
import { randomUUID } from "node:crypto";
import { cp, mkdtemp, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

// No dotenv or caller-provided DB URL: tests own an isolated Compose project.
const project = `kvarta-test-${randomUUID()}`;
const compose = ["compose", "-p", project, "-f", "compose.test.yaml"];
let activeChild: ChildProcess | undefined;
let interrupted: "SIGINT" | "SIGTERM" | undefined;
let cleaningUp = false;
let app: ChildProcess | undefined;
let fixture: string | undefined;

function interrupt(signal: "SIGINT" | "SIGTERM") {
  interrupted ??= signal;
  if (!cleaningUp) activeChild?.kill("SIGTERM");
}
const onSigint = () => interrupt("SIGINT");
const onSigterm = () => interrupt("SIGTERM");
process.on("SIGINT", onSigint);
process.on("SIGTERM", onSigterm);

async function run(command: string, args: string[], capture = false, env = process.env) {
  if (interrupted && !cleaningUp) throw new Error("Interrupted.");
  return new Promise<{ status: number | null; output: string }>((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: capture ? ["ignore", "pipe", "inherit"] : "inherit",
      // Keep a second terminal interrupt from killing the cleanup command.
      detached: cleaningUp,
      env,
      timeout: 120_000,
    });
    activeChild = child;
    let output = "";
    child.stdout?.setEncoding("utf8").on("data", (chunk: string) => { output += chunk; });
    child.on("error", reject);
    child.on("close", (status) => {
      if (activeChild === child) activeChild = undefined;
      resolve({ status, output: output.trim() });
    });
  });
}

async function docker(args: string[], capture = false): Promise<string> {
  const result = await run("docker", [...compose, ...args], capture);
  if (result.status !== 0) throw new Error("Test database Docker command failed.");
  return result.output;
}

async function startApplication(env: NodeJS.ProcessEnv): Promise<string> {
  fixture = await mkdtemp(join(tmpdir(), "kvarta-http-test-"));
  // Separate generated files/locks: tests can run beside the developer's server.
  for (const source of ["src", "assets", "package.json", "tsconfig.json"]) {
    await cp(resolve(source), join(fixture, source), { recursive: true });
  }
  await symlink(resolve("node_modules"), join(fixture, "node_modules"), "dir");
  app = spawn(process.execPath, [resolve("node_modules/next/dist/bin/next"),
    "dev", fixture, "--webpack", "--hostname", "127.0.0.1", "--port", "0"], {
    cwd: fixture, env: { ...env, NEXT_TELEMETRY_DISABLED: "1" },
    stdio: ["ignore", "pipe", "pipe"], detached: true,
  });
  return new Promise((resolveUrl, reject) => {
    const timeout = setTimeout(() => reject(new Error("Test application startup timed out.")), 45_000);
    let output = "";
    app!.on("error", (error) => { clearTimeout(timeout); reject(error); });
    app!.on("exit", () => { clearTimeout(timeout); reject(new Error("Test application exited.")); });
    app!.stderr?.resume();
    app!.stdout?.on("data", (chunk: Buffer) => {
      output = (output + chunk.toString()).slice(-5000);
      // Wait for readiness as well as the selected ephemeral port.
      const port = /http:\/\/(?:localhost|127\.0\.0\.1):(\d+)/.exec(output)?.[1];
      if (port && /Ready in/.test(output)) {
        clearTimeout(timeout);
        resolveUrl(`http://127.0.0.1:${port}`);
      }
    });
  });
}

async function stopApplication() {
  if (app && app.exitCode === null && app.signalCode === null) {
    const processId = app.pid;
    await new Promise<void>((resolveStopped) => {
      const force = setTimeout(() => {
        try { if (processId) process.kill(-processId, "SIGKILL"); } catch { /* Already stopped. */ }
      }, 5000);
      app!.once("exit", () => { clearTimeout(force); resolveStopped(); });
      try { if (processId) process.kill(-processId, "SIGTERM"); } catch { clearTimeout(force); resolveStopped(); }
    });
  }
  if (fixture) await rm(fixture, { recursive: true, force: true });
}

try {
  await docker(["up", "-d", "--wait", "--wait-timeout", "60"]);
  const address = await docker(["port", "db", "5432"], true);
  const match = /^127\.0\.0\.1:(\d+)$/.exec(address);
  if (!match) throw new Error("Test database must be bound to loopback.");
  const databaseUrl = `postgresql://kvarta_test:kvarta_test@127.0.0.1:${match[1]}/kvarta_test`;
  const testEnv = {
    ...process.env, DATABASE_URL: databaseUrl, DATABASE_URL_DIRECT: databaseUrl,
    TELEGRAM_TRANSPORT: "mock", TELEGRAM_MOCK_SCENARIO: "success",
    TELEGRAM_BOT_TOKEN: "", TELEGRAM_CHAT_ID: "", CRON_SECRET: randomUUID(),
  };
  const appUrl = await startApplication(testEnv);
  const result = await run(process.execPath, ["--conditions=react-server", "--test", "--test-concurrency=1",
    "tests/database.test.ts", "tests/lead.test.ts", "tests/notification.test.ts", "tests/landing.test.ts"], false, { ...testEnv, TEST_APP_URL: appUrl });
  process.exitCode = result.status ?? 1;
} catch {
  console.error(interrupted
    ? "Database tests interrupted; cleaning up the temporary database."
    : "Integration tests failed to start. Check Docker, dependencies, and the cached postgres:17-alpine image.");
  process.exitCode = 1;
} finally {
  cleaningUp = true;
  try { await stopApplication(); } catch {
    console.error("Could not clean up the test application.");
    process.exitCode = 1;
  }
  try {
    // Only this process's generated project; never the development project.
    await docker(["down", "--volumes"]);
  } catch {
    console.error(`Could not clean up test project ${project}.`);
    process.exitCode = 1;
  }
  if (interrupted) process.exitCode = interrupted === "SIGINT" ? 130 : 143;
  process.off("SIGINT", onSigint);
  process.off("SIGTERM", onSigterm);
}
