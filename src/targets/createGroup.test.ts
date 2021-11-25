import { ClockFake } from "../__tests__/clockFake";
import { newMockCognitoClient } from "../__tests__/mockCognitoClient";
import { newMockUserPoolClient } from "../__tests__/mockUserPoolClient";
import { UserPoolClient } from "../services";
import { CreateGroup, CreateGroupTarget } from "./createGroup";

const originalDate = new Date();

describe("CreateGroup target", () => {
  let createGroup: CreateGroupTarget;
  let mockUserPoolClient: jest.Mocked<UserPoolClient>;

  beforeEach(() => {
    mockUserPoolClient = newMockUserPoolClient();
    createGroup = CreateGroup({
      clock: new ClockFake(originalDate),
      cognitoClient: newMockCognitoClient(mockUserPoolClient),
    });
  });

  it("creates a group", async () => {
    await createGroup({
      Description: "Description",
      GroupName: "theGroupName",
      Precedence: 1,
      RoleArn: "ARN",
      UserPoolId: "test",
    });

    expect(mockUserPoolClient.saveGroup).toHaveBeenCalledWith({
      CreationDate: originalDate.getTime(),
      Description: "Description",
      GroupName: "theGroupName",
      LastModifiedDate: originalDate.getTime(),
      Precedence: 1,
      RoleArn: "ARN",
    });
  });
});
