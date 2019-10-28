import ServiceSystemd from '../src/service.mjs';

const ssd = new ServiceSystemd();

console.log('starting...');

async function actions()
{
  await ssd.start();
  ssd.info('info message');
  ssd.error('error message');
}

actions();

setTimeout(async () => {
  console.log('stopping...');
  ssd.stop();
},20000);
