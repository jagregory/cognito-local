import { MockLambda } from "../../mocks/MockLambda";
import { MockUserPoolService } from "../../mocks/MockUserPoolService";
import { MockContext } from "../../mocks/MockContext";
import { Lambda } from "../lambda";
import { attributesToRecord, UserPoolService } from "../userPoolService";
import {
  PostAuthentication,
  PostAuthenticationTrigger,
} from "./postAuthentication";
import { MockUser } from "../../mocks/MockUser";

describe("PostAuthentication trigger", () => {
  let mockLambda: jest.Mocked<Lambda>;
  let mockUserPoolService: jest.Mocked<UserPoolService>;
  let postAuthentication: PostAuthenticationTrigger;

  beforeEach(() => {
    mockLambda = MockLambda();
    mockUserPoolService = MockUserPoolService();
    postAuthentication = PostAuthentication({
      lambda: mockLambda,
    });
  });

  describe("PostAuthentication_Authentication", () => {
    const user = MockUser();

    it("swallows error when lambda fails", async () => {
      mockLambda.invoke.mockRejectedValue(new Error("Something bad happened"));

      // bit of an odd assertion, we're asserting that the promise was successfully resolved with undefined
      // if the promise rejects, this test would fail
      await expect(
        postAuthentication(MockContext, {
          clientId: "clientId",
          clientMetadata: undefined,
          source: "PostAuthentication_Authentication",
          userAttributes: user.Attributes,
          username: user.Username,
          userPoolId: "userPoolId",
        })
      ).resolves.toEqual(undefined);
    });

    it("invokes the lambda", async () => {
      mockLambda.invoke.mockResolvedValue({});

      await postAuthentication(MockContext, {
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
        MockContext,
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
        }
      );
    });
  });
});
