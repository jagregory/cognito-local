import bodyParser from "body-parser";
import cors from "cors";
import express from "express";
import * as http from "http";
import type { Logger } from "pino";
import * as uuid from "uuid";
import { CognitoError, UnsupportedError } from "../errors";
import { Router } from "./Router";
import PublicKey from "../keys/cognitoLocal.public.json";
import { CognitoService } from "../services/cognitoService";
import { AppClient } from "../services/appClient";
import PrivateKey from "../keys/cognitoLocal.private.json";
import jwt from "jsonwebtoken";
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
  cognito: CognitoService,
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
    }),
    bodyParser.urlencoded({
      extended: true,
    })
  );

  app.get("/health", (req, res) => {
    res.status(200).json({ ok: true });
  });

  app.get("/:userPoolId/.well-known/jwks.json", (req, res) => {
    res.status(200).json({
      keys: [PublicKey.jwk],
    });
  });

  app.get("/:userPoolId/.well-known/openid-configuration", (req, res) => {
    const proxyHost = req.headers["x-forwarded-host"];
    const host = proxyHost ? proxyHost : req.headers.host;
    const userPoolURL = `http://${host}/${req.params.userPoolId}`;

    res.status(200).json({
      authorization_endpoint: `${userPoolURL}/oauth2/authorize`,
      grant_types_supported: ["client_credentials", "authorization_code"],
      id_token_signing_alg_values_supported: ["RS256"],
      issuer: userPoolURL,
      jwks_uri: `${userPoolURL}/.well-known/jwks.json`,
      token_endpoint: `${userPoolURL}/oauth2/token`,
      token_endpoint_auth_methods_supported: ["client_secret_basic"],
    });
  });

  app.get("/:userPoolId/oauth2/authorize", (req, res) => {
    res.redirect(
      `${req.query.redirect_uri}?code=AUTHORIZATION_CODE&state=${req.query.state}`
    );
  });

  /**
   * Generate a new access token for client credentials and authorization code flows.
   */
  app.post("/:userPoolId/oauth2/token", async (req, res) => {
    const contentType = req.headers["content-type"];

    if (!contentType?.includes("application/x-www-form-urlencoded")) {
      res.status(400).json({
        error: "invalid_request",
        description: "content-type must be 'application/x-www-form-urlencoded'",
      });
      return;
    }

    const grantType = req.body.grant_type;

    if (
      grantType !== "client_credentials" &&
      grantType !== "authorization_code"
    ) {
      res.status(400).json({
        error: "unsupported_grant_type",
        description:
          "only 'client_credentials' and 'authorization_code' grant types are supported",
      });
      return;
    }

    const authHeader = req.headers.authorization?.split(" ");

    if (
      authHeader === undefined ||
      authHeader.length !== 2 ||
      authHeader[0] !== "Basic"
    ) {
      res.status(400).json({
        error: "invalid_request",
        description:
          "authorization header must be present and use HTTP Basic authentication scheme",
      });
      return;
    }

    const [clientId, clientSecret] = Buffer.from(authHeader[1], "base64")
      .toString("ascii")
      .split(":");

    let userPoolClient: AppClient | null;

    try {
      userPoolClient = await cognito.getAppClient(
        { logger: req.log },
        clientId
      );
    } catch (e) {
      res.status(500).json({
        error: "server_error",
        description: "failed to retrieve user pool client",
      });
      return;
    }

    if (!userPoolClient || userPoolClient.ClientSecret !== clientSecret) {
      res.status(400).json({
        error: "invalid_client",
        description: "invalid client id or secret",
      });
      return;
    }

    if (!userPoolClient.AllowedOAuthFlows?.includes(grantType)) {
      res.status(400).json({
        error: "unsupported_grant_type",
        description: `grant type '${grantType}' is not supported by this client`,
      });
      return;
    }

    if (grantType === "client_credentials") {
      if (!userPoolClient.AllowedOAuthScopes?.includes(req.body.scope)) {
        res.status(400).json({
          error: "invalid_scope",
          description: `invalid scope '${req.body.scope}'`,
        });
        return;
      }
    } else if (grantType === "authorization_code") {
      if (req.body.code !== "AUTHORIZATION_CODE") {
        res.status(400).json({
          error: "invalid_grant",
          description: "invalid authorization code",
        });
        return;
      }
    }

    const now = Math.floor(Date.now() / 1000);

    const accessToken = {
      sub: clientId,
      client_id: clientId,
      scope: req.body.scope,
      jti: uuid.v4(),
      auth_time: now,
      iat: now,
      token_use: "access",
    };

    const idToken = {
      sub: clientId,
      client_id: clientId,
      jti: uuid.v4(),
      auth_time: now,
      iat: now,
      token_use: "id",
      "custom:tenant_id": uuid.v4(),
    };

    res.status(200).json({
      access_token: jwt.sign(accessToken, PrivateKey.pem, {
        algorithm: "RS256",
        issuer: `https://cognito-local/${userPoolClient.UserPoolId}`,
        expiresIn: 3600,
        keyid: "CognitoLocal",
      }),
      expiresIn: 3600,
      id_token: jwt.sign(idToken, PrivateKey.pem, {
        algorithm: "RS256",
        issuer: `https://cognito-local/${userPoolClient.UserPoolId}`,
        expiresIn: 3600,
        keyid: "CognitoLocal",
      }),
      token_type: "Bearer",
    });
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
