#!/usr/bin/env node

import { createDefaultServer } from "../server";

createDefaultServer()
  .then((server) => {
    const hostname = process.env.HOST || "localhost";
    const port = parseInt(process.env.PORT || "9229", 10);
    return server.start({ hostname, port });
  })
  .then((options) => {
    console.log(
      `Cognito Local running on http://${options.hostname}:${options.port}`
    );
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
