import test from "ava";
import { ServiceSystemd, notify_with_fds } from "@kronos-integration/service-systemd";

test("info endpoint", t => {
  const ssd = new ServiceSystemd();
  t.truthy(ssd.endpoints.info);
  t.deepEqual(ssd.details().name, "systemd");
});

test("endpoints", t => {
  const ssd = new ServiceSystemd();

  //console.log(ssd.services.logger.endpoints.log.toJSON());

  t.true(ssd.services.logger.endpoints.log.isOpen);
  t.true(ssd.endpoints.log.isConnected(ssd.services.logger.endpoints.log));
  t.true(
    ssd.services.config.endpoints.log.isConnected(
      ssd.services.logger.endpoints.log
    )
  );
  //t.true(ssd.services.logger.endpoints.log.isConnected(ssd.services.logger.endpoints.log));
});

test("notify_with_fds", t => {
  t.is(notify_with_fds("FDSTORE=1", []), 0);
  t.is(notify_with_fds("FDSTORE=1\nFDNAME=fd1\nFDNAME=fd2", [3, 4]), 0);
  t.is(notify_with_fds("FDSTORE=1\nFDNAME=fd1\nFDNAME=fd2", [undefined]), 0);
  t.throws(() => notify_with_fds("FDSTORE=1\nFDNAME=fd1\nFDNAME=fd2") /*, "Wrong arguments"*/);
  t.is(notify_with_fds("FDSTORE=1\nFDNAME=fd1\nFDNAME=fd2", "hello"), undefined);
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
