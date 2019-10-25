import builtins from "builtin-modules";
import resolve from "rollup-plugin-node-resolve";
import commonjs from "rollup-plugin-commonjs";
import executable from "rollup-plugin-executable";

const external = [
  ...builtins
];

export default {
  input: 'tests/notify-test-cli.mjs',
  output: {
    file: 'build/notify-test-cli',
    format: "cjs",
    interop: false,
    externalLiveBindings: false
  },
  plugins: [
    commonjs(),
    resolve(),
    executable()
  ],
  external
};
