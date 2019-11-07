import test from "ava";
import { join } from "path";
import execa from "execa";
import {
  clearMonitorUnit,
  monitorUnit,
  journalctl,
  systemctl,
  wait,
  writeUnitDefinition,
  writeSocketUnitDefinition
} from "./util.mjs";

const unitName = "notify-test";

test.before(async t => {
  await execa("rollup", ["-c", "tests/rollup.config.js"]);

  const wd = process.cwd();

  const unitDefinitionFileName = join(wd, `build/${unitName}.service`);
  await writeUnitDefinition(unitDefinitionFileName, unitName, wd);
  await systemctl("link", unitDefinitionFileName);

  const socketUnitDefinitionFileName = join(wd, `build/${unitName}.socket`);
  const port = 8080;
  await writeSocketUnitDefinition(
    socketUnitDefinitionFileName,
    unitName,
    "main",
    port
  );
  await systemctl("link", socketUnitDefinitionFileName);
});

test.after("cleanup", async t => {
  await systemctl("disable", unitName);
});

test.skip("logging", async t => {
  await systemctl("restart", unitName);

  for await (const entry of journalctl(unitName)) {
    console.log(entry);
    t.is(entry.MESSAGE, "error test after start");

    if(entry.MESSAGE === 'error test after start') {
      break;
    }
  }

  await systemctl("stop", unitName);
});

test("service states", async t => {
  systemctl("start", unitName);
  //systemctl("start", unitName + '.socket');

  let status, active;
  const m = monitorUnit(unitName, unit => {
    // t.log(unit);
    active = unit.active;
    status = unit.status;
  });

  await wait(3000);

  t.is(status, "running");
  t.is(active, "active");

  await systemctl("stop", unitName);

  await wait(4000);

  t.is(active, "inactive");

  clearMonitorUnit(m);
});

test("service kill", async t => {
  systemctl("start", unitName);

  let pid;

  const m = monitorUnit(unitName, unit => {
    pid = unit.pid;
  });

  await wait(1000);

  process.kill(pid);

  await wait(4000);

  t.is(active, "inactive");
});