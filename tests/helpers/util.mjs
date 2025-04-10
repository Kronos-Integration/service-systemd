import { writeFile, rm, mkdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import { join } from "node:path";
import { homedir } from "node:os";
import { execa } from "execa";

export const unitName = "notify-test";
export const port = 15765;

export function monitorUnit(unitName) {
  let status, active, pid;
  let systemctl;
  let terminate = false;

  async function* getStatus() {
    systemctl = execa("systemctl", ["--user", "-n", "0", "status", unitName]);

    console.log("SYSTEMCTL", systemctl ? "RUNNING" : "OFF");
    let changed = false;
    let buffer = "";

    try {
      for await (const chunk of systemctl.stdout) {
        buffer += chunk.toString("utf8");
        do {
          const i = buffer.indexOf("\n");
          if (i < 0) {
            break;
          }
          const line = buffer.substring(0, i);
          buffer = buffer.substring(i + 1);

          let m = line.match(/Status:\s*"([^"]+)/);
          if (m && m[1] != status) {
            changed = true;
            status = m[1];
          }
          m = line.match(/Active:\s+(\w+)(\s+\((\w+)\))?/);
          if (m && (m[1] != active || m[3] != status)) {
            changed = true;
            active = m[1];
            status = m[3];
          }

          m = line.match(/Main\s+PID:\s*(\d+)/);
          if (m && m[1] != pid) {
            changed = true;
            pid = parseInt(m[1]);
          }

          if (changed) {
            yield { name: unitName, status, active, pid };
            changed = false;
          }
        } while (!terminate);
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function* entries() {
    while (!terminate) {
      yield* getStatus();
      await wait(800);
    }
  }

  return {
    entries: entries(),
    async stop() {
      terminate = true;
      return new Promise((resolve, reject) => {
        if (systemctl) {
          systemctl.on("close", (code, signal) => {
            console.log("stop systemctl", code);
            systemctl = undefined;
            resolve(code);
          });
          try {
            systemctl.kill();
          } catch (e) {
            console.error(e);
            resolve(-1);
          }
        } else {
          console.log("stop systemctl already gone");
          resolve(-1);
        }
      });
    }
  };
}

export function journalctl(unitName, num = 5) {
  const args = ["--user", "-n", num, "-f", "-o", "json"];

  if (unitName !== undefined) {
    args.push("-u", unitName);
  }

  const j = spawn("journalctl", args, {
    timeout: 5000
    // stdio: ["ignore", "pipe", process.stderr]
  });

  async function* entries() {
    let buffer = "";
    for await (const chunk of j.stdout) {
      buffer += chunk.toString("utf8");
      do {
        const i = buffer.indexOf("\n");
        if (i < 0) {
          break;
        }

        const line = buffer.substring(0, i);
        buffer = buffer.substring(i + 1);
        const entry = JSON.parse(line);
        //console.log("ENTRY", entry.MESSAGE, entry.PRIORITY);
        yield entry;
      } while (true);
    }
  }

  return {
    entries,
    async stop() {
      return new Promise((resolve, reject) => {
        j.on("close", (code, signal) => resolve(code));
        j.kill();
      });
    }
  };
}

export function systemctl(...args) {
  const r = execa("systemctl", ["--user", ...args]);

  r.stdout.pipe(process.stdout);
  r.stderr.pipe(process.stderr);

  return r;
}

export async function wait(msecs = 1000) {
  return new Promise(resolve => setTimeout(resolve, msecs));
}

export async function writeServiceUnitDefinition(
  serviceDefinitionFileName,
  unitName,
  options
) {
  const which = await execa("which", ["node"]);
  const node = which.stdout.trim();

  return writeFile(
    serviceDefinitionFileName,
    `[Unit]
Description=notifying service test
[Service]
Type=notify
ExecStart=${node} --title notify-test ${options.wd}/tests/helpers/notify-test-cli.mjs
ExecReload=/bin/kill -HUP $MAINPID
Environment=LOGLEVEL=trace
NotifyAccess=all
FileDescriptorStoreMax=2
RuntimeDirectory=${unitName}
StateDirectory=${unitName}
ConfigurationDirectory=${unitName}

`,
    { encoding: "utf8" }
  );
}

export async function writeSocketUnitDefinition(
  serviceDefinitionFileName,
  unitName,
  options
) {
  return writeFile(
    serviceDefinitionFileName,
    `[Socket]
ListenStream=${options.ListenStream}
FileDescriptorName=${options.FileDescriptorName}
[Install]
RequiredBy=${unitName}.service
`,
    { encoding: "utf8" }
  );
}

export async function beforeUnits(t) {
  async function u(type, writer, options) {
    await rm(`${homedir()}/.config/systemd/user/${unitName}.${type}`, {
      force: true
    });
    const wd = process.cwd();
    await mkdir(join(wd, "build"), { recursive: true });
    const fileName = join(wd, "build", `${unitName}.${type}`);
    await writer(fileName, unitName, { wd, ...options });
    await systemctl("link", fileName);
  }

  await u("service", writeServiceUnitDefinition);
  await u("socket", writeSocketUnitDefinition, {
    FileDescriptorName: "fd1",
    ListenStream: `127.0.0.1:${port}`
  });
}

export async function afterUnits(t) {
  try {
    await systemctl("stop", unitName);
    await systemctl("disable", unitName);
    //await systemctl("clean", unitName);
  } catch {}
}
