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

test("service states", async t => {
  await execa("rollup", ["-c", "tests/rollup.config.js"]);

  const unitName = "notify-test";
  const wd = process.cwd();

  const unitDefinitionFileName = join(wd, `build/${unitName}.service`);
  await writeUnitDefinition(unitDefinitionFileName, unitName, wd);
  await systemctl("link", unitDefinitionFileName);

  const socketUnitDefinitionFileName = join(wd, `build/${unitName}.socket`);
  const port = 8080;
  await writeSocketUnitDefinition(socketUnitDefinitionFileName, unitName, "main", port);
  await systemctl("link", socketUnitDefinitionFileName);

  const start = systemctl("start", unitName);
  systemctl("start", unitName + '.socket');

  const j = journalctl(unitName);

  let status, active;
  const m = monitorUnit(unitName, unit => {
    t.log(unit);
    active = unit.active;
    status = unit.status;
  });

  await start;

  await wait(3000);

  t.is(status, "running");
  t.is(active, "active");

  await systemctl("stop", unitName);

  await wait(4000);

  t.is(active, "inactive");

  clearMonitorUnit(m);

  //t.log(j);
  //j.cancel();

  await systemctl("disable", unitName);
});
