import { Messages } from "../services";

export const newMockMessages = (): jest.Mocked<Messages> => ({
  authentication: jest.fn(),
  forgotPassword: jest.fn(),
  signUp: jest.fn(),
});
