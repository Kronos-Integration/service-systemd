import test from "ava";
import { ServiceSystemd } from "@kronos-integration/service-systemd";

test("credential", async t => {
  const ssd = new ServiceSystemd();

  t.is(await ssd.getCredential("secret1"), "");
});
