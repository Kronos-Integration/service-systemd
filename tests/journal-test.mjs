import test from "ava";
import { journal_print_object } from "@kronos-integration/service-systemd";
import { journalctl, wait } from "./helpers/util.mjs";

async function jt(t, send, expect) {
  const { entries, stop } = journalctl();
  journal_print_object(send);

  let i = await entries().next();

//  t.log(i.value);

  t.like(i.value, expect);

/*
  for (const key of Object.keys(expect)) {
    t.is(i.value[key], expect[key], key);
  }
*/

  await stop();
}

jt.title = (providedTitle = "journal", send, expect) => {
  const x = { ...send };
  delete x.bigInt;
  return `${providedTitle} ${JSON.stringify(x)}}`.trim();
};

test.serial(
  jt,
  { severity: "info", message: "a message" },
  { PRIORITY: "6", MESSAGE: "a message" }
);

test.serial(
  jt,
  { severity: "trace", message: "0123456789".repeat(50) },
  { PRIORITY: "7", MESSAGE: "0123456789".repeat(50) }
);

test.serial(
  jt,
  {
    message: "some values",
    number: 42,
    false: false,
    true: true,
    bigInt: 77n,
    object: { a: 1 },
    array: ["A", "B", "C"]
  },
  { MESSAGE: "some values", BIGINT: "77", NUMBER: "42", FALSE: "false", TRUE: "true", ARRAY: "A\nB\nC" }
);

test.serial(
  jt,
  { error: new Error('the error message') },
  { ERROR: "Error: the error message" }
);

