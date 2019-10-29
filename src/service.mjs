import { createRequire } from "module";
import {
  ServiceProviderMixin,
  Service,
  ServiceLogger
} from "@kronos-integration/service";

const require = createRequire(import.meta.url);
const { notify, journal_print } = require("../systemd.node");

/*
const configDir = process.env.CONFIGURATION_DIRECTORY || program.config;
    const listeners = sd.listeners();
    if (listeners.length > 0) config.http.port = listeners[0];
*/

class JournalLogger extends ServiceLogger {
  constructor(config, owner) {
    super(config, owner);

    this.endpoints.log.receive = async entry => {
      const severity = entry.severity;
      delete entry.severity;
      journal_print(severity, JSON.stringify(entry));
    };
  }
}

/**
 * Kronos bridge to systemd
 * - sync node state to systemd with notify
 * - propagate config into kronos world
 * - propagate socket activations into kronos
 * - start / stop / restart / reload initiated from systemd
 * - log into journal
 */
export class ServiceSystemd extends ServiceProviderMixin(
  Service,
  JournalLogger
) {
/*
  constructor(...args) {
    super(...args);
    journal_print("info", "Info Message to the journal");
    journal_print("error", "Error Message to the journal");
  }
*/

  static get name() {
    return "systemd";
  }

  get autostart() {
    return true;
  }

  stateChanged(oldState, newState) {
    super.stateChanged(oldState, newState);
    switch (newState) {
      case "starting":
        notify("READY=1\nSTATUS=starting");
        break;
      case "running":
        notify("READY=1\nSTATUS=running");
        break;

      case "stopped":
        break;
    }
  }

  listeners() {
    const count = Number(process.env.LISTEN_FDS) || 0;
    const fdNames = (process.env.LISTEN_FDNAMES || "").split(":");
    const arr = new Array(count);
    for (let i = 0; i < count; i++) {
      arr[i] = {
        fd: binding.LISTEN_FDS_START + i
      };
      if (fdNames[i]) {
        arr[i].name = fdNames[i];
      }
    }
    return arr;
  }
}

export default ServiceSystemd;
