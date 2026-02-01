import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getIncrementOptions, getRoundingMethodOptions, type RoundingIncrement, type RoundingMethod } from "@/lib/timeRounding";
import { Clock } from "lucide-react";

interface ClientTimeRoundingSettingsProps {
  enabled: boolean;
  incrementMinutes: number;
  method: string;
  language: 'fr' | 'en';
  onEnabledChange: (enabled: boolean) => void;
  onIncrementChange: (increment: number) => void;
  onMethodChange: (method: string) => void;
}

export function ClientTimeRoundingSettings({
  enabled,
  incrementMinutes,
  method,
  language,
  onEnabledChange,
  onIncrementChange,
  onMethodChange
}: ClientTimeRoundingSettingsProps) {
  const incrementOptions = getIncrementOptions(language === 'fr' ? 'fr' : 'en');
  const methodOptions = getRoundingMethodOptions(language === 'fr' ? 'fr' : 'en');

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-sm font-medium">
            {language === 'fr' ? 'Arrondi du temps' : 'Time Rounding'}
          </CardTitle>
        </div>
        <CardDescription className="text-xs">
          {language === 'fr' 
            ? "S'applique aux entrées de temps créées via le minuteur pour ce client."
            : "Applies to timer-based time entries for this client."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="time-rounding-toggle" className="text-sm">
            {language === 'fr' ? 'Activer l\'arrondi du temps' : 'Enable time rounding'}
          </Label>
          <Switch
            id="time-rounding-toggle"
            checked={enabled}
            onCheckedChange={onEnabledChange}
          />
        </div>

        {enabled && (
          <div className="space-y-3 pt-2 border-t">
            <div className="space-y-2">
              <Label htmlFor="rounding-increment" className="text-sm">
                {language === 'fr' ? 'Incrément' : 'Increment'}
              </Label>
              <Select
                value={String(incrementMinutes)}
                onValueChange={(value) => onIncrementChange(Number(value))}
              >
                <SelectTrigger id="rounding-increment">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {incrementOptions.map(option => (
                    <SelectItem key={option.value} value={String(option.value)}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rounding-method" className="text-sm">
                {language === 'fr' ? 'Méthode' : 'Method'}
              </Label>
              <Select
                value={method}
                onValueChange={onMethodChange}
              >
                <SelectTrigger id="rounding-method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {methodOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
