import { newMockCognitoClient } from "../__tests__/mockCognitoClient";
import { newMockUserPoolClient } from "../__tests__/mockUserPoolClient";
import { UserPoolClient } from "../services";
import { AppClient } from "../services/appClient";
import {
  CreateUserPoolClient,
  CreateUserPoolClientTarget,
} from "./createUserPoolClient";

describe("CreateUserPoolClient target", () => {
  let createUserPoolClient: CreateUserPoolClientTarget;
  let mockUserPoolClient: jest.Mocked<UserPoolClient>;

  beforeEach(() => {
    mockUserPoolClient = newMockUserPoolClient();
    createUserPoolClient = CreateUserPoolClient({
      cognitoClient: newMockCognitoClient(mockUserPoolClient),
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
    mockUserPoolClient.createAppClient.mockResolvedValue(createdAppClient);

    const result = await createUserPoolClient({
      ClientName: "clientName",
      UserPoolId: "userPoolId",
    });

    expect(mockUserPoolClient.createAppClient).toHaveBeenCalledWith(
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
