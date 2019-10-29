import ServiceSystemd from '../src/service.mjs';

const ssd = new ServiceSystemd();

async function actions()
{
  ssd.info('starting...');
  await ssd.start();
  ssd.info('started...');
  ssd.error('error test after start');

  await wait(1000);
  ssd.info('stopping...');
  await ssd.stop();
  ssd.info('stopped...');
}

actions();

async function wait(msecs = 1000) {
  return new Promise((resolve, reject) => {
    setTimeout(resolve, msecs);
  });
}

