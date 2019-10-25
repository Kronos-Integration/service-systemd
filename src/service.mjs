import { createRequire } from 'module';
import { Service } from "@kronos-integration/service";

const require = createRequire(import.meta.url);
const { notify } = require('../systemd.node');

/**
 * sync node state to systemd with notify
 * propagate config into kronos world
 * propagate socket activations into kronos
 * start / stop / restart / reload initiated from systemd
 */
export class ServiceSystemd extends Service {
  static get name() {
    return "systemd";
  }
  
  get autostart() {
    return true;
  }

  get owner() {
    return this;
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
}

export default ServiceSystemd;
