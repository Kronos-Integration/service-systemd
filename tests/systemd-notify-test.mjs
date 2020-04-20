import test from "ava";
import { writeFileSync } from "fs";
import { join } from "path";
import { createConnection } from "net";

import {
  clearMonitorUnit,
  monitorUnit,
  journalctl,
  systemctl,
  wait,
  writeUnitDefinition,
  writeSocketUnitDefinition
} from "./helpers/util.mjs";

const unitName = "notify-test";
const port = 8080;
const configFile = `${process.env.HOME}/.config/notify-test/config.json`;

test.before(async t => {
  writeFileSync(configFile, '{"test": { "serial": 0 }}', {
    encoding: "utf8"
  });

  const wd = process.cwd();

  const unitDefinitionFileName = join(wd, `build/${unitName}.service`);
  await writeUnitDefinition(unitDefinitionFileName, unitName, wd);
  try {
    await systemctl("link", unitDefinitionFileName);
  } catch (e) {}

  const socketUnitDefinitionFileName = join(wd, `build/${unitName}.socket`);
  await writeSocketUnitDefinition(
    socketUnitDefinitionFileName,
    unitName,
    "test.socket",
    port
  );
  try {
    await systemctl("link", socketUnitDefinitionFileName);
  } catch (e) {}
});

test.after("cleanup", async t => {
  try {
    await systemctl("disable", unitName);
  } catch (e) {}
});

test.serial("service states", async t => {
  systemctl("start", unitName);

  let status, active;
  const m = monitorUnit(unitName, unit => {
    //t.log(unit);
    active = unit.active;
    status = unit.status;
  });

  await wait(2000);

  t.is(status, "running");
  t.is(active, "active");

  await systemctl("stop", unitName);

  await wait(2000);

  t.is(active, "inactive");

  clearMonitorUnit(m);
});

test.serial.skip("service socket states", async t => {
  await systemctl("start", unitName + ".socket");

  await wait(2000);

  const client = createConnection(
    {
      host: "localhost",
      port
    },
    err => console.log("connected", err)
  );
  client.on("data", data => console.log("Server", data));

  let status, active;
  const m = monitorUnit(unitName, unit => {
    //t.log(unit);
    active = unit.active;
    status = unit.status;
  });

  t.is(status, "running");
  t.is(active, "active");

  await systemctl("stop", unitName);

  await wait(2000);

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
    t.log(active,status,pid);
  });

  await wait(1500);

  try {
    process.kill(pid);
  } catch (e) {}

  await wait(2000);

  t.is(active, "inactive");
  clearMonitorUnit(m);
});

test.serial.skip("service SIGHUP", async t => {
  systemctl("restart", unitName);

  let pid, active, status;

  const m = monitorUnit(unitName, unit => {
    active = unit.active;
    status = unit.status;
    pid = unit.pid;
  });

  await wait(1500);

  writeFileSync(configFile, '{"test": { "serial": 4711 }}', {
    encoding: "utf8"
  });

  process.kill(pid, "SIGHUP");

  let m1 = {};
  let i = 0;
  for await (const entry of journalctl(unitName)) {
    t.log(entry.MESSAGE);

    if (entry.MESSAGE.match(/SERIAL 4711/)) {
      m1 = entry;
      process.kill(pid);
    }
    i++;
    if (i >= 15) break;
  }

  await wait(2000);

  t.is(m1.MESSAGE, "config SERIAL 4711");

  t.is(unit.active, "inactive");
  clearMonitorUnit(m);
});
