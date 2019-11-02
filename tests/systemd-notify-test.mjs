import test from "ava";
import { join } from "path";
import execa from "execa";
import fs from "fs";


async function journalctl(unitName) {
  const journalctl = execa('journalctl', ['--user', '-u', unitName, '-f']);
 // journalctl.stdout.pipe(process.stdout);
  return journalctl;
}

async function systemctl(...args) {
  const systemctl = execa("systemctl", ["--user", ...args]);
  return systemctl;
}

async function wait(msecs = 1000) {
  return new Promise((resolve, reject) => {
    setTimeout(resolve, msecs);
  });
}

async function writeServiceDefinition(serviceDefinitionFileName, unitName, wd) {
  const which = await await execa("which", ["node"]);
  const node = which.stdout.trim(); 

  return fs.promises.writeFile(
    serviceDefinitionFileName,
    `[Unit]
Description=notifying service test
[Service]
Type=notify
ExecStart=${node} ${wd}/build/notify-test-cli

RuntimeDirectory=${unitName}
StateDirectory=${unitName}
ConfigurationDirectory=${unitName}

`,
    { encoding: "utf8" }
  );
}

test("service states", async t => {
  const wd = process.cwd();

  await execa("rollup", ["-c", "tests/rollup.config.js"]);

  const unitName = "notify-test";
  const serviceDefinitionFileName = join(wd, `build/${unitName}.service`);

  await writeServiceDefinition(serviceDefinitionFileName, unitName, wd);
  await systemctl( "link", serviceDefinitionFileName);

  const start = systemctl( "start", unitName);

  //start.stdout.pipe(process.stdout);
  //start.stderr.pipe(process.stderr);

  const j = journalctl(unitName);

  let status, active;

  const statusInterval = setInterval(async () => {
    status = undefined;
    active = undefined;
    try {
      const sysctl = execa("systemctl", ["--user", "status", unitName]);
      sysctl.stdout.on("data", data => {
        let m = String(data).match(/Status:\s*"([^"]+)/);
        if (m) {
          status = m[1];
        }
        m = String(data).match(/Active:\s*(\w+)/);
        if (m) {
          active = m[1];
        }

        t.log(`systemctl status stdout: ${data}`);
      });
      sysctl.stderr.on("data", data => {
        t.log(`systemctl status stderr: ${data}`);
      });

      const p = await status;
    }
    catch (e) {
      t.log(e);
    }
  }, 1000);

  await start;

  await wait(3000);

  t.is(status, "running");
  t.is(active, "active");

  await systemctl( "stop", unitName);

  await wait(4000);

  t.is(active, "inactive");

  clearInterval(statusInterval);

  //t.log(j);
  //j.cancel();

  await systemctl( "disable", unitName);
});
