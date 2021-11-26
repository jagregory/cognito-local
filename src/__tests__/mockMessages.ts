import { Messages } from "../services";

export const newMockMessages = (): jest.Mocked<Messages> => ({
  adminCreateUser: jest.fn(),
  authentication: jest.fn(),
  forgotPassword: jest.fn(),
  signUp: jest.fn(),
});
