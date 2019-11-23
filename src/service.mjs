import { expand } from "config-expander";
import {
  ServiceProviderMixin,
  Service,
  ServiceLogger,
  ServiceConfig
} from "@kronos-integration/service";

import {
  notify,
  journal_print_object,
  LISTEN_FDS_START
} from "../systemd.node";

/**
 * forward logs entries to the journal
 */
class JournalLogger extends ServiceLogger {
  logEntry(entry) {
    journal_print_object(entry);
  }
}

/**
 * provides config form CONFIGURATION_DIRECTORY
 */
class SystemdConfig extends ServiceConfig {
  constructor(config, owner) {
    super(config, owner);

    Object.defineProperties(this, {
      configurationDirectory: { value: process.env.CONFIGURATION_DIRECTORY }
    });
  }

  /**
   *
   * FDSTORE=1
   * FDNAME
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
    return arr;
  }

  async loadConfig() {
    const d = {};

    if (this.configurationDirectory) {
      return await expand("${include('config.json')}", {
        constants: {
          basedir: this.configurationDirectory
        },
        default: d
      });
    }

    return d;
  }

  async _start() {
    try {
      console.log("RELOADING=1");
      notify("RELOADING=1");
      const config = await this.loadConfig();

      for (const listener of this.listeners) {
        if (listener.name) {
          this.trace({ message: "set listener", listener: listener.name });
          const path = listener.name.split(/\./);
          let c = config;

          do {
            let slot = path.shift();
            if (path.length === 0) {
              c[slot] = listener;
              break;
            }
            c = c[slot];
          } while (true);
        }
      }
      await this.configure(config);
    } catch (e) {
      this.warn(e);
    }

    return super._start();
  }
}

/**
 * Kronos bridge to systemd
 * - sync node state to systemd with notify (partly)
 * - propagate config into kronos world
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
    process.on("SIGINT", () => this.stop());

    process.on("beforeExit", code => {
      console.log("BEFORE EXIT");
      this.stop();
    });
    process.on("exit", code => {
      console.log("EXIT");
      this.stop();
    });

    return super._start();
  }

  stateChanged(oldState, newState) {
    super.stateChanged(oldState, newState);
    switch (newState) {
      case "running":
        console.log("READY=1");
        notify("READY=1");
        break;

      case "stopping":
        console.log("STOPPING=1");
        notify("STOPPING=1");
        break;
    }
  }
}

export default ServiceSystemd;
