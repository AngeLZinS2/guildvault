
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfDay, endOfDay, subWeeks, subMonths, isWithinInterval } from "date-fns";
import { calendarDate } from "./financeContent";

export interface Transaction {
  id: string;
  type: string;
  amount: number;
  member_name: string;
  description?: string;
  date: string;
  verified: boolean;
  proof_url?: string | null;
  verifier_name?: string;
}

export const filterTransactionsByDate = (
  transactions: Transaction[],
  dateFilter: string,
  customDateRange?: { from: Date | undefined; to: Date | undefined }
): Transaction[] => {
  if (dateFilter === "all") {
    return transactions;
  }

  const now = new Date();
  let startDate: Date;
  let endDate: Date;

  switch (dateFilter) {
    case "this-week":
      startDate = startOfWeek(now, { weekStartsOn: 1 }); // Segunda-feira
      endDate = endOfWeek(now, { weekStartsOn: 1 }); // Domingo
      break;
    case "last-week": {
      const lastWeek = subWeeks(now, 1);
      startDate = startOfWeek(lastWeek, { weekStartsOn: 1 });
      endDate = endOfWeek(lastWeek, { weekStartsOn: 1 });
      break;
    }
    case "this-month":
      startDate = startOfMonth(now);
      endDate = endOfMonth(now);
      break;
    case "last-month": {
      const lastMonth = subMonths(now, 1);
      startDate = startOfMonth(lastMonth);
      endDate = endOfMonth(lastMonth);
      break;
    }
    case "custom":
      if (!customDateRange?.from || !customDateRange?.to) {
        return transactions;
      }
      startDate = startOfDay(customDateRange.from);
      endDate = endOfDay(customDateRange.to);
      break;
    default:
      return transactions;
  }

  return transactions.filter((transaction) => {
    if (!transaction.date) return false;
    if (startDate > endDate) return false;
    const transactionDate = calendarDate(transaction.date);
    return isWithinInterval(transactionDate, { start: startDate, end: endDate });
  });
};
