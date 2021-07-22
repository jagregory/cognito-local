#!/usr/bin/env node

import { ConsoleLogger } from "../log";
import { createDefaultServer } from "../server";

const logger = new ConsoleLogger();

createDefaultServer(logger)
  .then((server) => {
    const hostname = process.env.HOST ?? "localhost";
    const port = parseInt(process.env.PORT ?? "9229", 10);
    return server.start({ hostname, port });
  })
  .then((httpServer) => {
    const address = httpServer.address();
    if (!address) {
      throw new Error("Server started without address");
    }
    const url =
      typeof address === "string"
        ? address
        : `${address.address}:${address.port}`;

    logger.info(`Cognito Local running on http://${url}`);
  })
  .catch((err) => {
    logger.error(err);
    process.exit(1);
  });
