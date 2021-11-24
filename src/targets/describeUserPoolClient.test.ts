import { advanceTo } from "jest-date-mock";
import { ResourceNotFoundError } from "../errors";
import { CognitoClient, UserPoolClient } from "../services";
import { AppClient } from "../services/appClient";
import {
  DescribeUserPoolClient,
  DescribeUserPoolClientTarget,
} from "./describeUserPoolClient";

describe("DescribeUserPoolClient target", () => {
  let describeUserPoolClient: DescribeUserPoolClientTarget;
  let mockCognitoClient: jest.Mocked<CognitoClient>;
  let mockUserPoolClient: jest.Mocked<UserPoolClient>;
  let now: Date;

  beforeEach(() => {
    now = new Date(2020, 1, 2, 3, 4, 5);
    advanceTo(now);

    mockUserPoolClient = {
      config: {
        Id: "test",
      },
      createAppClient: jest.fn(),
      getUserByUsername: jest.fn(),
      listUsers: jest.fn(),
      saveUser: jest.fn(),
    };
    mockCognitoClient = {
      getAppClient: jest.fn(),
      getUserPool: jest.fn().mockResolvedValue(mockUserPoolClient),
      getUserPoolForClientId: jest.fn().mockResolvedValue(mockUserPoolClient),
    };

    describeUserPoolClient = DescribeUserPoolClient({
      cognitoClient: mockCognitoClient,
    });
  });

  it("returns an existing app client", async () => {
    const existingAppClient: AppClient = {
      RefreshTokenValidity: 30,
      AllowedOAuthFlowsUserPoolClient: false,
      LastModifiedDate: new Date().getTime(),
      CreationDate: new Date().getTime(),
      UserPoolId: "userPoolId",
      ClientId: "abc",
      ClientName: "clientName",
    };
    mockCognitoClient.getAppClient.mockResolvedValue(existingAppClient);

    const result = await describeUserPoolClient({
      ClientId: "abc",
      UserPoolId: "userPoolId",
    });

    expect(result).toEqual({
      UserPoolClient: {
        ...existingAppClient,
        CreationDate: new Date(existingAppClient.CreationDate),
        LastModifiedDate: new Date(existingAppClient.LastModifiedDate),
      },
    });
  });

  it("throws resource not found for an invalid app client", async () => {
    mockCognitoClient.getAppClient.mockResolvedValue(null);

    await expect(
      describeUserPoolClient({
        ClientId: "abc",
        UserPoolId: "userPoolId",
      })
    ).rejects.toEqual(new ResourceNotFoundError());
  });
});
