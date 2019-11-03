import test from "ava";
import { join } from "path";
import execa from "execa";
import { journalctl, systemctl, wait, writeUnitDefinition } from "./util.mjs";

test("service states", async t => {

  await execa("rollup", ["-c", "tests/rollup.config.js"]);

  const unitName = "notify-test";
  const wd = process.cwd();

  const unitDefinitionFileName = join(wd, `build/${unitName}.service`);

  await writeUnitDefinition(unitDefinitionFileName, unitName, wd);
  await systemctl("link", unitDefinitionFileName);

  const start = systemctl("start", unitName);

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

        //t.log(`systemctl status stdout: ${data}`);
      });

      const p = await status;
    } catch (e) {
      t.log(e);
    }
  }, 1000);

  await start;

  await wait(3000);

  t.is(status, "running");
  t.is(active, "active");

  await systemctl("stop", unitName);

  await wait(4000);

  t.is(active, "inactive");

  clearInterval(statusInterval);

  //t.log(j);
  //j.cancel();

  await systemctl("disable", unitName);
});
