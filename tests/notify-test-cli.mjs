import ServiceSystemd from '../src/service.mjs';

const ssd = new ServiceSystemd();


async function actions()
{
  ssd.info('starting...');
  await ssd.start();
  ssd.info('started...');
  ssd.error('error test after start');
}

actions();

setTimeout(async () => {
  ssd.info('stopping...');
  await ssd.stop();
  ssd.info('stopped...');
},20000);
