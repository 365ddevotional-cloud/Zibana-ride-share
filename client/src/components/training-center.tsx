import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle, BookOpen, GraduationCap, ChevronDown, ChevronUp } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { TrainingModule } from "@shared/training-content";
import type { TrainingAcknowledgement } from "@shared/schema";
import { API_BASE } from "@/lib/apiBase";

interface TrainingCenterProps {
  role: "contract_director" | "employed_director" | "driver";
}

export function TrainingCenter({ role }: TrainingCenterProps) {
  const { toast } = useToast();
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  const { data: modules = [], isLoading: modulesLoading } = useQuery<TrainingModule[]>({
    queryKey: ["/api/training/modules", role],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/training/modules/${role}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch modules");
      return res.json();
    },
  });

  const { data: acknowledgements = [], isLoading: acksLoading } = useQuery<TrainingAcknowledgement[]>({
    queryKey: ["/api/training/acknowledgements"],
  });

  const acknowledgeMutation = useMutation({
    mutationFn: async (moduleId: string) => {
      return apiRequest("POST", "/api/training/acknowledge", { moduleId, role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/training/acknowledgements"] });
      toast({ title: "Module acknowledged", description: "Your progress has been saved." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message || "Failed to acknowledge module", variant: "destructive" });
    },
  });

  const toggleExpand = (moduleId: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(moduleId)) {
        next.delete(moduleId);
      } else {
        next.add(moduleId);
      }
      return next;
    });
  };

  const isAcknowledged = (moduleId: string) => {
    return acknowledgements.some((a) => a.moduleId === moduleId);
  };

  const completedCount = modules.filter((m) => isAcknowledged(m.id)).length;
  const totalCount = modules.length;

  if (modulesLoading || acksLoading) {
    return (
      <div className="flex items-center justify-center p-8" data-testid="training-loading">
        <div className="flex flex-col items-center gap-2">
          <GraduationCap className="h-8 w-8 text-muted-foreground animate-pulse" />
          <p className="text-sm text-muted-foreground">Loading training modules...</p>
        </div>
      </div>
    );
  }

  if (modules.length === 0) {
    return (
      <div className="flex items-center justify-center p-8" data-testid="training-empty">
        <div className="flex flex-col items-center gap-2">
          <BookOpen className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No training modules available for this role.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="training-center">
      <Card data-testid="training-progress-card">
        <CardContent className="flex items-center gap-3 p-4">
          <GraduationCap className="h-5 w-5 text-muted-foreground" />
          <div className="flex-1">
            <p className="text-sm font-medium" data-testid="text-training-progress">
              Training Progress: {completedCount} of {totalCount} modules completed
            </p>
            <div className="mt-1 h-2 w-full rounded-full bg-muted">
              <div
                className="h-2 rounded-full bg-primary transition-all"
                style={{ width: totalCount > 0 ? `${(completedCount / totalCount) * 100}%` : "0%" }}
                data-testid="progress-bar"
              />
            </div>
          </div>
          {completedCount === totalCount && totalCount > 0 && (
            <Badge variant="default" data-testid="badge-all-complete">
              <CheckCircle className="h-3 w-3 mr-1" />
              Complete
            </Badge>
          )}
        </CardContent>
      </Card>

      {modules.map((mod) => {
        const expanded = expandedModules.has(mod.id);
        const acked = isAcknowledged(mod.id);

        return (
          <Card key={mod.id} data-testid={`card-training-${mod.id}`}>
            <CardHeader
              className="cursor-pointer p-4"
              onClick={() => toggleExpand(mod.id)}
              data-testid={`button-toggle-${mod.id}`}
            >
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-sm font-medium" data-testid={`text-title-${mod.id}`}>
                    {mod.title}
                  </CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  {acked ? (
                    <Badge variant="default" className="bg-green-600" data-testid={`badge-acked-${mod.id}`}>
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Acknowledged
                    </Badge>
                  ) : (
                    <Badge variant="secondary" data-testid={`badge-pending-${mod.id}`}>
                      Pending
                    </Badge>
                  )}
                  {expanded ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </div>
            </CardHeader>
            {expanded && (
              <CardContent className="p-4 pt-0 space-y-4" data-testid={`content-${mod.id}`}>
                <ul className="space-y-2">
                  {mod.bullets.map((bullet, idx) => (
                    <li key={idx} className="flex gap-2 text-sm text-muted-foreground">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-muted-foreground flex-shrink-0" />
                      <span data-testid={`text-bullet-${mod.id}-${idx}`}>{bullet}</span>
                    </li>
                  ))}
                </ul>
                {!acked && (
                  <div className="flex items-center gap-2 pt-2 border-t">
                    <Checkbox
                      id={`ack-${mod.id}`}
                      disabled={acknowledgeMutation.isPending}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          acknowledgeMutation.mutate(mod.id);
                        }
                      }}
                      data-testid={`checkbox-ack-${mod.id}`}
                    />
                    <label
                      htmlFor={`ack-${mod.id}`}
                      className="text-sm text-muted-foreground cursor-pointer"
                      data-testid={`label-ack-${mod.id}`}
                    >
                      I have read and understood this material
                    </label>
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}
