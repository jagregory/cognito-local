import bodyParser from "body-parser";
import cors from "cors";
import express from "express";
import * as http from "http";
import { CognitoError, unsupported, UnsupportedError } from "../errors";
import { Logger } from "../log";
import { Router } from "../targets/router";
import PublicKey from "../keys/cognitoLocal.public.json";

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
  const app = express();

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

  app.post("/", async (req, res) => {
    const xAmzTarget = req.headers["x-amz-target"];

    if (!xAmzTarget) {
      return res.status(400).json({ message: "Missing x-amz-target header" });
    } else if (xAmzTarget instanceof Array) {
      return res.status(400).json({ message: "Too many x-amz-target headers" });
    }

    const [, target] = xAmzTarget.split(".");
    if (!target) {
      return res.status(400).json({ message: "Invalid x-amz-target header" });
    }

    const route = router(target);

    try {
      const output = await route(req.body);

      return res.status(200).json(output);
    } catch (ex) {
      logger.error(`Error handling target: ${target}`, ex);
      if (ex instanceof UnsupportedError) {
        if (options.development) {
          logger.info("======");
          logger.info();
          logger.info("Unsupported target");
          logger.info("");
          logger.info(`x-amz-target: ${xAmzTarget}`);
          logger.info("Body:");
          logger.info(JSON.stringify(req.body, undefined, 2));
          logger.info();
          logger.info("======");
        }

        return unsupported(ex.message, res, logger);
      } else if (ex instanceof CognitoError) {
        return res.status(400).json({
          code: ex.code,
          message: ex.message,
        });
      } else {
        return res.status(500).json(ex);
      }
    }
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
          (err) => {
            if (err) {
              reject(err);
            } else {
              resolve(httpServer);
            }
          }
        );
      });
    },
  };
};
