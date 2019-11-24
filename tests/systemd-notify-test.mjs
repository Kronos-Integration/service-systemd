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
} from "./util.mjs";

const unitName = "notify-test";
const port = 8080;

test.before(async t => {
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

  await wait(2000);

  t.is(status, "running");
  t.is(active, "active");

  await systemctl("stop", unitName);

  await wait(2000);

  t.is(active, "inactive");

  clearMonitorUnit(m);
});

test.serial("service socket states", async t => {
  //systemctl("start", unitName);
  await systemctl("start", unitName + ".socket");

  await wait(1000);

  const client = createConnection(
    {
      host: "localhost",
      port
    },
    (err) => console.log("connected", err)
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
  });

  await wait(1500);

  process.kill(pid);

  await wait(2000);

  t.is(active, "inactive");
  clearMonitorUnit(m);
});

test.serial.skip("service SIGHUP", async t => {
  const configFile = `${process.env.HOME}/.config/notify-test/config.json`;
  writeFileSync(configFile, "{}", { encoding: "utf8" });

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
    console.log(entry);

    if (entry.MESSAGE.match(/config SERIAL 4711/)) {
      m1 = entry;
      process.kill(pid);
    }
    i++;
    if (i >= 15) break;
  }

  await wait(1000);

  t.is(m1.MESSAGE, "config SERIAL 4711");

  t.is(unit.active, "inactive");
  clearMonitorUnit(m);
});
