import test from "ava";
import ServiceSystemd from "../src/service.mjs";

test("service states", async t => {
  const ssd = new ServiceSystemd();

  t.truthy(ssd);

  await ssd.start();

  t.is(ssd.state, "running");
});
