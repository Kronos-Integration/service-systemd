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
  constructor(...args) {
    super(...args);

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
    console.log("RELOADING=1");
    notify("RELOADING=1");

    for (const listener of this.listeners) {
      if (listener.name === undefined) {
        this.warn(`listener without name ${JSON.stringify(listener)}`);
      } else {
        await this.configureValue(listener.name, listener);
      }
    }

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
    process.on("SIGHUP", async () => {
      await this.configure(await this.loadConfig());
      notify("READY=1");
    });
    try {
      await this.configure(await this.loadConfig());
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
    process.on("warning", warning => this.warn(warning));
    process.on("SIGINT", () => {
      this.info("SIGINT");
      this.stop();
    });
    process.on("SIGTERM", async () => {
      this.info("SIGTERM");
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
