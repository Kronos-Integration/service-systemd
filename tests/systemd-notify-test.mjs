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

test.serial("logging", async t => {
  await systemctl("restart", unitName);

  let m1, m2, m3;

  for await (const entry of journalctl(unitName)) {
    //console.log(entry);

    if (entry.MESSAGE === "error test after start") {
      m1 = entry;
    }
    if (entry.MESSAGE === "debug test after start") {
      m2 = entry;
    }
    if (entry.MESSAGE === "some values") {
      m3 = entry;
      break;
    }
  }

  t.is(m1.MESSAGE, "error test after start");
  t.is(m1.PRIORITY, "3");
  t.is(m2.MESSAGE, "debug test after start");
  t.is(m2.PRIORITY, "7");
  t.is(m2.SERVICE, "systemd");
  t.is(m3.MESSAGE, "some values");
  t.is(m3.PRIORITY, "6");
  t.is(m3.SERVICE, "systemd");

  await systemctl("stop", unitName);
});

test.serial("service states", async t => {
  systemctl("start", unitName);
  //systemctl("start", unitName + '.socket');

  let status, active;
  const m = monitorUnit(unitName, unit => {
    //t.log(unit);
    active = unit.active;
    status = unit.status;
  });

  await wait(5000);

  t.is(status, "running");
  t.is(active, "active");

  await systemctl("stop", unitName);

  await wait(5000);

  t.is(active, "inactive");

  clearMonitorUnit(m);
});

test.serial("service kill", async t => {
  systemctl("restart", unitName);

  let pid, active, status;

  const m = monitorUnit(unitName, unit => {
    active = unit.active;
    status = unit.status;
    pid = unit.pid;
  });

  await wait(2000);

  process.kill(pid);

  await wait(2000);

  t.is(active, "inactive");
  clearMonitorUnit(m);
});
