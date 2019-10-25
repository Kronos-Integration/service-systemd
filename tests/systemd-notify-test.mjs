import test from 'ava';
import { join } from "path";
import ServiceSystemd from '../src/service.mjs';

test('service states', async t => {
  const wd = process.cwd;

  await execa('rollup',['-c', 'tests/rollup.config.js']);
  const run = await execa('systemd-run', [ '--user', '-t', 'node', join(wd,'build/notify-test-cli') ], { all: true});

  t.log(run.all);
  t.regex(run.all,/starting/);
});
