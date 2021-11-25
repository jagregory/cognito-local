import { DataStore } from "../services/dataStore";

export const newMockDataStore = (): jest.Mocked<DataStore> => ({
  delete: jest.fn(),
  get: jest.fn(),
  getRoot: jest.fn(),
  set: jest.fn(),
});
