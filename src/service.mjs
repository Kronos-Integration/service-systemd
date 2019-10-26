import { createRequire } from "module";
import { ServiceProviderMixin, Service } from "@kronos-integration/service";

const require = createRequire(import.meta.url);
const { notify } = require("../systemd.node");

/**
 * Kronos bridge to systemd
 * - sync node state to systemd with notify
 * - propagate config into kronos world
 * - propagate socket activations into kronos
 * - start / stop / restart / reload initiated from systemd
 */
export class ServiceSystemd extends ServiceProviderMixin(Service) {
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
}

export default ServiceSystemd;
