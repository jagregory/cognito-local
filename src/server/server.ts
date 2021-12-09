import bodyParser from "body-parser";
import cors from "cors";
import express from "express";
import * as http from "http";
import type { Logger } from "pino";
import * as uuid from "uuid";
import { CognitoError, unsupported, UnsupportedError } from "../errors";
import { Router } from "../targets/router";
import PublicKey from "../keys/cognitoLocal.public.json";
import Pino from "pino-http";

export interface ServerOptions {
  port: number;
  hostname: string;
  development: boolean;
}

export interface Server {
  application: any; // eslint-disable-line
  start(options?: Partial<ServerOptions>): Promise<http.Server>;
}

export const createServer = (
  router: Router,
  logger: Logger,
  options: Partial<ServerOptions> = {}
): Server => {
  const pino = Pino({
    logger,
    useLevel: "debug",
    genReqId: () => uuid.v4().split("-")[0],
    quietReqLogger: true,
    autoLogging: {
      ignore: (req) => req.method === "OPTIONS",
    },
  });
  const app = express();

  app.use(pino);

  app.use(
    cors({
      origin: "*",
    })
  );
  app.use(
    bodyParser.json({
      type: "application/x-amz-json-1.1",
    })
  );

  app.get("/:userPoolId/.well-known/jwks.json", (req, res) => {
    res.status(200).json({
      keys: [PublicKey.jwk],
    });
  });

  app.get("/health", (req, res) => {
    res.status(200).json({ ok: true });
  });

  app.post("/", (req, res) => {
    const xAmzTarget = req.headers["x-amz-target"];

    if (!xAmzTarget) {
      res.status(400).json({ message: "Missing x-amz-target header" });
      return;
    } else if (xAmzTarget instanceof Array) {
      res.status(400).json({ message: "Too many x-amz-target headers" });
      return;
    }

    const [, target] = xAmzTarget.split(".");
    if (!target) {
      res.status(400).json({ message: "Invalid x-amz-target header" });
      return;
    }

    const route = router(target);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const replacer: (this: any, key: string, value: any) => any = function (
      key,
      value
    ) {
      if (this[key] instanceof Date) {
        return Math.floor(this[key].getTime() / 1000);
      }
      return value;
    };

    route({ logger: req.log }, req.body).then(
      (output) =>
        res.status(200).type("json").send(JSON.stringify(output, replacer)),
      (ex) => {
        if (ex instanceof UnsupportedError) {
          if (options.development) {
            req.log.info("======");
            req.log.info("");
            req.log.info("Unsupported target");
            req.log.info("");
            req.log.info(`x-amz-target: ${xAmzTarget}`);
            req.log.info("Body:");
            req.log.info(JSON.stringify(req.body, undefined, 2));
            req.log.info("");
            req.log.info("======");
          }

          unsupported(ex.message, res, req.log);
          return;
        } else if (ex instanceof CognitoError) {
          req.log.warn({ error: ex }, `Error handling target: ${target}`);
          res.status(400).json({
            code: ex.code,
            message: ex.message,
          });
          return;
        } else {
          req.log.error({ error: ex }, `Error handling target: ${target}`);
          res.status(500).json(ex);
          return;
        }
      }
    );
  });

  return {
    application: app,
    start(startOptions) {
      const actualOptions: ServerOptions = {
        port: options?.port ?? 9229,
        hostname: options?.hostname ?? "localhost",
        development: options?.development ?? false,
        ...options,
        ...startOptions,
      };

      return new Promise((resolve, reject) => {
        const httpServer = app.listen(
          actualOptions.port,
          actualOptions.hostname,
          () => resolve(httpServer)
        );
        httpServer.on("error", reject);
      });
    },
  };
};
