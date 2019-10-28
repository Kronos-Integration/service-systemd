import { createRequire } from "module";
import { ServiceProviderMixin, Service, ServiceLogger } from "@kronos-integration/service";

const require = createRequire(import.meta.url);
const { notify, journal_print } = require("../systemd.node");


class JournalLogger extends ServiceLogger {
  constructor(config, owner) {
    super(config, owner);

    this.endpoints.log.receive = async entry => {
      journal_print(entry.severity + ":" + JSON.stringify(entry));
    };
  }
}

/**
 * Kronos bridge to systemd
 * - sync node state to systemd with notify
 * - propagate config into kronos world
 * - propagate socket activations into kronos
 * - start / stop / restart / reload initiated from systemd
 */
export class ServiceSystemd extends ServiceProviderMixin(Service, JournalLogger) {

  constructor(...args) {
    super(...args);
    journal_print("Message to the journal");
  }

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
