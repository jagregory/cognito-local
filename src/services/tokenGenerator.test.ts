import jwt from "jsonwebtoken";
import { DateClock } from "../services/clock";
import { MockTriggers } from "../mocks/MockTriggers";
import { UUID } from "../mocks";
import { MockContext } from "../mocks/MockContext";
import { JwtTokenGenerator, TokenGenerator } from "./tokenGenerator";
import { Triggers } from "./triggers";
import { attributeValue } from "./userPoolService";
import { MockUser } from "../mocks/MockUser";

const originalDate = new Date();

describe("JwtTokenGenerator", () => {
  let mockTriggers: jest.Mocked<Triggers>;
  let tokenGenerator: TokenGenerator;

  const user = MockUser();
  const clock = new DateClock(originalDate);

  beforeEach(() => {
    mockTriggers = MockTriggers();
    tokenGenerator = new JwtTokenGenerator(clock, mockTriggers, {
      IssuerDomain: "http://example.com",
    });
  });

  describe("TokenGeneration lambda is configured", () => {
    it("can add and override claims to the id token", async () => {
      mockTriggers.enabled.mockImplementation((name) => {
        return name === "PreTokenGeneration";
      });
      mockTriggers.preTokenGeneration.mockResolvedValue({
        claimsOverrideDetails: {
          claimsToAddOrOverride: {
            newclaim: "value",
            email: "something else",
          },
        },
      });

      const tokens = await tokenGenerator.generate(
        MockContext,
        user,
        "clientId",
        "userPoolId",
        { client: "metadata" },
        "RefreshTokens"
      );

      // id token has new claim added
      expect(jwt.decode(tokens.IdToken)).toMatchObject({
        newclaim: "value",
        email: "something else",
      });

      // access and refresh tokens cannot be changed by the trigger
      expect(jwt.decode(tokens.AccessToken)).not.toMatchObject({
        newclaim: "value",
        email: "something else",
      });
      expect(jwt.decode(tokens.RefreshToken)).not.toMatchObject({
        newclaim: "value",
        email: "something else",
      });
    });

    it("can suppress claims in the id token", async () => {
      mockTriggers.enabled.mockImplementation((name) => {
        return name === "PreTokenGeneration";
      });
      mockTriggers.preTokenGeneration.mockResolvedValue({
        claimsOverrideDetails: {
          claimsToSuppress: ["email"],
        },
      });

      const tokens = await tokenGenerator.generate(
        MockContext,
        user,
        "clientId",
        "userPoolId",
        { client: "metadata" },
        "RefreshTokens"
      );

      // id token has new claim added
      expect(jwt.decode(tokens.IdToken)).not.toHaveProperty("email");

      // access and refresh tokens cannot be changed by the trigger
      expect(jwt.decode(tokens.AccessToken)).not.toHaveProperty("email");
      expect(jwt.decode(tokens.RefreshToken)).toHaveProperty(
        "email",
        attributeValue("email", user.Attributes)
      );
    });

    it("suppresses claims that are also overridden", async () => {
      mockTriggers.enabled.mockImplementation((name) => {
        return name === "PreTokenGeneration";
      });
      mockTriggers.preTokenGeneration.mockResolvedValue({
        claimsOverrideDetails: {
          claimsToAddOrOverride: {
            email: "something else",
          },
          claimsToSuppress: ["email"],
        },
      });

      const tokens = await tokenGenerator.generate(
        MockContext,
        user,
        "clientId",
        "userPoolId",
        { client: "metadata" },
        "RefreshTokens"
      );

      // id token has new claim added
      expect(jwt.decode(tokens.IdToken)).not.toHaveProperty("email");

      // access and refresh tokens cannot be changed by the trigger
      expect(jwt.decode(tokens.AccessToken)).not.toHaveProperty("email");
      expect(jwt.decode(tokens.RefreshToken)).toHaveProperty(
        "email",
        attributeValue("email", user.Attributes)
      );
    });

    describe.each([
      "acr",
      "amr",
      "aud",
      "at_hash",
      "auth_time",
      "azp",
      "cognito:username",
      "exp",
      "iat",
      "identities",
      "iss",
      "jti",
      "nbf",
      "nonce",
      "origin_jti",
      "sub",
      "token_use",
    ])("reserved claim %s", (claim) => {
      it("cannot override a reserved claim", async () => {
        mockTriggers.enabled.mockImplementation((name) => {
          return name === "PreTokenGeneration";
        });
        mockTriggers.preTokenGeneration.mockResolvedValue({
          claimsOverrideDetails: {
            claimsToAddOrOverride: {
              [claim]: "value",
            },
          },
        });

        const tokens = await tokenGenerator.generate(
          MockContext,
          user,
          "clientId",
          "userPoolId",
          { client: "metadata" },
          "RefreshTokens"
        );

        expect(jwt.decode(tokens.IdToken)).not.toMatchObject({
          [claim]: "value",
        });
      });
    });
  });

  describe("TokenGeneration lambda is not configured", () => {
    it("generates the default tokens", async () => {
      mockTriggers.enabled.mockReturnValue(false);

      const tokens = await tokenGenerator.generate(
        MockContext,
        user,
        "clientId",
        "userPoolId",
        { client: "metadata" },
        "RefreshTokens"
      );

      expect(jwt.decode(tokens.AccessToken)).toEqual({
        auth_time: expect.any(Number),
        client_id: "clientId",
        event_id: expect.stringMatching(UUID),
        exp: expect.any(Number),
        iat: expect.any(Number),
        iss: "http://example.com/userPoolId",
        jti: expect.stringMatching(UUID),
        scope: "aws.cognito.signin.user.admin",
        sub: attributeValue("sub", user.Attributes),
        token_use: "access",
        username: user.Username,
      });

      expect(jwt.decode(tokens.IdToken)).toEqual({
        "cognito:username": user.Username,
        aud: "clientId",
        auth_time: expect.any(Number),
        email: attributeValue("email", user.Attributes),
        email_verified: false,
        event_id: expect.stringMatching(UUID),
        exp: expect.any(Number),
        iat: expect.any(Number),
        iss: "http://example.com/userPoolId",
        jti: expect.stringMatching(UUID),
        sub: attributeValue("sub", user.Attributes),
        token_use: "id",
      });

      expect(jwt.decode(tokens.RefreshToken)).toEqual({
        "cognito:username": user.Username,
        email: attributeValue("email", user.Attributes),
        exp: expect.any(Number),
        iat: expect.any(Number),
        iss: "http://example.com/userPoolId",
        jti: expect.stringMatching(UUID),
      });
    });
  });
});
