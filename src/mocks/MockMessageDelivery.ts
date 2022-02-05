import { MessageDelivery } from "../services/messageDelivery/messageDelivery";

export const MockMessageDelivery = (): jest.Mocked<MessageDelivery> => ({
  deliver: jest.fn(),
});
