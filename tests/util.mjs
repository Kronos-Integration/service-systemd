import execa from "execa";
import fs from "fs";

export async function journalctl(unitName) {
  const journalctl = execa('journalctl', ['--user', '-u', unitName, '-f']);
 // journalctl.stdout.pipe(process.stdout);
  return journalctl;
}

export async function systemctl(...args) {
  const systemctl = execa("systemctl", ["--user", ...args]);
  return systemctl;
}

export async function wait(msecs = 1000) {
  return new Promise((resolve, reject) => {
    setTimeout(resolve, msecs);
  });
}

export async function writeUnitDefinition(serviceDefinitionFileName, unitName, wd) {
  const which = await await execa("which", ["node"]);
  const node = which.stdout.trim(); 

  return fs.promises.writeFile(
    serviceDefinitionFileName,
    `[Unit]
Description=notifying service test
[Service]
Type=notify
ExecStart=${node} ${wd}/build/notify-test-cli
ENV=DEBUG=true

RuntimeDirectory=${unitName}
StateDirectory=${unitName}
ConfigurationDirectory=${unitName}

`,
    { encoding: "utf8" }
  );
}
