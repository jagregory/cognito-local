import { advanceTo } from "jest-date-mock";
import { MockUserPoolClient } from "../__tests__/mockUserPoolClient";
import { CognitoClient } from "../services";
import { AppClient } from "../services/appClient";
import {
  CreateUserPoolClient,
  CreateUserPoolClientTarget,
} from "./createUserPoolClient";

describe("CreateUserPoolClient target", () => {
  let createUserPoolClient: CreateUserPoolClientTarget;
  let mockCognitoClient: jest.Mocked<CognitoClient>;
  let now: Date;

  beforeEach(() => {
    now = new Date(2020, 1, 2, 3, 4, 5);
    advanceTo(now);

    mockCognitoClient = {
      getAppClient: jest.fn(),
      getUserPool: jest.fn().mockResolvedValue(MockUserPoolClient),
      getUserPoolForClientId: jest.fn().mockResolvedValue(MockUserPoolClient),
    };

    createUserPoolClient = CreateUserPoolClient({
      cognitoClient: mockCognitoClient,
    });
  });

  it("creates a new app client", async () => {
    const createdAppClient: AppClient = {
      RefreshTokenValidity: 30,
      AllowedOAuthFlowsUserPoolClient: false,
      LastModifiedDate: new Date().getTime(),
      CreationDate: new Date().getTime(),
      UserPoolId: "userPoolId",
      ClientId: "abc",
      ClientName: "clientName",
    };
    MockUserPoolClient.createAppClient.mockResolvedValue(createdAppClient);

    const result = await createUserPoolClient({
      ClientName: "clientName",
      UserPoolId: "userPoolId",
    });

    expect(MockUserPoolClient.createAppClient).toHaveBeenCalledWith(
      "clientName"
    );

    expect(result).toEqual({
      UserPoolClient: {
        ...createdAppClient,
        LastModifiedDate: new Date(createdAppClient.LastModifiedDate),
        CreationDate: new Date(createdAppClient.CreationDate),
      },
    });
  });
});
