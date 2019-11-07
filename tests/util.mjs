import execa from "execa";
import fs from "fs";

export function monitorUnit(unitName, cb) {
  let status, active, pid;

  const statusInterval = setInterval(async () => {
    try {
      //const sysctl = systemctl("status",unitName);
      const sysctl = execa("systemctl", ["--user", "status", unitName]);
      sysctl.stderr.pipe(process.stderr);

      let changed = false;
      let buffer = "";
      for await (const chunk of sysctl.stdout) {
        buffer += chunk.toString("utf8");
        const i = buffer.indexOf("\n");
        if (i >= 0) {
          const line = buffer.substr(0, i);
          buffer = buffer.substr(i + 1);
          let m = line.match(/Status:\s*"([^"]+)/);
          if (m && m[1] != status) {
            changed = true;
            status = m[1];
          }
          m = line.match(/Active:\s*(\w+)/);
          if (m && m[1] != active) {
            changed = true;
            active = m[1];
          }

          m = line.match(/Main\s+PID:\s*(\d+)/);
          if (m && m[1] != pid) {
            changed = true;
            pid = parseInt(m[1]);
          }

          if (changed) {
            cb({ name: unitName, status, active, pid });
            changed = false;
          }
        }
      }

      const p = await status;
    } catch (e) {
      console.log(e);
    }
  }, 1000);

  return statusInterval;
}

export function clearMonitorUnit(handle) {
  clearInterval(handle);
}

export async function* journalctl(unitName) {
  const j = execa("journalctl", ["--user", "-u", unitName, "-f", "-o", "json"]);

  let buffer = "";
  for await (const chunk of j.stdout) {
    buffer += chunk.toString("utf8");
    const i = buffer.indexOf("\n");
    if (i >= 0) {
      const line = buffer.substr(0, i);
      buffer = buffer.substr(i + 1);
      const entry = JSON.parse(line);
      console.log(entry.MESSAGE);
      yield entry;
    }
  }

  return j;
}

export function systemctl(...args) {
  return execa("systemctl", ["--user", ...args]);
}

export async function wait(msecs = 1000) {
  return new Promise(resolve => setTimeout(resolve, msecs));
}

export async function writeUnitDefinition(
  serviceDefinitionFileName,
  unitName,
  wd
) {
  const which = await await execa("which", ["node"]);
  const node = which.stdout.trim();

  return fs.promises.writeFile(
    serviceDefinitionFileName,
    `[Unit]
Description=notifying service test
[Service]
Type=notify
ExecStart=${node} ${wd}/build/notify-test-cli
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
  fileDescriptorName,
  socket
) {
  return fs.promises.writeFile(
    serviceDefinitionFileName,
    `[Socket]
ListenStream=${socket}
FileDescriptorName=${fileDescriptorName}
[Install]
RequiredBy=${unitName}.service
`,
    { encoding: "utf8" }
  );
}
