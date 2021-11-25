import { newMockCognitoService } from "../__tests__/mockCognitoService";
import { newMockUserPoolService } from "../__tests__/mockUserPoolService";
import { UserPoolService } from "../services";
import { AppClient } from "../services/appClient";
import {
  CreateUserPoolClient,
  CreateUserPoolClientTarget,
} from "./createUserPoolClient";

describe("CreateUserPoolClient target", () => {
  let createUserPoolClient: CreateUserPoolClientTarget;
  let mockUserPoolService: jest.Mocked<UserPoolService>;

  beforeEach(() => {
    mockUserPoolService = newMockUserPoolService();
    createUserPoolClient = CreateUserPoolClient({
      cognito: newMockCognitoService(mockUserPoolService),
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
    mockUserPoolService.createAppClient.mockResolvedValue(createdAppClient);

    const result = await createUserPoolClient({
      ClientName: "clientName",
      UserPoolId: "userPoolId",
    });

    expect(mockUserPoolService.createAppClient).toHaveBeenCalledWith(
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
