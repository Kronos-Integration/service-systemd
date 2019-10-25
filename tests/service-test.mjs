import test from 'ava';
import ServiceSystemd from '../src/service.mjs';

test('service states', async t => {
  ssd = new ServiceSystemd();

  t.truthy(ssd);
  
  await ssd.start();

  t.is(ssg.state === 'running')
});
