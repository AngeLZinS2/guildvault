
import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface DateFilterProps {
  dateFilter: string;
  onDateFilterChange: (value: string) => void;
  customDateRange: { from: Date | undefined; to: Date | undefined };
  onCustomDateRangeChange: (range: { from: Date | undefined; to: Date | undefined }) => void;
}

export const DateFilter: React.FC<DateFilterProps> = ({
  dateFilter,
  onDateFilterChange,
  customDateRange,
  onCustomDateRangeChange,
}) => {
  return (
    <div className="flex gap-2 items-center">
      <Select value={dateFilter} onValueChange={onDateFilterChange}>
        <SelectTrigger className="w-full sm:w-48">
          <SelectValue placeholder="Filtrar por período" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas as datas</SelectItem>
          <SelectItem value="this-week">Esta semana</SelectItem>
          <SelectItem value="last-week">Semana passada</SelectItem>
          <SelectItem value="this-month">Este mês</SelectItem>
          <SelectItem value="last-month">Mês passado</SelectItem>
          <SelectItem value="custom">Período personalizado</SelectItem>
        </SelectContent>
      </Select>
      
      {dateFilter === "custom" && (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-[280px] justify-start text-left font-normal",
                !customDateRange.from && !customDateRange.to && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {customDateRange.from ? (
                customDateRange.to ? (
                  <>
                    {format(customDateRange.from, "dd/MM/yyyy")} -{" "}
                    {format(customDateRange.to, "dd/MM/yyyy")}
                  </>
                ) : (
                  format(customDateRange.from, "dd/MM/yyyy")
                )
              ) : (
                <span>Selecionar período</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={customDateRange.from}
              selected={{
                from: customDateRange.from,
                to: customDateRange.to,
              }}
              onSelect={(range) => {
                onCustomDateRangeChange({
                  from: range?.from,
                  to: range?.to,
                });
              }}
              numberOfMonths={2}
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
};
