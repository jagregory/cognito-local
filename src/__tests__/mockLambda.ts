import { Lambda } from "../services";

export const newMockLambda = (): jest.Mocked<Lambda> => ({
  enabled: jest.fn(),
  getInvokeMetod: jest.fn(),
  invoke: jest.fn(),
});
