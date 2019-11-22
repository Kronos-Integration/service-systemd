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
  const wd = process.cwd();

  const unitDefinitionFileName = join(wd, `build/${unitName}.service`);
  await writeUnitDefinition(unitDefinitionFileName, unitName, wd);
  try {
    await systemctl("link", unitDefinitionFileName);
  } catch (e) {}

  const socketUnitDefinitionFileName = join(wd, `build/${unitName}.socket`);
  const port = 8080;
  await writeSocketUnitDefinition(
    socketUnitDefinitionFileName,
    unitName,
    "main",
    port
  );
  try {
    await systemctl("link", socketUnitDefinitionFileName);
  } catch (e) {}
});

test.after("cleanup", async t => {
  await systemctl("disable", unitName);
});

test.skip("logging", async t => {
  await systemctl("restart", unitName);

  for await (const entry of journalctl(unitName)) {
    console.log(entry);
    t.is(entry.MESSAGE, "error test after start");

    if (entry.MESSAGE === "error test after start") {
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
    t.log(unit);
    active = unit.active;
    status = unit.status;
  });

  await wait(5000);

  t.is(status, "running");
  t.is(active, "active");

  await systemctl("stop", unitName);

  await wait(4000);

  t.is(active, "inactive");

  clearMonitorUnit(m);
});

test.skip("service kill", async t => {
  systemctl("restart", unitName);

  let pid;

  const m = monitorUnit(unitName, unit => {
    console.log(unit);
    pid = unit.pid;
  });

  await wait(3000);

  process.kill(pid);

  await wait(2000);

  t.is(active, "inactive");
});
