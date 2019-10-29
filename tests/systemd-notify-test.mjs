import test from "ava";
import { join } from "path";
import execa from "execa";
import fs from "fs";

async function wait(msecs=1000) {
  return new Promise((resolve,reject) => {
    setTimeout(resolve,msecs);
  });
}

async function writeServiceDefinition(serviceDefinitionFileName, wd) {
  return fs.promises.writeFile(
    serviceDefinitionFileName,
    `[Unit]
Description=notifying service test
[Service]
Type=notify
ExecStart=node ${wd}/build/notify-test-cli
`,
    { encoding: "utf8" }
  );
}

test("service states", async t => {
  const wd = process.cwd();

  await execa("rollup", ["-c", "tests/rollup.config.js"]);

  const unitName = "notify-test";
  const serviceDefinitionFileName = join(wd, `build/${unitName}.service`);

  await writeServiceDefinition(serviceDefinitionFileName, wd);
  await execa("systemctl", ["--user", "link", serviceDefinitionFileName]);

  const run = execa("systemctl", ["--user", "start", unitName]);

  run.stdout.on("data", data => {
    console.log(`systemctl start stdout: ${data}`);
  });

  run.stderr.on("data", data => {
    console.log(`systemctl start stderr: ${data}`);
  });

  let status;

  const statusInterval = setInterval(() => {
    const systemctl = execa("systemctl", ["status", unitName]);
    systemctl.stdout.on("data", data => {
      // Status: "running"
      const m = String(data).match(/Status:\s"([^"]+)/);
      if (m) {
        status = m[1];
      }

      console.log(`systemctl status stdout: ${data}`);
    });
    systemctl.stderr.on("data", data => {
      console.log(`systemctl status stderr: ${data}`);
    });
  }, 1000);

  await run;

  await wait(5000);

  t.is(status, "running");

  clearInterval(statusInterval);

  await execa("systemctl", ["--user", "disable", unitName]);
});
