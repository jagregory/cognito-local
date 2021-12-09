import { Messages } from "../services";

export const newMockMessages = (): jest.Mocked<Messages> => ({
  deliver: jest.fn(),
});
