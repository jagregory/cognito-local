import { type MockedObject, vi } from "vitest";
import type { DataStore } from "../services/dataStore/dataStore";
import type { DataStoreFactory } from "../services/dataStore/factory";

export const newMockDataStore = (): MockedObject<DataStore> => ({
  delete: vi.fn(),
  // biome-ignore lint/suspicious/noExplicitAny: overloaded function
  get: vi.fn() as any,
  // biome-ignore lint/suspicious/noExplicitAny: overloaded function
  getRoot: vi.fn() as any,
  set: vi.fn(),
});

export const newMockDataStoreFactory = (
  dataStore: MockedObject<DataStore> = newMockDataStore(),
): MockedObject<DataStoreFactory> => ({
  create: vi.fn().mockResolvedValue(dataStore),
});
