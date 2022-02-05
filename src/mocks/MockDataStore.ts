import { DataStore } from "../services/dataStore/dataStore";
import { DataStoreFactory } from "../services/dataStore/factory";

export const MockDataStore = (): jest.Mocked<DataStore> => ({
  delete: jest.fn(),
  get: jest.fn(),
  getRoot: jest.fn(),
  set: jest.fn(),
});

export const MockDataStoreFactory = (
  dataStore: jest.Mocked<DataStore> = MockDataStore()
): jest.Mocked<DataStoreFactory> => ({
  create: jest.fn().mockResolvedValue(dataStore),
});
