import { type MockedObject, vi } from "vitest";
import type { MessageDelivery } from "../services/messageDelivery/messageDelivery";

export const newMockMessageDelivery = (): MockedObject<MessageDelivery> => ({
  deliver: vi.fn(),
});
