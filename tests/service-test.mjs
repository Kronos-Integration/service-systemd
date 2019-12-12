import test from "ava";
import { ServiceSystemd } from "../build/service.mjs";

test("endpoints", t => {
  const ssd = new ServiceSystemd();
 
  //console.log(ssd.services.logger.endpoints.log.toJSON());

  t.true(ssd.services.logger.endpoints.log.isOpen);
  t.true(ssd.endpoints.log.isConnected(ssd.services.logger.endpoints.log));
  t.true(ssd.services.config.endpoints.log.isConnected(ssd.services.logger.endpoints.log));
  //t.true(ssd.services.logger.endpoints.log.isConnected(ssd.services.logger.endpoints.log));
});

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
