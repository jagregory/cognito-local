import { MessageDelivery } from "../services/messageDelivery/messageDelivery";

export const newMockMessageDelivery = (): jest.Mocked<MessageDelivery> => ({
  deliver: jest.fn(),
});
