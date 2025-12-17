import test from "ava";
import { ServiceSystemd, notify_with_fds } from "@kronos-integration/service-systemd";

test("info endpoint", t => {
  const ssd = new ServiceSystemd();
  ssd.version = "1.2.3";
  t.truthy(ssd.endpoints.info);
  t.truthy(ssd.autostart);
  t.deepEqual(ssd.info().name, "systemd");
  t.deepEqual(ssd.info().version, "1.2.3");
});

test("service create with DEBUG=1", t => {
  process.env.DEBUG = 1;

  const s1 = new ServiceSystemd(
    {
      key1: "value1"
    }
  );

  t.is(s1.logLevel, "debug");

  const s2 = new ServiceSystemd(
    {
      key1: "value1",
      logLevel: "warn"
    }
  );

  t.is(s2.logLevel, "debug");

  delete process.env.DEBUG;
});

test("service create with LOGLEVEL=trace", t => {
  process.env.LOGLEVEL = "trace";

  const s1 = new ServiceSystemd(
    {
      key1: "value1"
    }
  );

  t.is(s1.logLevel, "trace");

  delete process.env.LOGLEVEL;
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

test("listeningFileDescriptors", t => {
    const ssd = new ServiceSystemd();
    const sc = ssd.services.config;

    t.deepEqual(sc.listeningFileDescriptors,[]);

    process.env.LISTEN_FDS = "2";
    process.env.LISTEN_FDNAMES = "a:b";
    t.deepEqual(sc.listeningFileDescriptors,[{fd:3,name:"a"},{fd:4,name:"b"}]);
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
