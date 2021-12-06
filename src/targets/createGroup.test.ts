import { ClockFake } from "../__tests__/clockFake";
import { newMockCognitoService } from "../__tests__/mockCognitoService";
import { newMockUserPoolService } from "../__tests__/mockUserPoolService";
import { TestContext } from "../__tests__/testContext";
import { UserPoolService } from "../services";
import { CreateGroup, CreateGroupTarget } from "./createGroup";

const originalDate = new Date();

describe("CreateGroup target", () => {
  let createGroup: CreateGroupTarget;
  let mockUserPoolService: jest.Mocked<UserPoolService>;

  beforeEach(() => {
    mockUserPoolService = newMockUserPoolService();
    createGroup = CreateGroup({
      clock: new ClockFake(originalDate),
      cognito: newMockCognitoService(mockUserPoolService),
    });
  });

  it("creates a group", async () => {
    await createGroup(TestContext, {
      Description: "Description",
      GroupName: "theGroupName",
      Precedence: 1,
      RoleArn: "ARN",
      UserPoolId: "test",
    });

    expect(mockUserPoolService.saveGroup).toHaveBeenCalledWith(TestContext, {
      CreationDate: originalDate,
      Description: "Description",
      GroupName: "theGroupName",
      LastModifiedDate: originalDate,
      Precedence: 1,
      RoleArn: "ARN",
    });
  });
});
