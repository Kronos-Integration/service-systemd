import builtins from "builtin-modules";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import native from "rollup-plugin-native";
import executable from "rollup-plugin-executable";

const external = [...builtins, "ava"];
const plugins = [
  native({ }),
  commonjs(),
  resolve(),
  executable()
];

export default [
  {
    input: "tests/helpers/notify-test-cli.mjs",
    output: {
      file: "build/notify-test-cli.cjs",
      format: "cjs",
      interop: false,
      externalLiveBindings: false
    },
    plugins,
    external
  },
  {
    input: "src/service.mjs",
    output: {
      file: "build/service.mjs",
      format: "esm"
    },
    plugins,
    external
  }
];
