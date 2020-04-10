import supertest from "supertest";
import {
  CodeMismatchError,
  CognitoError,
  InvalidPasswordError,
  NotAuthorizedError,
  UnsupportedError,
  UsernameExistsError,
} from "../src/errors";
import { createServer } from "../src/server";

describe("HTTP server", () => {
  it("errors with missing x-azm-target header", async () => {
    const router = jest.fn();
    const server = createServer(router);

    const response = await supertest(server.application).post("/");

    expect(response.status).toEqual(400);
    expect(response.body).toEqual({ message: "Missing x-amz-target header" });
  });

  it("errors with an poorly formatted x-azm-target header", async () => {
    const router = jest.fn();
    const server = createServer(router);

    const response = await supertest(server.application)
      .post("/")
      .set("x-amz-target", "bad-format");

    expect(response.status).toEqual(400);
    expect(response.body).toEqual({
      message: "Invalid x-amz-target header",
    });
  });

  describe("a handled target", () => {
    it("returns the output of a matched target", async () => {
      const route = jest.fn().mockResolvedValue({
        ok: true,
      });
      const router = (target: string) =>
        target === "valid" ? route : () => Promise.reject();
      const server = createServer(router);

      const response = await supertest(server.application)
        .post("/")
        .set("x-amz-target", "prefix.valid");

      expect(response.status).toEqual(200);
      expect(response.body).toEqual({
        ok: true,
      });
    });

    it("converts UnsupportedErrors from within a target route to a 500 error", async () => {
      const route = jest
        .fn()
        .mockRejectedValue(new UnsupportedError("integration test"));
      const router = (target: string) =>
        target === "valid" ? route : () => Promise.reject();
      const server = createServer(router);

      const response = await supertest(server.application)
        .post("/")
        .set("x-amz-target", "prefix.valid");

      expect(response.status).toEqual(500);
      expect(response.body).toEqual({
        code: "CognitoLocal#Unsupported",
        message: "Cognito Local unsupported feature: integration test",
      });
    });

    it.each`
      error                                          | code                          | message
      ${new CognitoError("CognitoError", "message")} | ${"CognitoError"}             | ${"message"}
      ${new NotAuthorizedError()}                    | ${"NotAuthorizedException"}   | ${"User not authorized"}
      ${new UsernameExistsError()}                   | ${"UsernameExistsException"}  | ${"User already exists"}
      ${new CodeMismatchError()}                     | ${"CodeMismatchException"}    | ${"Incorrect confirmation code"}
      ${new InvalidPasswordError()}                  | ${"InvalidPasswordException"} | ${"Invalid password"}
    `(
      "it converts $code to the format Cognito SDK expects",
      async ({ error, code, message }) => {
        const route = jest.fn().mockRejectedValue(error);
        const router = (target: string) =>
          target === "valid" ? route : () => Promise.reject();
        const server = createServer(router);

        const response = await supertest(server.application)
          .post("/")
          .set("x-amz-target", "prefix.valid");

        expect(response.status).toEqual(400);
        expect(response.body).toEqual({
          code: `CognitoLocal#${code}`,
          message,
        });
      }
    );
  });
});
