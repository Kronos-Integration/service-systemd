import { Service } from "@kronos-integration/service";
import { notify } from "sd-daemon";

export class ServiceKOA extends Service {
  static get name() {
    return "systemd";
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
