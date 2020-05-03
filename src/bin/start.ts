#!/usr/bin/env node

import { createDefaultServer } from "../server";

createDefaultServer()
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

    console.log(`Cognito Local running on http://${url}`);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
