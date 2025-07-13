import bodyParser from "body-parser";
import cors from "cors";
import express from "express";
import * as http from "http";
import * as https from "https";
import type { Logger } from "pino";
import * as uuid from "uuid";
import { CognitoError, UnsupportedError } from "../errors";
import { Router } from "./Router";
import PublicKey from "../keys/cognitoLocal.public.json";
import Pino from "pino-http";
import { readFileSync } from "fs";

export type ServerOptions = {
  port?: number;
  hostname?: string;
  development?: boolean;
} & (
  | { https: true; key?: string; ca?: string; cert?: string }
  | { https?: false }
);

export interface Server {
  application: any; // eslint-disable-line
  start(): Promise<http.Server | https.Server>;
}

export const createServer = (
  router: Router,
  logger: Logger,
  options: ServerOptions
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

  const hostname = process.env.ISSUER_HOST ?? "localhost";
  const port = process.env.PORT ?? "9229";

  app.get("/:userPoolId/.well-known/openid-configuration", (req, res) => {
    res.status(200).json({
      id_token_signing_alg_values_supported: ["RS256"],
      jwks_uri: `http://${hostname}:${port}/${req.params.userPoolId}/.well-known/jwks.json`,
      issuer: `http://${hostname}:${port}/${req.params.userPoolId}`,
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

          req.log.error(`Cognito Local unsupported feature: ${ex.message}`);
          res.status(500).json({
            __type: "CognitoLocal#Unsupported",
            message: `Cognito Local unsupported feature: ${ex.message}`,
          });
          return;
        } else if (ex instanceof CognitoError) {
          req.log.warn(ex, `Error handling target: ${target}`);
          res.status(400).json({
            __type: ex.code,
            message: ex.message,
          });
          return;
        } else {
          req.log.error(ex, `Error handling target: ${target}`);
          res.status(500).json(ex);
          return;
        }
      }
    );
  });

  return {
    application: app,
    start() {
      const hostname = options.hostname;
      const port = options.port;

      return new Promise<http.Server | https.Server>((resolve, reject) => {
        const server = options.https
          ? https.createServer(
              {
                ca: options.ca ? readFileSync(options.ca, "utf-8") : undefined,
                cert: options.cert
                  ? readFileSync(options.cert, "utf-8")
                  : undefined,
                key: options.key
                  ? readFileSync(options.key, "utf-8")
                  : undefined,
              },
              app
            )
          : http.createServer(app);

        server.listen(port, hostname, () => resolve(server));
        server.on("error", reject);
      });
    },
  };
};
