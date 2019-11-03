import { Service } from '@kronos-integration/service';
import ServiceSystemd from '../src/service.mjs';

class TestService extends Service {
  static get name() {
    return "test";
  }

  get autostart() {
    return true;
  }

  async configure(config) {
    delete config.name;
    Object.assign(this, config);
    wait(1000);

    return this.restartIfRunning();
  }
}

const ssd = new ServiceSystemd();

async function actions()
{
  ssd.registerServiceFactory(TestService);
  await ssd.declareService(
     {
        type: "test"
      },
      true
    );

  ssd.info('starting...');
  await ssd.start();
  ssd.info('started...');
  ssd.error('error test after start');

  await wait(10000);
  ssd.info('stopping...');
  await ssd.stop();
  ssd.info('stopped...');
}

actions();

async function wait(msecs=1000) {
  return new Promise((resolve, reject) => setTimeout(() => resolve(), msecs));
}



