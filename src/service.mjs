import { createRequire } from "module";
import { expand } from "config-expander";
import { arch } from "os";
import {
  ServiceProviderMixin,
  Service,
  ServiceLogger,
  ServiceConfig
} from "@kronos-integration/service";

//const archs={'x64':'x86_64','arm':'armv7l'};
const require = createRequire(import.meta.url);
const { notify, journal_print } = require(`../systemd-linux-${arch()}.node`);

/*
const configDir = process.env.CONFIGURATION_DIRECTORY || program.config;
    const listeners = sd.listeners();
    if (listeners.length > 0) config.http.port = listeners[0];

    FDSTORE=1
    FDNAME
    RELOADING=1
*/

class JournalLogger extends ServiceLogger {
  constructor(config, owner) {
    super(config, owner);

    this.endpoints.log.receive = entry => {
      const severity = entry.severity;
      delete entry.severity;
      journal_print(severity, JSON.stringify(entry));
    };
  }
}

class SystemdConfig extends ServiceConfig {
  constructor(config, owner) {
    super(config, owner);

    Object.defineProperties(this, {
      configurationDirectory: { value: process.env.CONFIGURATION_DIRECTORY }
    });
  }

  async loadConfig() {
    const config = await expand("${include('config.json')}", {
      constants: {
        basedir: this.configurationDirectory
      },
      default: {}
    });

    return config;
  }
}

/**
 * Kronos bridge to systemd
 * - sync node state to systemd with notify (partly)
 * - propagate config into kronos world
 * - propagate socket activations into kronos
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

  stateChanged(oldState, newState) {
    super.stateChanged(oldState, newState);
    switch (newState) {
      case "running":
        notify("READY=1\nSTATUS=running");
        break;

      case "stopping":
        notify("STOPPING=1\nSTATUS=stopping");
        break;

      // case "stopped":
      // case "starting":
      default:
        notify(`STATUS=${newState}`);
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
