import test from "ava";
import ServiceSystemd from "../src/service.mjs";

test("service states", async t => {
  const ssd = new ServiceSystemd();

  t.truthy(ssd);

  await ssd.start();
  t.is(ssd.state, "running");

  t.is(ssd.services.logger.state, "running");
  t.is(ssd.services.config.state, "running");

  await ssd.stop();
  t.is(ssd.state, "stopped");
  t.is(ssd.services.logger.state, "stopped");
  t.is(ssd.services.config.state, "stopped");
});


