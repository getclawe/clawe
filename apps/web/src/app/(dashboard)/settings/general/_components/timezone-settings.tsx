"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@clawe/backend";
import { TIMEZONE_OPTIONS, DEFAULT_TIMEZONE } from "@clawe/shared/timezone";
import { Label } from "@clawe/ui/components/label";
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxGroup,
  ComboboxLabel,
  ComboboxEmpty,
} from "@clawe/ui/components/combobox";
import { Skeleton } from "@clawe/ui/components/skeleton";

export const TimezoneSettings = () => {
  const timezone = useQuery(api.tenants.getTimezone, {});
  const setTimezone = useMutation(api.tenants.setTimezone);
  const [search, setSearch] = useState("");

  // Filter and group timezones
  const groupedTimezones = useMemo(() => {
    const searchLower = search.toLowerCase();
    const filtered = search
      ? TIMEZONE_OPTIONS.filter(
          (tz) =>
            tz.label.toLowerCase().includes(searchLower) ||
            tz.value.toLowerCase().includes(searchLower) ||
            tz.group.toLowerCase().includes(searchLower),
        )
      : TIMEZONE_OPTIONS;

    const groups: Record<string, typeof TIMEZONE_OPTIONS> = {};
    for (const tz of filtered) {
      const group = groups[tz.group];
      if (!group) {
        groups[tz.group] = [tz];
      } else {
        group.push(tz);
      }
    }
    return groups;
  }, [search]);

  // Get selected timezone label
  const selectedLabel = useMemo(() => {
    const selected = TIMEZONE_OPTIONS.find(
      (tz) => tz.value === (timezone ?? DEFAULT_TIMEZONE),
    );
    return selected
      ? `${selected.label} (${selected.group})`
      : "Select timezone";
  }, [timezone]);

  if (timezone === undefined) {
    return <TimezoneSettingsSkeleton />;
  }

  const handleTimezoneChange = (value: string | null) => {
    if (value) {
      setTimezone({ timezone: value });
      setSearch("");
    }
  };

  const hasResults = Object.keys(groupedTimezones).length > 0;

  return (
    <div className="space-y-2">
      <Label>Timezone</Label>
      <Combobox
        value={timezone ?? DEFAULT_TIMEZONE}
        onValueChange={handleTimezoneChange}
      >
        <ComboboxInput
          placeholder={selectedLabel}
          className="w-full max-w-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <ComboboxContent>
          <ComboboxList>
            {!hasResults && <ComboboxEmpty>No timezone found.</ComboboxEmpty>}
            {Object.entries(groupedTimezones).map(([group, timezones]) => (
              <ComboboxGroup key={group}>
                <ComboboxLabel>{group}</ComboboxLabel>
                {timezones.map((tz) => (
                  <ComboboxItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </ComboboxItem>
                ))}
              </ComboboxGroup>
            ))}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
      <p className="text-muted-foreground text-sm">
        Used for scheduling routines and displaying times across the dashboard.
      </p>
    </div>
  );
};

const TimezoneSettingsSkeleton = () => {
  return (
    <div className="space-y-2">
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-10 w-full max-w-sm" />
      <Skeleton className="h-4 w-64" />
    </div>
  );
};
