import { arch, constants } from "node:os";
import { join } from "node:path";
import { readFile } from "node:fs/promises";
import { Module } from "node:module";
import { expand } from "config-expander";
import {
  ServiceProviderMixin,
  Service,
  ServiceLogger,
  ServiceConfig
} from "@kronos-integration/service";

const filename = new URL(`../systemd-linux-${arch()}.node`, import.meta.url)
  .pathname;
const m = new Module(filename);
m.filename = filename;
process.dlopen(m, filename, constants.dlopen.RTLD_NOW);
const { LISTEN_FDS_START, notify_with_fds, notify, journal_print_object } =
  m.exports;

export { notify, notify_with_fds, journal_print_object };

/**
 * Forward logs entries to the journal.
 */
class JournalLogger extends ServiceLogger {
  static get name() {
    return "systemd-logger";
  }

  static get description() {
    return "Forward log entries into systemd journal";
  }

  async logEntry(entry) {
    journal_print_object(entry);
  }
}

/**
 *
 * @typedef {Object} FileDescriptor
 * @property {string?} name
 * @property {number} fd
 */

const configurationDirectory = process.env.CONFIGURATION_DIRECTORY;
const /** @typedef {string} */ credentialsDirectory =
    process.env.CREDENTIALS_DIRECTORY;

/**
 * Provides config from CONFIGURATION_DIRECTORY.
 * Also injects listeningFileDescriptors into the config
 * @property {string} configurationDirectory taken from CONFIGURATION_DIRECTORY
 */
class SystemdConfig extends ServiceConfig {
  static get name() {
    return "systemd-config";
  }

  static get description() {
    return "Synchronize configuration with systemd";
  }

  /**
   * listeningFileDescriptors as passed in LISTEN_FDS and LISTEN_FDNAMES.
   * @return {FileDescriptor[]}
   */
  get listeningFileDescriptors() {
    const count = Number(process.env.LISTEN_FDS) ?? 0;
    const fdNames = (process.env.LISTEN_FDNAMES || "").split(":");
    const arr = new Array(count);
    for (let i = 0; i < count; i++) {
      arr[i] = {
        fd: LISTEN_FDS_START + i
      };
      if (fdNames[i]) {
        arr[i].name = fdNames[i];
      }
    }
    this.trace(`listeningFileDescriptors ${JSON.stringify(arr)}`);
    return arr;
  }

  /**
   * Load config from configuration dir.
   * Additionally pass listeninfFileDescriptions into config.
   */
  async loadConfig() {
    notify("RELOADING=1");
    if (configurationDirectory) {
      this.trace(`load: ${configurationDirectory}/config.json`);
      await this.configure(
        await expand("${include('config.json')}", {
          constants: {
            basedir: configurationDirectory
          },
          default: {}
        })
      );
    }

    for (const listener of this.listeningFileDescriptors) {
      if (listener.name === undefined) {
        this.warn(`listener without name ${JSON.stringify(listener)}`);
      } else {
        await this.configureValue(listener.name, listener);
      }
    }
  }

  async _stop() {
    const lfd = this.listeningFileDescriptors;
    const state = "FDSTORE=1" + lfd.map(l => `\nFDNAME=${l.name}`).join("");
    const rc = notify_with_fds(
      state,
      lfd.map(l => l.fd)
    );
    this.trace(`${state} (${rc})`);

    return super._stop();
  }

  async _start() {
    await super._start();

    process.on("SIGHUP", async () => {
      await this.loadConfig();
      notify("READY=1");
    });

    await this.loadConfig();
  }
}

/**
 * Kronos bridge to systemd:
 * - sync node state to systemd with notify
 * - propagate config into kronos world
 * - propagate socket activations into kronos (partly)
 * - start / stop / restart / reload initiated from systemd
 * - log into journal
 */
export class ServiceSystemd extends ServiceProviderMixin(
  Service,
  JournalLogger,
  SystemdConfig
) {
  static get name() {
    return "systemd";
  }

  static get description() {
    return "Bridge to systemd";
  }

  get autostart() {
    return true;
  }

  /**
   * Deliver credential as provided by systemd.
   * @param {string} key
   * @param {Object?} options
   * @return {Promise<Uint8Array|string>}
   */
  async getCredential(key, options) {
    return readFile(join(credentialsDirectory, key), options);
  }

  /**
   * Deliver credentials as provided by systemd.
   * @param {string[]} keys
   * @param {Object?} options
   * @return {Promise<(Uint8Array|string)[]>}
   */
  async getCredentials(keys, options) {
    return Promise.all(keys.map(key => this.getCredential(key, options)));
  }

  /**
   * Definition of the predefined endpoints.
   * - info _in_
   * @return {Object} predefined endpoints
   */
  static get endpoints() {
    return {
      ...super.endpoints,
      info: {
        in: true,
        receive: "details"
      }
    };
  }

  async _start() {
    process.on("warning", warning => this.warn(warning));
    process.on("SIGINT", () => {
      this.info("SIGINT");
      this.stop();
    });
    process.on("SIGTERM", async () => {
      await this.stop();
      process.exit(0);
    });
    process.on("beforeExit", code => this.stop());
    process.on("exit", code => this.stop());
    return super._start();
  }

  stateChanged(origin, oldState, newState) {
    super.stateChanged(origin, oldState, newState);
    switch (newState) {
      case "running":
        notify("READY=1");
        break;

      case "stopping":
        notify("STOPPING=1");
        break;
    }
  }

  details() {
    return this.toJSONWithOptions({
      includeRuntimeInfo: true,
      includeDefaults: true,
      includeName: true,
      includeConfig: false,
      includePrivate: false
    });
  }
}

export default ServiceSystemd;
