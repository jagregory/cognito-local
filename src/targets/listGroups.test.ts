import { newMockCognitoService } from "../__tests__/mockCognitoService";
import { newMockUserPoolService } from "../__tests__/mockUserPoolService";
import { UserPoolService } from "../services";
import { ListGroups, ListGroupsTarget } from "./listGroups";
import * as TDB from "../__tests__/testDataBuilder";

describe("ListGroups target", () => {
  let listGroups: ListGroupsTarget;
  let mockUserPoolService: jest.Mocked<UserPoolService>;

  beforeEach(() => {
    mockUserPoolService = newMockUserPoolService();
    listGroups = ListGroups({
      cognito: newMockCognitoService(mockUserPoolService),
    });
  });

  it("lists groups", async () => {
    const group1 = TDB.group();
    const group2 = TDB.group();

    mockUserPoolService.listGroups.mockResolvedValue([group1, group2]);

    const output = await listGroups({
      UserPoolId: "userPoolId",
    });

    expect(output).toBeDefined();
    expect(output.Groups).toEqual([
      {
        CreationDate: new Date(group1.CreationDate),
        GroupName: group1.GroupName,
        LastModifiedDate: new Date(group1.LastModifiedDate),
        UserPoolId: "userPoolId",
      },
      {
        CreationDate: new Date(group2.CreationDate),
        GroupName: group2.GroupName,
        LastModifiedDate: new Date(group2.LastModifiedDate),
        UserPoolId: "userPoolId",
      },
    ]);
  });

  it.todo("supports Limit to specify the number of groups to return");
  it.todo("supports PaginationToken to paginate results");
});
