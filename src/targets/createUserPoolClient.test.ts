import { MockCognitoService } from "../mocks/MockCognitoService";
import { MockUserPoolService } from "../mocks/MockUserPoolService";
import { MockContext } from "../mocks/MockContext";
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
    mockUserPoolService = MockUserPoolService();
    createUserPoolClient = CreateUserPoolClient({
      cognito: MockCognitoService(mockUserPoolService),
    });
  });

  it("creates a new app client", async () => {
    const createdAppClient: AppClient = {
      RefreshTokenValidity: 30,
      AllowedOAuthFlowsUserPoolClient: false,
      LastModifiedDate: new Date(),
      CreationDate: new Date(),
      UserPoolId: "userPoolId",
      ClientId: "abc",
      ClientName: "clientName",
    };
    mockUserPoolService.createAppClient.mockResolvedValue(createdAppClient);

    const result = await createUserPoolClient(MockContext, {
      ClientName: "clientName",
      UserPoolId: "userPoolId",
    });

    expect(mockUserPoolService.createAppClient).toHaveBeenCalledWith(
      MockContext,
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
