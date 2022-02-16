import { newMockCognitoService } from "../__tests__/mockCognitoService";
import { newMockUserPoolService } from "../__tests__/mockUserPoolService";
import { TestContext } from "../__tests__/testContext";
import * as TDB from "../__tests__/testDataBuilder";
import { GroupNotFoundError } from "../errors";
import { UserPoolService } from "../services";
import { GetGroup, GetGroupTarget } from "./getGroup";

describe("GetGroup target", () => {
  let getGroup: GetGroupTarget;
  let mockUserPoolService: jest.Mocked<UserPoolService>;

  beforeEach(() => {
    mockUserPoolService = newMockUserPoolService();

    getGroup = GetGroup({
      cognito: newMockCognitoService(mockUserPoolService),
    });
  });

  it("gets a group", async () => {
    const existingGroup = TDB.group();

    mockUserPoolService.getGroupByGroupName.mockResolvedValue(existingGroup);

    const result = await getGroup(TestContext, {
      GroupName: existingGroup.GroupName,
      UserPoolId: "test",
    });

    expect(mockUserPoolService.getGroupByGroupName).toHaveBeenCalledWith(
      TestContext,
      existingGroup.GroupName
    );

    expect(result.Group).toEqual({
      CreationDate: existingGroup.CreationDate,
      Description: existingGroup.Description,
      GroupName: existingGroup.GroupName,
      LastModifiedDate: existingGroup.LastModifiedDate,
      RoleArn: existingGroup.RoleArn,
      UserPoolId: "test",
    });
  });

  it("throws if the group doesn't exist", async () => {
    mockUserPoolService.getGroupByGroupName.mockResolvedValue(null);

    await expect(
      getGroup(TestContext, {
        GroupName: "group",
        UserPoolId: "test",
      })
    ).rejects.toEqual(new GroupNotFoundError());
  });
});
