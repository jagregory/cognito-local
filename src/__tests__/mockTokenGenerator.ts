import { TokenGenerator } from "../services/tokenGenerator";

export const newMockTokenGenerator = (): jest.Mocked<TokenGenerator> => ({
  generate: jest.fn(),
});
