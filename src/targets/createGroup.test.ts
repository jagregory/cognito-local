import { MockClock } from "../mocks/MockClock";
import { MockCognitoService } from "../mocks/MockCognitoService";
import { MockUserPoolService } from "../mocks/MockUserPoolService";
import { MockContext } from "../mocks/MockContext";
import { UserPoolService } from "../services";
import { CreateGroup, CreateGroupTarget } from "./createGroup";

const originalDate = new Date();

describe("CreateGroup target", () => {
  let createGroup: CreateGroupTarget;
  let mockUserPoolService: jest.Mocked<UserPoolService>;

  beforeEach(() => {
    mockUserPoolService = MockUserPoolService();
    createGroup = CreateGroup({
      clock: new MockClock(originalDate),
      cognito: MockCognitoService(mockUserPoolService),
    });
  });

  it("creates a group", async () => {
    await createGroup(MockContext, {
      Description: "Description",
      GroupName: "theGroupName",
      Precedence: 1,
      RoleArn: "ARN",
      UserPoolId: "test",
    });

    expect(mockUserPoolService.saveGroup).toHaveBeenCalledWith(MockContext, {
      CreationDate: originalDate,
      Description: "Description",
      GroupName: "theGroupName",
      LastModifiedDate: originalDate,
      Precedence: 1,
      RoleArn: "ARN",
    });
  });
});
