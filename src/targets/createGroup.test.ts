import { ClockFake } from "../__tests__/clockFake";
import { MockUserPoolClient } from "../__tests__/mockUserPoolClient";
import { CognitoClient } from "../services";
import { CreateGroup, CreateGroupTarget } from "./createGroup";

describe("CreateGroup target", () => {
  let createGroup: CreateGroupTarget;
  let mockCognitoClient: jest.Mocked<CognitoClient>;
  let clock: ClockFake;

  const originalDate = new Date(2020, 1, 2, 3, 4, 5);

  beforeEach(() => {
    clock = new ClockFake(originalDate);

    mockCognitoClient = {
      getAppClient: jest.fn(),
      getUserPool: jest.fn().mockResolvedValue(MockUserPoolClient),
      getUserPoolForClientId: jest.fn().mockResolvedValue(MockUserPoolClient),
    };

    createGroup = CreateGroup({
      clock,
      cognitoClient: mockCognitoClient,
    });
  });

  it("creates a group", async () => {
    MockUserPoolClient.getUserByUsername.mockResolvedValue({
      Attributes: [{ Name: "email", Value: "example@example.com" }],
      ConfirmationCode: "4567",
      Enabled: true,
      Password: "pwd",
      UserCreateDate: originalDate.getTime(),
      UserLastModifiedDate: originalDate.getTime(),
      UserStatus: "UNCONFIRMED",
      Username: "0000-0000",
    });

    await createGroup({
      Description: "Description",
      GroupName: "theGroupName",
      Precedence: 1,
      RoleArn: "ARN",
      UserPoolId: "test",
    });

    expect(MockUserPoolClient.saveGroup).toHaveBeenCalledWith({
      CreationDate: originalDate.getTime(),
      Description: "Description",
      GroupName: "theGroupName",
      LastModifiedDate: originalDate.getTime(),
      Precedence: 1,
      RoleArn: "ARN",
    });
  });
});
