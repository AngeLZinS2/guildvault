export type VerificationFilter = "all" | "pending" | "verified";

export const MAX_MONEY_AMOUNT = 1_000_000_000;
export const MONEY_LIMIT_MESSAGE = "Informe um valor maior que zero e de até $1.000.000.000.";

export function calendarDate(value: string): Date {
  return new Date(`${value.slice(0, 10)}T12:00:00`);
}

export function isPositiveAmount(value: string | number): boolean {
  return String(value).trim() !== "" && Number.isFinite(Number(value)) && Number(value) > 0 && Number(value) <= MAX_MONEY_AMOUNT;
}

export function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = calendarDate(value);
  return !Number.isNaN(parsed.getTime()) && localDate(parsed) === value;
}

export function localDate(value = new Date()): string {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

export function matchesVerification(verified: boolean, filter: VerificationFilter): boolean {
  return filter === "all" || (filter === "verified" ? verified : !verified);
}

export function transactionSummary(transactions: { type: string; amount: number }[]) {
  const income = transactions.filter(transaction => transaction.type === "deposit").reduce((total, transaction) => total + transaction.amount, 0);
  const expenses = transactions.filter(transaction => transaction.type === "withdrawal").reduce((total, transaction) => total + transaction.amount, 0);
  return { income, expenses, balance: income - expenses };
}
