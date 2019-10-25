import ServiceSystemd from '../src/service.mjs';

const ssd = new ServiceSystemd();

console.log('starting...');
ssd.start();

setTimeout(async () => {
  console.log('stopping...');
  ssd.stop();
},20000);
