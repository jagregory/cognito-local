import { beforeEach, describe, expect, it, type MockedObject } from "vitest";
import { newMockLambda } from "../../__tests__/mockLambda";
import { TestContext } from "../../__tests__/testContext";
import * as TDB from "../../__tests__/testDataBuilder";
import type { Lambda } from "../lambda";
import { attributesToRecord } from "../userPoolService";
import {
  PostAuthentication,
  type PostAuthenticationTrigger,
} from "./postAuthentication";

describe("PostAuthentication trigger", () => {
  let mockLambda: MockedObject<Lambda>;
  let postAuthentication: PostAuthenticationTrigger;

  beforeEach(() => {
    mockLambda = newMockLambda();
    postAuthentication = PostAuthentication({
      lambda: mockLambda,
    });
  });

  describe("PostAuthentication_Authentication", () => {
    const user = TDB.user();

    it("swallows error when lambda fails", async () => {
      mockLambda.invoke.mockRejectedValue(new Error("Something bad happened"));

      // bit of an odd assertion, we're asserting that the promise was successfully resolved with undefined
      // if the promise rejects, this test would fail
      await expect(
        postAuthentication(TestContext, {
          clientId: "clientId",
          clientMetadata: undefined,
          source: "PostAuthentication_Authentication",
          userAttributes: user.Attributes,
          username: user.Username,
          userPoolId: "userPoolId",
        }),
      ).resolves.toEqual(undefined);
    });

    it("invokes the lambda", async () => {
      mockLambda.invoke.mockResolvedValue({});

      await postAuthentication(TestContext, {
        clientId: "clientId",
        clientMetadata: {
          client: "metadata",
        },
        source: "PostAuthentication_Authentication",
        userAttributes: user.Attributes,
        username: user.Username,
        userPoolId: "userPoolId",
      });

      expect(mockLambda.invoke).toHaveBeenCalledWith(
        TestContext,
        "PostAuthentication",
        {
          clientId: "clientId",
          clientMetadata: {
            client: "metadata",
          },
          triggerSource: "PostAuthentication_Authentication",
          userAttributes: attributesToRecord(user.Attributes),
          userPoolId: "userPoolId",
          username: user.Username,
        },
      );
    });
  });
});
