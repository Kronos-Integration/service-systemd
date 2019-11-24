import { Service } from "@kronos-integration/service";
import ServiceSystemd from "../src/service.mjs";
import { createServer } from "net";

class TestService extends Service {
  static get name() {
    return "test";
  }

  get autostart() {
    return true;
  }

  /*async configure(config) {
    delete config.name;
    Object.assign(this, config);

    this.info("config SERIAL ${config.serial}"); 
    wait(1000);
    return this.restartIfRunning();
  }*/

  async _start() {
    this.server = createServer((client) => {
      client.setEncoding('utf-8');
      client.write("Hello");
    });
    this.server.listen(this.socket, () =>{
      this.trace(`listen ${JSON.stringify(this.server.address())}`)
    });
  }
}

const ssd = new ServiceSystemd();

async function actions() {
  ssd.registerServiceFactory(TestService);
  await ssd.declareService(
    {
      type: "test",
      loglevel: "trace"
    },
    true
  );

  await ssd.start();

  ssd.info({ message: "Hello World" });
  ssd.error("error test after start");
  ssd.info("info test after start");
  ssd.trace("trace test after start");
  ssd.warn("warn test after start");
  ssd.debug("debug test after start");
  ssd.info({
    message: "some values",
    aNumber: 42,
    aBoolean: false,
    aBigInt: 77n
  });

  await wait(10000);
  await ssd.stop();
}

actions();

async function wait(msecs = 1000) {
  return new Promise((resolve, reject) => setTimeout(() => resolve(), msecs));
}
