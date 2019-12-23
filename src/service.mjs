import { expand } from "config-expander";
import {
  ServiceProviderMixin,
  Service,
  ServiceLogger,
  ServiceConfig
} from "@kronos-integration/service";

import {
  notify,
  notify_with_fds,
  journal_print_object,
  LISTEN_FDS_START
} from "../systemd.node";

export { notify, notify_with_fds, journal_print_object };

/**
 * forward logs entries to the journal
 */
class JournalLogger extends ServiceLogger {
  static get name() {
    return "systemd-logger";
  }

  logEntry(entry) {
    journal_print_object(entry);
  }
}

/**
 * Provides config form CONFIGURATION_DIRECTORY
 * Also injects listeners into the config
 * @property {string} configurationDirectory tken from CONFIGURATION_DIRECTORY
 */
class SystemdConfig extends ServiceConfig {
  static get name() {
    return "systemd-config";
  }

  configurationDirectory = process.env.CONFIGURATION_DIRECTORY;

  /**
   * listeners as passed in LISTEN_FDS and LISTEN_FDNAMES
   */
  get listeners() {
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
    this.trace(`listeners ${JSON.stringify(arr)}`);
    return arr;
  }

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

    for (const listener of this.listeners) {
      if (listener.name === undefined) {
        this.warn(`listener without name ${JSON.stringify(listener)}`);
      } else {
        await this.configureValue(listener.name, listener);
      }
    }
  }

  async _stop() {
    const rc = notify_with_fds(
      "FDSTORE=1" + this.listeners.map(l => `\nFDNAME=${l.name}`).join(""),
      this.listeners.map(l => l.fd)
    );

    this.info(
      `FDSTORE=1 ${ this.listeners.map(l => ` FDNAME=${l.name}`).join("")} (${rc})`
    );
    
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
 * Kronos bridge to systemd
 * - sync node state to systemd with notify (done)
 * - propagate config into kronos world (done)
 * - propagate socket activations into kronos (partly)
 * - start / stop / restart / reload initiated from systemd
 * - log into journal (done)
 */
export class ServiceSystemd extends ServiceProviderMixin(
  Service,
  JournalLogger,
  SystemdConfig
) {
  static get name() {
    return "systemd";
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
