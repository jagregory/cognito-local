#!/usr/bin/env node

import { createDefaultServer } from "../server";

createDefaultServer()
  .then((server) => {
    const port = parseInt(process.env.PORT || "9229", 10);
    return server.start({ port });
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
