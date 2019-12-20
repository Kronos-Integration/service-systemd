import test from "ava";
import { join } from "path";

import { journalctl, systemctl, writeUnitDefinition } from "./util.mjs";

const unitName = "notify-test";

test.before(async t => {
  const wd = process.cwd();

  const unitDefinitionFileName = join(wd, `build/${unitName}.service`);
  await writeUnitDefinition(unitDefinitionFileName, unitName, wd);
  try {
    await systemctl("link", unitDefinitionFileName);
  } catch (e) {}
  try {
    await systemctl("link", socketUnitDefinitionFileName);
  } catch (e) {}
});

test.after("cleanup", async t => {
  try {
    await systemctl("disable", unitName);
    await systemctl("clean", unitName);
  } catch (e) {}
});

test("logging", async t => {
  /*setTimeout(() => {
    systemctl("stop", unitName);
  }, 10000);
  */

  await systemctl("restart", unitName);

  const { stop, entries } = journalctl(unitName);

  const all = [];

  for await (const entry of entries) {
    all.push(entry);
    if (entry.MESSAGE === "*** END ***") {
      break;
    }
  }

  let m;
  /*
  m = entries.find(
    m => m.MESSAGE === "Cannot read property 'doSomething' of undefined"
  );
  t.truthy(m);
  t.is(m.PRIORITY, "3");
  t.truthy(
    m.STACK.startsWith(
      "TypeError: Cannot read property 'doSomething' of undefined\nat actions (/"
    )
  );

  m = entries.find(m => m.MESSAGE === "this is an Error");
  t.truthy(m);
  t.is(m.PRIORITY, "3");
  t.truthy(m.STACK.startsWith("Error: this is an Error\nat actions (/"));
*/

  m = all.find(m => m.MESSAGE === "error test after start");
  t.truthy(m);
  t.is(m.PRIORITY, "3");

  m = all.find(m => m.MESSAGE === "debug test after start");
  t.truthy(m);
  t.is(m.PRIORITY, "7");

  m = all.find(m => m.SERVICE === "systemd");
  t.truthy(m);

  m = all.find(m => m.MESSAGE === "some values");
  t.truthy(m);
  t.is(m.PRIORITY, "6");
  t.is(m.BIGINT, "77");
  t.is(m.NUMBER, "42");
  t.is(m.BOOLEAN, "false");
  t.is(m.ARRAY, "A\nB\nC");
  // t.is(m.AOBJECT, '');

  m = all.find(m => m.MESSAGE && m.MESSAGE.startsWith("0123456789"));
  t.truthy(m);
  t.is(m.MESSAGE.length, 5 * 10);

  stop();
  await systemctl("stop", unitName);
});
