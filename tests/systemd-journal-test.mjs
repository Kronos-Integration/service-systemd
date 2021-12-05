import test from "ava";

import { journalctl, systemctl, beforeUnits, afterUnits, unitName } from "./helpers/util.mjs";

test.before(beforeUnits);
test.after(afterUnits);

test("logging", async t => {
  await systemctl("restart", unitName);

  const { stop, entries } = journalctl(unitName);

  const all = [];

  for await (const entry of entries()) {
    console.log(entry.MESSAGE);
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

  //console.log(all.map(m=>m.MESSAGE));
  
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

  await stop();
});
