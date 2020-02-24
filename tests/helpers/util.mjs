import execa from "execa";
import fs from "fs";
import { exec, spawn }  from 'child_process';

export function monitorUnit(unitName, cb) {
  let status, active, pid;

  let sysctl;
  let terminate;

  const handler = async () => {
    try {
      sysctl = execa("systemctl", ["--user", "-n", "0", "status", unitName]);

      let changed = false;
      let buffer = "";
      for await (const chunk of sysctl.stdout) {
        buffer += chunk.toString("utf8");
        do {
          const i = buffer.indexOf("\n");
          if (i < 0) {
            break;
          }
          const line = buffer.substr(0, i);
          buffer = buffer.substr(i + 1);

          //console.log(line);

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
            cb({ name: unitName, status, active, pid });
            changed = false;
          }
        } while (true);
      }
      const p = await status;

      if (!terminate) {
        setTimeout(handler, 800);
      }
    } catch (e) {
      console.log(e);
    }
  };

  handler();

  return {
    terminate: () => {
      terminate = true;
      sysctl.kill();
    }
  };
}

export function clearMonitorUnit(handle) {
  handle.terminate();
}

export function journalctl(unitName) {
  const args = ["--user", "-n", "1", "-f", "-o", "json"];

  if (unitName !== undefined) {
    args.push("-u", unitName);
  }

  const j = spawn("journalctl", args, {
    timeout: 5000,
    stdio: ['ignore', 'pipe', process.stderr]
  });

  async function * entries() {
    let buffer = "";
    for await (const chunk of j.stdout) {
      buffer += chunk.toString("utf8");
      //console.log(buffer);
      do {
        const i = buffer.indexOf("\n");
        if (i < 0) {
          break;
        }

        const line = buffer.substr(0, i);
        buffer = buffer.substr(i + 1);
        const entry = JSON.parse(line);
        if (entry.MESSAGE === "*** END ***") {
          return;
        }
        yield entry;
      } while (true);
    }
  };

  return {
    entries: entries(),
    stop() {
      j.kill();
    }
  };
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
ExecStart=${node} --title notify-test ${wd}/build/notify-test-cli.cjs
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
