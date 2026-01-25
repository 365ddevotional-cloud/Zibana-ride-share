import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X } from "lucide-react";

interface TripFilterBarProps {
  status: string;
  onStatusChange: (status: string) => void;
  startDate: string;
  onStartDateChange: (date: string) => void;
  endDate: string;
  onEndDateChange: (date: string) => void;
  driverId?: string;
  onDriverIdChange?: (id: string) => void;
  riderId?: string;
  onRiderIdChange?: (id: string) => void;
  drivers?: Array<{ userId: string; fullName: string }>;
  riders?: Array<{ id: string; fullName?: string }>;
  showDriverFilter?: boolean;
  showRiderFilter?: boolean;
  onClear: () => void;
}

export function TripFilterBar({
  status,
  onStatusChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  driverId,
  onDriverIdChange,
  riderId,
  onRiderIdChange,
  drivers,
  riders,
  showDriverFilter = false,
  showRiderFilter = false,
  onClear,
}: TripFilterBarProps) {
  const hasFilters = status || startDate || endDate || driverId || riderId;

  return (
    <div className="flex flex-wrap items-center gap-3 p-4 bg-muted/50 rounded-lg">
      <Select value={status} onValueChange={onStatusChange}>
        <SelectTrigger className="w-[160px]" data-testid="select-status-filter">
          <SelectValue placeholder="All statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          <SelectItem value="requested">Requested</SelectItem>
          <SelectItem value="accepted">Accepted</SelectItem>
          <SelectItem value="in_progress">In Progress</SelectItem>
          <SelectItem value="completed">Completed</SelectItem>
          <SelectItem value="cancelled">Cancelled</SelectItem>
        </SelectContent>
      </Select>

      <div className="flex items-center gap-2">
        <Input
          type="date"
          value={startDate}
          onChange={(e) => onStartDateChange(e.target.value)}
          className="w-[150px]"
          data-testid="input-start-date"
          placeholder="Start date"
        />
        <span className="text-muted-foreground">to</span>
        <Input
          type="date"
          value={endDate}
          onChange={(e) => onEndDateChange(e.target.value)}
          className="w-[150px]"
          data-testid="input-end-date"
          placeholder="End date"
        />
      </div>

      {showDriverFilter && drivers && onDriverIdChange && (
        <Select value={driverId || "all"} onValueChange={(v) => onDriverIdChange(v === "all" ? "" : v)}>
          <SelectTrigger className="w-[180px]" data-testid="select-driver-filter">
            <SelectValue placeholder="All drivers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All drivers</SelectItem>
            {drivers.map((driver) => (
              <SelectItem key={driver.userId} value={driver.userId}>
                {driver.fullName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {showRiderFilter && riders && onRiderIdChange && (
        <Select value={riderId || "all"} onValueChange={(v) => onRiderIdChange(v === "all" ? "" : v)}>
          <SelectTrigger className="w-[180px]" data-testid="select-rider-filter">
            <SelectValue placeholder="All riders" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All riders</SelectItem>
            {riders.map((rider) => (
              <SelectItem key={rider.id} value={rider.id}>
                {rider.fullName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="gap-1"
          data-testid="button-clear-filters"
        >
          <X className="h-4 w-4" />
          Clear
        </Button>
      )}
    </div>
  );
}
