import test from "ava";
import { ServiceSystemd } from "../build/service.mjs";

test("service start stop plain", async t => {
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
