import { Service } from "@kronos-integration/service";

const systemd = require('./systemd');

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

  stateChanged(oldState, newState) {
    super.stateChanged(oldState, newState);
    switch (newState) {
      case "starting":
        systemd.notify("READY=1\nSTATUS=starting");
        break;
      case "running":
        systemd.notify("READY=1\nSTATUS=running");
        break;

      case "stopped":
        break;
    }
  }
}

export default ServiceSystemd;