import { describe, expect, it } from "vitest";
import { TestContext } from "../__tests__/testContext";
import { UnsupportedError } from "../errors";
import type { Services } from "../services";
import { Targets } from "../targets/targets";
import { Router } from "./Router";

describe("Router", () => {
  it("returns an error handler for an invalid target", async () => {
    const services = {} as Services;
    const route = Router(services)("invalid");

    await expect(route(TestContext, null as any)).rejects.toEqual(
      new UnsupportedError('Unsupported x-amz-target header "invalid"'),
    );
  });

  it.each(Object.keys(Targets))("supports the %s target", (target) => {
    const services = {} as Services;
    const route = Router(services)(target);

    expect(route).toBeDefined();
  });
});
