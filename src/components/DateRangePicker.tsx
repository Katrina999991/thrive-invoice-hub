import * as React from "react"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DateRangePickerProps {
  startDate?: Date
  endDate?: Date
  onStartDateChange: (date: Date | undefined) => void
  onEndDateChange: (date: Date | undefined) => void
  className?: string
  t?: (key: string) => string
}

export function DateRangePicker({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  className,
  t = (key: string) => key
}: DateRangePickerProps) {
  const [startDateOpen, setStartDateOpen] = React.useState(false);
  const [endDateOpen, setEndDateOpen] = React.useState(false);

  return (
    <div className={cn("flex w-full max-w-full min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap", className)}>
      <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "w-full min-w-0 justify-start overflow-hidden text-left font-normal whitespace-nowrap",
              !startDate && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
            <span className="truncate">
              {startDate ? format(startDate, "dd/MM/yyyy") : t("reports.revenue.startDate")}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[min(calc(100vw-2rem),22rem)] max-w-[calc(100vw-2rem)] p-0" align="start">
          <Calendar
            mode="single"
            selected={startDate}
            onSelect={(date) => {
              onStartDateChange(date);
              setStartDateOpen(false);
            }}
            initialFocus
            className="w-full p-3 pointer-events-auto"
          />
        </PopoverContent>
      </Popover>

      <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "w-full min-w-0 justify-start overflow-hidden text-left font-normal whitespace-nowrap",
              !endDate && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
            <span className="truncate">
              {endDate ? format(endDate, "dd/MM/yyyy") : t("reports.revenue.endDate")}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[min(calc(100vw-2rem),22rem)] max-w-[calc(100vw-2rem)] p-0" align="start">
          <Calendar
            mode="single"
            selected={endDate}
            onSelect={(date) => {
              onEndDateChange(date);
              setEndDateOpen(false);
            }}
            initialFocus
            className="w-full p-3 pointer-events-auto"
            disabled={(date) => startDate ? date < startDate : false}
          />
        </PopoverContent>
      </Popover>

      {(startDate || endDate) && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full sm:w-auto"
          onClick={() => {
            onStartDateChange(undefined)
            onEndDateChange(undefined)
          }}
        >
          {t("reports.revenue.clear")}
        </Button>
      )}
    </div>
  )
}