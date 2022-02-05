import { TokenGenerator } from "../services/tokenGenerator";

export const MockTokenGenerator = (): jest.Mocked<TokenGenerator> => ({
  generate: jest.fn(),
});
