import bodyParser from "body-parser";
import cors from "cors";
import express from "express";
import { CognitoError, unsupported, UnsupportedError } from "../errors";
import { Router } from "../targets/router";
import PublicKey from "../keys/cognitoLocal.public.json";

export interface ServerOptions {
  port?: number;
  hostname?: string;
  development?: boolean;
}

export interface Server {
  application: any; // eslint-disable-line
  start(options?: ServerOptions): Promise<ServerOptions>;
}

export const createServer = (
  router: Router,
  options: ServerOptions = {}
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
      console.error(`Error handling target: ${target}`, ex);
      if (ex instanceof UnsupportedError) {
        if (options.development) {
          console.log("======");
          console.log();
          console.log("Unsupported target");
          console.log("");
          console.log(`x-amz-target: ${xAmzTarget}`);
          console.log("Body:");
          console.log(JSON.stringify(req.body, undefined, 2));
          console.log();
          console.log("======");
        }

        return unsupported(ex.message, res);
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
      const actualOptions = {
        ...options,
        ...startOptions,
        port: options?.port ?? 9229,
        hostname: options?.hostname ?? "localhost",
      };
      return new Promise((resolve, reject) => {
        app.listen(actualOptions.port, actualOptions.hostname, (err) => {
          if (err) {
            reject(err);
          } else {
            resolve(actualOptions);
          }
        });
      });
    },
  };
};
