import { Service } from "@kronos-integration/service";
import ServiceSystemd from "@kronos-integration/service-systemd";
import { createServer } from "net";

class TestService extends Service {
  static get name() {
    return "test";
  }

  async configure(config) {
    const result = await super.configure(config);
    this.info("config SERIAL ${config.serial}");
    return result;
  }

  async _start() {
    await super._start();

    this.server = createServer(client => {
      client.setEncoding("utf-8");
      client.write("Hello");
    });
    this.server.listen(this.socket, () => {
      this.trace(`listen ${JSON.stringify(this.server.address())}`);
    });
  }

  async _stop() {
    this.server.close();
    return super._stop();
  }
}

const ssd = new ServiceSystemd();

async function actions() {

  console.log("using stdout");

  await ssd.declareService(
    {
      type: TestService,
      loglevel: "trace",
      autostart: true
    }
  );

  await ssd.start();

  /*
  try {
    const x = undefined;
    x.doSomething();
  }
  catch(e) {
    ssd.error(e)
  }

  ssd.error(new Error("this is an Error"));
  */
  ssd.info({ message: "Hello World" });
  ssd.error("error test after start");
  ssd.info("info test after start");
  ssd.trace("trace test after start");
  ssd.warn("warn test after start");
  ssd.debug("debug test after start");
  ssd.info({
    message: "some values",
    number: 42,
    boolean: false,
    bigInt: 77n,
    object: { a: 1 },
    array: ["A","B","C"]
  });

  ssd.info("0123456789".repeat(5));
  ssd.info("*** END ***");

  await wait(10000);
  await ssd.stop();
}

actions();

async function wait(msecs = 1000) {
  return new Promise((resolve, reject) => setTimeout(() => resolve(), msecs));
}
