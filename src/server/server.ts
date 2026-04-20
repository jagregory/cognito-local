import { readFileSync } from "node:fs";
import * as http from "node:http";
import * as https from "node:https";
import bodyParser from "body-parser";
import cors from "cors";
import express from "express";
import type { Logger } from "pino";
import Pino from "pino-http";
import * as uuid from "uuid";
import { CognitoError, UnsupportedError } from "../errors";
import PublicKey from "../keys/cognitoLocal.public.json";
import type { Services } from "../services";
import type { Router } from "./Router";

export type ServerOptions = {
  port?: number;
  hostname?: string;
  development?: boolean;
} & (
  | { https: true; key?: string; ca?: string; cert?: string }
  | { https?: false }
);

export interface Server {
  // biome-ignore lint/suspicious/noExplicitAny: don't want to export express types
  application: any;
  start(): Promise<http.Server | https.Server>;
}

export const createServer = (
  router: Router,
  logger: Logger,
  options: ServerOptions,
  services?: Pick<Services, "cognito" | "tokenGenerator">,
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
    }),
  );
  app.use(
    bodyParser.json({
      type: "application/x-amz-json-1.1",
    }),
  );

  app.get("/:userPoolId/.well-known/jwks.json", (_req, res) => {
    res.status(200).json({
      keys: [PublicKey.jwk],
    });
  });

  app.get("/:userPoolId/.well-known/openid-configuration", (req, res) => {
    res.status(200).json({
      id_token_signing_alg_values_supported: ["RS256"],
      jwks_uri: `http://localhost:9229/${req.params.userPoolId}/.well-known/jwks.json`,
      issuer: `http://localhost:9229/${req.params.userPoolId}`,
    });
  });

  app.get("/health", (_req, res) => {
    res.status(200).json({ ok: true });
  });

  app.use(
    "/:userPoolId/oauth2/token",
    bodyParser.urlencoded({ extended: false }),
  );

  app.post("/:userPoolId/oauth2/token", async (req, res) => {
    if (!services) {
      res.status(501).json({
        error: "server_error",
        error_description: "OAuth not configured",
      });
      return;
    }

    const {
      grant_type,
      client_id: bodyClientId,
      client_secret: bodyClientSecret,
      scope: scopeParam,
    } = req.body;

    if (grant_type !== "client_credentials") {
      res.status(400).json({ error: "unsupported_grant_type" });
      return;
    }

    let clientId: string | undefined;
    let clientSecret: string | undefined;

    const authHeader = req.headers.authorization;
    if (typeof authHeader === "string" && authHeader.startsWith("Basic ")) {
      const decoded = Buffer.from(authHeader.slice(6), "base64").toString(
        "utf-8",
      );
      const colonIdx = decoded.indexOf(":");
      if (colonIdx !== -1) {
        clientId = decoded.slice(0, colonIdx);
        clientSecret = decoded.slice(colonIdx + 1);
      }
    } else {
      clientId = bodyClientId;
      clientSecret = bodyClientSecret;
    }

    if (!clientId || !clientSecret) {
      res.status(401).json({
        error: "invalid_client",
        error_description: "Missing credentials",
      });
      return;
    }

    const ctx = { logger: req.log };
    const appClient = await services.cognito.getAppClient(ctx, clientId);

    if (!appClient) {
      res.status(401).json({
        error: "invalid_client",
        error_description: "Client not found",
      });
      return;
    }

    if (appClient.UserPoolId !== req.params.userPoolId) {
      res.status(401).json({
        error: "invalid_client",
        error_description: "Client not found",
      });
      return;
    }

    if (!appClient.ClientSecret || appClient.ClientSecret !== clientSecret) {
      res.status(401).json({
        error: "invalid_client",
        error_description: "Invalid client credentials",
      });
      return;
    }

    if (!appClient.AllowedOAuthFlows?.includes("client_credentials")) {
      res.status(400).json({ error: "unauthorized_client" });
      return;
    }

    const allowedScopes = appClient.AllowedOAuthScopes ?? [];
    const requestedScopes =
      typeof scopeParam === "string" && scopeParam.length > 0
        ? scopeParam.split(" ").filter(Boolean)
        : allowedScopes;

    for (const scope of requestedScopes) {
      if (!allowedScopes.includes(scope)) {
        res.status(400).json({
          error: "invalid_scope",
          error_description: `Unknown scope: ${scope}`,
        });
        return;
      }
    }

    let result: Awaited<
      ReturnType<typeof services.tokenGenerator.generateClientCredentials>
    >;
    try {
      result = await services.tokenGenerator.generateClientCredentials(
        ctx,
        appClient,
        requestedScopes,
      );
    } catch (ex) {
      req.log.error(ex, "Failed to generate client credentials token");
      res.status(500).json({
        error: "server_error",
        error_description: "Failed to generate token",
      });
      return;
    }

    res.status(200).json({
      access_token: result.AccessToken,
      expires_in: result.ExpiresIn,
      token_type: result.TokenType,
    });
  });

  app.post("/", (req, res) => {
    const xAmzTarget = req.headers["x-amz-target"];

    if (!xAmzTarget) {
      res.status(400).json({ message: "Missing x-amz-target header" });
      return;
    } else if (Array.isArray(xAmzTarget)) {
      res.status(400).json({ message: "Too many x-amz-target headers" });
      return;
    }

    const [, target] = xAmzTarget.split(".");
    if (!target) {
      res.status(400).json({ message: "Invalid x-amz-target header" });
      return;
    }

    const route = router(target);
    // biome-ignore lint/suspicious/noExplicitAny: generic wrapper
    const replacer: (this: any, key: string, value: any) => any = function (
      key,
      value,
    ) {
      if (this[key] instanceof Date) {
        return Math.floor(this[key].getTime() / 1000);
      }
      return value;
    };

    route({ logger: req.log }, req.body).then(
      (output) =>
        res
          .status(200)
          .type("application/x-amz-json-1.1")
          .send(JSON.stringify(output, replacer)),
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
      },
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
              app,
            )
          : http.createServer(app);

        server.listen(port, hostname, () => resolve(server));
        server.on("error", reject);
      });
    },
  };
};
