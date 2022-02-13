import { Messages } from "../services";

export const MockMessages = (): jest.Mocked<Messages> => ({
  deliver: jest.fn(),
});
