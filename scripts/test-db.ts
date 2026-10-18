import { spawn, type ChildProcess } from "node:child_process";
import { randomUUID } from "node:crypto";

// No dotenv or caller-provided DB URL: tests own an isolated Compose project.
const project = `kvarta-test-${randomUUID()}`;
const compose = ["compose", "-p", project, "-f", "compose.test.yaml"];
let activeChild: ChildProcess | undefined;
let interrupted: "SIGINT" | "SIGTERM" | undefined;
let cleaningUp = false;

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

try {
  await docker(["up", "-d", "--wait", "--wait-timeout", "60"]);
  const address = await docker(["port", "db", "5432"], true);
  const match = /^127\.0\.0\.1:(\d+)$/.exec(address);
  if (!match) throw new Error("Test database must be bound to loopback.");
  const databaseUrl = `postgresql://kvarta_test:kvarta_test@127.0.0.1:${match[1]}/kvarta_test`;
  const result = await run(process.execPath, ["--conditions=react-server", "--test", "tests/database.test.ts"], false, {
    ...process.env, DATABASE_URL: databaseUrl, DATABASE_URL_DIRECT: databaseUrl,
  });
  process.exitCode = result.status ?? 1;
} catch {
  console.error(interrupted
    ? "Database tests interrupted; cleaning up the temporary database."
    : "Database tests failed to start. Check Docker and the cached postgres:17-alpine image.");
  process.exitCode = 1;
} finally {
  cleaningUp = true;
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
