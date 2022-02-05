import { Lambda } from "../services";

export const MockLambda = (): jest.Mocked<Lambda> => ({
  enabled: jest.fn(),
  invoke: jest.fn(),
});
