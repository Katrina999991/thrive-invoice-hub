import * as React from "react"
import { format } from "date-fns"
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface MonthYearPickerProps {
  selectedDate?: Date
  onDateChange: (date: Date | undefined) => void
  mode: 'month' | 'year'
  className?: string
}

export function MonthYearPicker({
  selectedDate,
  onDateChange,
  mode,
  className
}: MonthYearPickerProps) {
  const [open, setOpen] = React.useState(false)
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 10 }, (_, i) => currentYear - 5 + i)
  
  const months = [
    { value: 0, label: 'January' },
    { value: 1, label: 'February' },
    { value: 2, label: 'March' },
    { value: 3, label: 'April' },
    { value: 4, label: 'May' },
    { value: 5, label: 'June' },
    { value: 6, label: 'July' },
    { value: 7, label: 'August' },
    { value: 8, label: 'September' },
    { value: 9, label: 'October' },
    { value: 10, label: 'November' },
    { value: 11, label: 'December' },
  ]

  const handleYearChange = (year: string) => {
    if (mode === 'year') {
      onDateChange(new Date(parseInt(year), 0, 1))
      setOpen(false)
    } else {
      const currentMonth = selectedDate?.getMonth() || 0
      onDateChange(new Date(parseInt(year), currentMonth, 1))
      // Ne pas fermer si c'est mode month car l'utilisateur doit encore choisir un mois
    }
  }

  const handleMonthChange = (month: string) => {
    const currentYear = selectedDate?.getFullYear() || new Date().getFullYear()
    onDateChange(new Date(currentYear, parseInt(month), 1))
    setOpen(false)
  }

  const navigateYear = (direction: 'prev' | 'next') => {
    const currentYear = selectedDate?.getFullYear() || new Date().getFullYear()
    const newYear = direction === 'prev' ? currentYear - 1 : currentYear + 1
    
    if (mode === 'year') {
      onDateChange(new Date(newYear, 0, 1))
    } else {
      const currentMonth = selectedDate?.getMonth() || 0
      onDateChange(new Date(newYear, currentMonth, 1))
    }
  }

  const getDisplayText = () => {
    if (!selectedDate) {
      return mode === 'month' ? 'Choose a month' : 'Choose a year'
    }
    
    if (mode === 'month') {
      return format(selectedDate, 'MMMM yyyy')
    } else {
      return format(selectedDate, 'yyyy')
    }
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "justify-start text-left font-normal",
              !selectedDate && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {getDisplayText()}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-4" align="start">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigateYear('prev')}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex gap-2">
              <Select
                value={(selectedDate?.getFullYear() || currentYear).toString()}
                onValueChange={handleYearChange}
              >
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {mode === 'month' && (
                <Select
                  value={(selectedDate?.getMonth() || 0).toString()}
                  onValueChange={handleMonthChange}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((month) => (
                      <SelectItem key={month.value} value={month.value.toString()}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigateYear('next')}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {selectedDate && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDateChange(undefined)}
        >
          Clear
        </Button>
      )}
    </div>
  )
}