"use client";

import { useMemo } from "react";
import { Checkbox } from "@/app/_components/ui/checkbox";
import { Label } from "@/app/_components/ui/label";
import cppErrors from "../../../../../data/symbolic/definitions/cpp-errors.json";
import cppWarnings from "../../../../../data/symbolic/definitions/cpp-warnings.json";

type RuleDefinition = {
  display_name?: string;
  severity?: string;
};

type RuleDictionary = {
  definitions?: Record<string, RuleDefinition>;
};

interface SymbolicRuleSelectorProps {
  selectedRules: string[];
  onChange: (rules: string[]) => void;
}

export function SymbolicRuleSelector({
  selectedRules,
  onChange,
}: SymbolicRuleSelectorProps) {
  const rules = useMemo(() => {
    const merged: Array<{
      id: string;
      label: string;
      severity: string;
      source: "error" | "warning";
    }> = [];

    const errorDefs = (cppErrors as RuleDictionary).definitions ?? {};
    const warningDefs = (cppWarnings as RuleDictionary).definitions ?? {};

    for (const [id, def] of Object.entries(errorDefs)) {
      merged.push({
        id,
        label: def.display_name ?? id,
        severity: def.severity ?? "Unknown",
        source: "error",
      });
    }

    for (const [id, def] of Object.entries(warningDefs)) {
      merged.push({
        id,
        label: def.display_name ?? id,
        severity: def.severity ?? "Unknown",
        source: "warning",
      });
    }

    return merged.sort((a, b) => a.label.localeCompare(b.label));
  }, []);

  const toggleRule = (ruleId: string, checked: boolean) => {
    if (checked) {
      onChange(Array.from(new Set([...(selectedRules ?? []), ruleId])));
      return;
    }

    onChange((selectedRules ?? []).filter((id) => id !== ruleId));
  };

  return (
    <div className="max-h-72 overflow-y-auto rounded-md border border-border p-3">
      <div className="grid gap-3">
        {rules.map((rule) => {
          const isChecked = (selectedRules ?? []).includes(rule.id);
          return (
            <div key={rule.id} className="flex items-start gap-3">
              <Checkbox
                id={`rule-${rule.id}`}
                checked={isChecked}
                onCheckedChange={(value) => toggleRule(rule.id, Boolean(value))}
              />
              <Label
                htmlFor={`rule-${rule.id}`}
                className="cursor-pointer text-sm leading-relaxed"
              >
                <span className="font-medium text-foreground">
                  {rule.label}
                </span>
                <span className="ml-2 text-xs text-muted-foreground">
                  [{rule.source.toUpperCase()} · {rule.severity}] {rule.id}
                </span>
              </Label>
            </div>
          );
        })}
      </div>
    </div>
  );
}
