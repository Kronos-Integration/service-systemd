import { expand } from "config-expander";
import {
  ServiceProviderMixin,
  Service,
  ServiceLogger,
  ServiceConfig
} from "@kronos-integration/service";
import { Module } from "module";
import { arch, constants } from "os";

const filename = new URL(`../systemd-linux-${arch()}.node`, import.meta.url)
  .pathname;
const m = new Module(filename);
m.filename = filename;
process.dlopen(m, filename, constants.dlopen.RTLD_NOW);
const {
  LISTEN_FDS_START,
  notify_with_fds,
  notify,
  journal_print_object
} = m.exports;

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

  logEntry(entry) {
    journal_print_object(entry);
  }
}

/**
 * 
 * @typedef {Object} FileDescriptor
 * @property {string?} name
 * @property {number} fd
 */

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

  configurationDirectory = process.env.CONFIGURATION_DIRECTORY;

  /**
   * listeningFileDescriptors as passed in LISTEN_FDS and LISTEN_FDNAMES.
   * @return {FileDescriptor[]}
   */
  get listeningFileDescriptors() {
    const count = Number(process.env.LISTEN_FDS) || 0;
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
    if (this.configurationDirectory) {
      this.trace(`load: ${this.configurationDirectory}/config.json`);
      await this.configure(
        await expand("${include('config.json')}", {
          constants: {
            basedir: this.configurationDirectory
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
    const state = "FDSTORE=1" + this.listeningFileDescriptors.map(l => `\nFDNAME=${l.name}`).join("");
    const rc = notify_with_fds(state, this.listeningFileDescriptors.map(l => l.fd));
    this.info(`${state} (${rc})`);

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

  stateChanged(oldState, newState) {
    super.stateChanged(oldState, newState);
    switch (newState) {
      case "running":
        notify("READY=1");
        break;

      case "stopping":
        notify("STOPPING=1");
        break;
    }
  }
}

export default ServiceSystemd;
