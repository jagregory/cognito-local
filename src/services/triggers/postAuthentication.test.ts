import { newMockLambda } from "../../__tests__/mockLambda";
import { MockLogger } from "../../__tests__/mockLogger";
import { newMockUserPoolClient } from "../../__tests__/mockUserPoolClient";
import { Lambda } from "../lambda";
import { attributesToRecord, UserPoolClient } from "../userPoolClient";
import {
  PostAuthentication,
  PostAuthenticationTrigger,
} from "./postAuthentication";
import * as TDB from "../../__tests__/testDataBuilder";

describe("PostAuthentication trigger", () => {
  let mockLambda: jest.Mocked<Lambda>;
  let mockUserPoolClient: jest.Mocked<UserPoolClient>;
  let postAuthentication: PostAuthenticationTrigger;

  beforeEach(() => {
    mockLambda = newMockLambda();
    mockUserPoolClient = newMockUserPoolClient();
    postAuthentication = PostAuthentication(
      {
        lambda: mockLambda,
      },
      MockLogger
    );
  });

  describe("PostAuthentication_Authentication", () => {
    const user = TDB.user();

    it("swallows error when lambda fails", async () => {
      mockLambda.invoke.mockRejectedValue(new Error("Something bad happened"));

      // bit of an odd assertion, we're asserting that the promise was successfully resolved with undefined
      // if the promise rejects, this test would fail
      await expect(
        postAuthentication({
          clientId: "clientId",
          source: "PostAuthentication_Authentication",
          userAttributes: user.Attributes,
          username: user.Username,
          userPoolId: "userPoolId",
        })
      ).resolves.toEqual(undefined);
    });

    it("invokes the lambda", async () => {
      mockLambda.invoke.mockResolvedValue({});

      await postAuthentication({
        clientId: "clientId",
        source: "PostAuthentication_Authentication",
        userAttributes: user.Attributes,
        username: user.Username,
        userPoolId: "userPoolId",
      });

      expect(mockLambda.invoke).toHaveBeenCalledWith("PostAuthentication", {
        clientId: "clientId",
        triggerSource: "PostAuthentication_Authentication",
        userAttributes: attributesToRecord(user.Attributes),
        userPoolId: "userPoolId",
        username: user.Username,
      });
    });
  });
});
