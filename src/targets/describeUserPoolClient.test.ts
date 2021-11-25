import { newMockCognitoService } from "../__tests__/mockCognitoService";
import { newMockUserPoolService } from "../__tests__/mockUserPoolService";
import { ResourceNotFoundError } from "../errors";
import { CognitoService } from "../services";
import { AppClient } from "../services/appClient";
import {
  DescribeUserPoolClient,
  DescribeUserPoolClientTarget,
} from "./describeUserPoolClient";

describe("DescribeUserPoolClient target", () => {
  let describeUserPoolClient: DescribeUserPoolClientTarget;
  let mockCognitoService: jest.Mocked<CognitoService>;

  beforeEach(() => {
    mockCognitoService = newMockCognitoService(newMockUserPoolService());
    describeUserPoolClient = DescribeUserPoolClient({
      cognito: mockCognitoService,
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
    mockCognitoService.getAppClient.mockResolvedValue(existingAppClient);

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
    mockCognitoService.getAppClient.mockResolvedValue(null);

    await expect(
      describeUserPoolClient({
        ClientId: "abc",
        UserPoolId: "userPoolId",
      })
    ).rejects.toEqual(new ResourceNotFoundError());
  });
});
