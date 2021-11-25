import { newMockCognitoClient } from "../__tests__/mockCognitoClient";
import { newMockUserPoolClient } from "../__tests__/mockUserPoolClient";
import { ResourceNotFoundError } from "../errors";
import { CognitoClient } from "../services";
import { AppClient } from "../services/appClient";
import {
  DescribeUserPoolClient,
  DescribeUserPoolClientTarget,
} from "./describeUserPoolClient";

describe("DescribeUserPoolClient target", () => {
  let describeUserPoolClient: DescribeUserPoolClientTarget;
  let mockCognitoClient: jest.Mocked<CognitoClient>;

  beforeEach(() => {
    const mockUserPoolClient = newMockUserPoolClient();
    mockCognitoClient = newMockCognitoClient(mockUserPoolClient);
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
