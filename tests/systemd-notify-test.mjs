import test from 'ava';
import { join } from "path";
import execa from "execa";
import ServiceSystemd from '../src/service.mjs';

test('service states', async t => {
  const wd = process.cwd();

  await execa('rollup',['-c', 'tests/rollup.config.js']);
  const run = execa('systemd-run', [ '--user', '-t', 'node', join(wd,'build/notify-test-cli') ]);

  run.stdout.on('data', data => {
    console.log(`stdout: ${data}`);
  });

  let unit;
  run.stderr.on('data', data => {
    const m = data.toString('utf8').match(/as unit:\s+(.*)/);
    if(m) {
      unit = m[1];
      console.log("unit",unit);
      const systemctl = execa('systemctl', [ 'status', unit]);
      systemctl.stdout.on('data', data => { console.log(`stdout: ${data}`); });
      systemctl.stderr.on('data', data => { console.log(`stderr: ${data}`); });
    }
    console.log(`stderr: ${data}`);
  });

  await run;

  t.truthy(unit);
});
