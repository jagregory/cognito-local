import { advanceTo } from "jest-date-mock";
import { CognitoClient, UserPoolClient } from "../services";
import { AppClient } from "../services/appClient";
import {
  CreateUserPoolClient,
  CreateUserPoolClientTarget,
} from "./createUserPoolClient";

describe("CreateUserPoolClient target", () => {
  let createUserPoolClient: CreateUserPoolClientTarget;
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

    createUserPoolClient = CreateUserPoolClient({
      cognitoClient: mockCognitoClient,
    });
  });

  it("creates a new app client", async () => {
    const createdAppClient: AppClient = {
      RefreshTokenValidity: 30,
      AllowedOAuthFlowsUserPoolClient: false,
      LastModifiedDate: Math.floor(new Date().getTime() / 1000),
      CreationDate: Math.floor(new Date().getTime() / 1000),
      UserPoolId: "userPoolId",
      ClientId: "abc",
      ClientName: "clientName",
    };
    mockUserPoolClient.createAppClient.mockResolvedValue(createdAppClient);

    const result = await createUserPoolClient({
      ClientName: "clientName",
      UserPoolId: "userPoolId",
    });

    expect(mockUserPoolClient.createAppClient).toHaveBeenCalledWith(
      "clientName"
    );

    expect(result).toEqual({ UserPoolClient: createdAppClient });
  });
});
