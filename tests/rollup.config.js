import builtins from "builtin-modules";
import resolve from "rollup-plugin-node-resolve";
import native from "rollup-plugin-native";
import commonjs from "rollup-plugin-commonjs";
import executable from "rollup-plugin-executable";

const external = [...builtins, "ava"];
const plugins = [
  native({ loaderMode: "dlopen" }),
  commonjs(),
  resolve(),
  executable()
];

export default [
  {
    input: "tests/notify-test-cli.mjs",
    output: {
      file: "build/notify-test-cli",
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
      //format: "cjs"
      format: "esm"
    },
    plugins,
    external
  }
];
