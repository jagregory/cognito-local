#!/usr/bin/env node

import { createDefaultServer } from "../server";
import Pino from "pino";
import PinoPretty from "pino-pretty";
import * as https from "https";

const logger = Pino(
  {
    level: process.env.DEBUG ? "debug" : "info",
  },
  PinoPretty({
    colorize: true,
    ignore: "pid,name,hostname",
    singleLine: true,
    messageFormat: (log, messageKey) =>
      `${log["reqId"] ?? "NONE"} ${log["target"] ?? "NONE"} ${log[messageKey]}`,
  }) as any // eslint-disable-line @typescript-eslint/no-explicit-any
);

createDefaultServer(logger)
  .then((server) => server.start())
  .then((server) => {
    const address = server.address();
    if (!address) {
      throw new Error("Server started without address");
    }
    const url =
      typeof address === "string"
        ? address
        : `${address.address}:${address.port}`;

    const proto = server instanceof https.Server ? "https" : "http";

    logger.info(`Cognito Local running on ${proto}://${url}`);
  })
  .catch((err) => {
    logger.error(err);
    process.exit(1);
  });
