import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertTriangle, Shield, Smartphone, Eye, Accessibility, ChevronDown, ChevronRight } from "lucide-react";
import {
  storeComplianceChecklist,
  complianceCategoryLabels,
  type ComplianceItem,
} from "@shared/store-compliance";

const categoryIcons: Record<string, typeof Shield> = {
  automation_disclosure: Shield,
  permissions: Smartphone,
  safety_language: Eye,
  accessibility: Accessibility,
};

const categoryOrder: ComplianceItem["category"][] = [
  "automation_disclosure",
  "permissions",
  "safety_language",
  "accessibility",
];

export function StoreCompliancePanel() {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(categoryOrder)
  );

  const passingCount = storeComplianceChecklist.filter((item) => item.status === "pass").length;
  const totalCount = storeComplianceChecklist.length;
  const allPassing = passingCount === totalCount;

  const grouped = categoryOrder.map((category) => ({
    category,
    label: complianceCategoryLabels[category],
    items: storeComplianceChecklist.filter((item) => item.category === category),
  }));

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  return (
    <div className="space-y-6" data-testid="store-compliance-panel">
      <div>
        <h2 className="text-xl font-semibold text-foreground" data-testid="text-store-compliance-title">
          Store Compliance Verification
        </h2>
        <p className="text-sm text-muted-foreground">
          App Store and Play Store compliance checklist
        </p>
      </div>

      <Card data-testid="card-compliance-summary">
        <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
          <div className="space-y-1">
            <CardTitle className="text-lg" data-testid="text-compliance-summary-title">
              Compliance Summary
            </CardTitle>
            <CardDescription data-testid="text-compliance-summary-description">
              {passingCount} of {totalCount} items passing
            </CardDescription>
          </div>
          <Badge
            variant={allPassing ? "default" : "destructive"}
            data-testid="badge-compliance-status"
          >
            {allPassing ? (
              <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
            ) : (
              <AlertTriangle className="mr-1.5 h-3.5 w-3.5" />
            )}
            {allPassing ? "Store Ready" : "Review Required"}
          </Badge>
        </CardHeader>
      </Card>

      <div className="space-y-4">
        {grouped.map(({ category, label, items }) => {
          const Icon = categoryIcons[category];
          const expanded = expandedCategories.has(category);
          const categoryPassing = items.filter((i) => i.status === "pass").length;
          const categoryTotal = items.length;

          return (
            <Card key={category} data-testid={`card-category-${category}`}>
              <CardHeader
                className="cursor-pointer select-none flex flex-row items-center justify-between gap-4 flex-wrap"
                onClick={() => toggleCategory(category)}
                data-testid={`button-toggle-${category}`}
              >
                <div className="flex items-center gap-2">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                  <CardTitle className="text-base" data-testid={`text-category-title-${category}`}>
                    {label}
                  </CardTitle>
                  <Badge variant="secondary" data-testid={`badge-category-count-${category}`}>
                    {categoryPassing}/{categoryTotal}
                  </Badge>
                </div>
                {expanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </CardHeader>
              {expanded && (
                <CardContent className="space-y-3" data-testid={`content-category-${category}`}>
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-md border p-4 space-y-2"
                      data-testid={`item-${item.id}`}
                    >
                      <div className="flex items-center justify-between gap-4 flex-wrap">
                        <span className="font-medium text-foreground" data-testid={`text-item-title-${item.id}`}>
                          {item.title}
                        </span>
                        <Badge
                          variant={item.status === "pass" ? "default" : "destructive"}
                          data-testid={`badge-item-status-${item.id}`}
                        >
                          {item.status === "pass" ? (
                            <CheckCircle className="mr-1 h-3 w-3" />
                          ) : (
                            <AlertTriangle className="mr-1 h-3 w-3" />
                          )}
                          {item.status === "pass" ? "Pass" : "Needs Review"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground" data-testid={`text-item-description-${item.id}`}>
                        {item.description}
                      </p>
                      <p className="text-xs text-muted-foreground" data-testid={`text-item-requirement-${item.id}`}>
                        Requirement: {item.requirement}
                      </p>
                    </div>
                  ))}
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
