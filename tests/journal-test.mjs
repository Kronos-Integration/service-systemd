import test from "ava";
import { journal_print_object } from "@kronos-integration/service-systemd";
import { journalctl, wait } from "./helpers/util.mjs";

async function jt(t, send, expect) {
  const { entries, stop } = journalctl();
  wait(150);
  journal_print_object(send);

  const i = await entries().next();

//  t.log(i.value);

  t.like(i.value, expect);

  await stop();
}

jt.title = (providedTitle = "journal", send, expect) => {
  const x = { ...send };
  delete x.bigInt;
  return `${providedTitle} ${JSON.stringify(x)}}`.trim();
};

test.serial(
  jt,
  { severity: "trace", message: "trace message" },
  { PRIORITY: "7", MESSAGE: "trace message" }
);

test.serial(
  jt,
  { severity: "debug", message: "debug message" },
  { PRIORITY: "7", MESSAGE: "debug message" }
);

test.serial(
  jt,
  { severity: "info", message: "info message" },
  { PRIORITY: "6", MESSAGE: "info message" }
);

test.serial(
  jt,
  { severity: "notice", message: "notice message" },
  { PRIORITY: "5", MESSAGE: "notice message" }
);

test.serial(
  jt,
  { severity: "warn", message: "warn message" },
  { PRIORITY: "4", MESSAGE: "warn message" }
);

test.serial(
  jt,
  { severity: "error", message: "error message" },
  { PRIORITY: "3", MESSAGE: "error message" }
);

test.serial(
  jt,
  { severity: "crit", message: "crit message" },
  { PRIORITY: "2", MESSAGE: "crit message" }
);

test.serial(
  jt,
  { severity: "alert", message: "alert message" },
  { PRIORITY: "1", MESSAGE: "alert message" }
);

test.serial(
  jt,
  { severity: "emerg", message: "emerg message" },
  { PRIORITY: "0", MESSAGE: "emerg message" }
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

