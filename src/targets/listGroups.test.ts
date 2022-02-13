import { MockCognitoService } from "../mocks/MockCognitoService";
import { MockUserPoolService } from "../mocks/MockUserPoolService";
import { MockContext } from "../mocks/MockContext";
import { UserPoolService } from "../services";
import { ListGroups, ListGroupsTarget } from "./listGroups";
import { GroupModel } from "../models/GroupModel";

describe("ListGroups target", () => {
  let listGroups: ListGroupsTarget;
  let mockUserPoolService: jest.Mocked<UserPoolService>;

  beforeEach(() => {
    mockUserPoolService = MockUserPoolService();
    listGroups = ListGroups({
      cognito: MockCognitoService(mockUserPoolService),
    });
  });

  it("lists groups", async () => {
    const group1 = GroupModel();
    const group2 = GroupModel();

    mockUserPoolService.listGroups.mockResolvedValue([group1, group2]);

    const output = await listGroups(MockContext, {
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
