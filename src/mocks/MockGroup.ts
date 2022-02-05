import { Group } from "../services/userPoolService";
import { id } from "./";

export const MockGroup = (partial?: Partial<Group>): Group => ({
  CreationDate: partial?.CreationDate ?? new Date(),
  Description: partial?.Description ?? undefined,
  GroupName: partial?.GroupName ?? id("Group"),
  LastModifiedDate: partial?.LastModifiedDate ?? new Date(),
  Precedence: partial?.Precedence ?? undefined,
  RoleArn: partial?.RoleArn ?? undefined,
});
