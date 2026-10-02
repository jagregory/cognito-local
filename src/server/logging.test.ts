import Pino from "pino";
import supertest from "supertest";
import { describe, expect, it, vi } from "vitest";
import { createServer } from "./server";

describe("HTTP log redaction", () => {
  it.each([false, true])(
    "preserves parent redaction, serializers and live headers (remove=%s)",
    async (remove) => {
      const logs: string[] = [];
      const logger = Pino(
        {
          level: "debug",
          redact: {
            paths: ["req.headers.authorization", "secret"],
            censor: "CUSTOM_REDACTED",
            remove,
          },
          serializers: { custom: () => "CUSTOM_SERIALIZER" },
        },
        {
          write: (line) => {
            logs.push(line);
          },
        },
      );
      const app = createServer(vi.fn(), logger, {}).application;
      app.get(
        "/log-test",
        (req: import("express").Request, res: import("express").Response) => {
          expect(req.headers.cookie).toBe("session=synthetic-cookie");
          expect(req.headers.authorization).toBe("Bearer synthetic-bearer");
          res.cookie("session", "synthetic-set-cookie");
          req.log.info({
            req,
            res,
            secret: "synthetic-secret",
            custom: "before-serialization",
          });
          res.json({ ok: true });
        },
      );
      const result = await supertest(app)
        .get("/log-test")
        .set("Cookie", "session=synthetic-cookie")
        .set("Authorization", "Bearer synthetic-bearer");
      expect(result.header["set-cookie"][0]).toContain("synthetic-set-cookie");
      const output = logs.join("");
      for (const secret of [
        "synthetic-cookie",
        "synthetic-set-cookie",
        "synthetic-bearer",
        "synthetic-secret",
        "before-serialization",
      ])
        expect(output).not.toContain(secret);
      expect(output).toContain("CUSTOM_SERIALIZER");
      if (!remove) expect(output).toContain("CUSTOM_REDACTED");
    },
  );
});
