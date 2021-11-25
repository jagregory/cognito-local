import { MessageDelivery } from "../services";

export const newMockMessageDelivery = (): jest.Mocked<MessageDelivery> => ({
  deliver: jest.fn(),
});
