import test from "ava";
import { ServiceSystemd } from "@kronos-integration/service-systemd";

test.skip("credential", async t => {
 //* process.env.CREDENTIALS_DIRECTORY = "/tmp";

  const ssd = new ServiceSystemd();

  t.is(await ssd.getCredential("secret1"), "");
});
