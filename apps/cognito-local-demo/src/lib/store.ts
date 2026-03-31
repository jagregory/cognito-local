export interface StatusEntry {
  userId: string;
  username: string;
  displayName: string;
  status: string;
  emoji: string;
  updatedAt: string;
}

const statuses = new Map<string, StatusEntry>();
const history = new Map<string, StatusEntry[]>();

export function getAll(): StatusEntry[] {
  return Array.from(statuses.values());
}

export function getByUser(userId: string): StatusEntry | undefined {
  return statuses.get(userId);
}

export function set(entry: StatusEntry): StatusEntry {
  statuses.set(entry.userId, entry);

  const userHistory = history.get(entry.userId) ?? [];
  userHistory.push({ ...entry });
  history.set(entry.userId, userHistory);

  return entry;
}

export function getHistory(userId: string): StatusEntry[] {
  return history.get(userId) ?? [];
}
