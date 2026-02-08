import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Shield,
  BookOpen,
  AlertTriangle,
  Users,
  Activity,
  FileText,
  Pause,
  Heart,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

interface Playbook {
  id: string;
  title: string;
  steps: string[];
}

const playbooks: Playbook[] = [
  {
    id: "director-suspension",
    title: "Director Suspension Playbook",
    steps: [
      "Review flagged behavior",
      "Check audit logs",
      "Issue warning or suspend",
      "Document reason",
      "Notify director",
      "Monitor for appeal",
    ],
  },
  {
    id: "mass-driver-issue",
    title: "Mass Driver Issue Playbook",
    steps: [
      "Identify scope of issue",
      "Assess impact on riders",
      "Communicate with affected drivers",
      "Implement temporary measures",
      "Resolve root cause",
      "Post-incident review",
    ],
  },
  {
    id: "lost-item-abuse",
    title: "Lost-Item Abuse Playbook",
    steps: [
      "Review claim details",
      "Check fraud detection flags",
      "Cross-reference with trip data",
      "Interview parties if needed",
      "Make determination",
      "Update fraud profile",
    ],
  },
  {
    id: "incident-response",
    title: "Incident Response Playbook",
    steps: [
      "Assess severity level",
      "Activate response team",
      "Secure evidence and logs",
      "Communicate with affected parties",
      "Execute resolution",
      "Document and close",
    ],
  },
];

export function OperationalReadinessPanel() {
  const [expandedPlaybooks, setExpandedPlaybooks] = useState<Set<string>>(new Set());

  const togglePlaybook = (id: string) => {
    setExpandedPlaybooks((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="space-y-8" data-testid="operational-readiness-panel">
      <div>
        <h2 className="text-xl font-semibold text-foreground" data-testid="text-operational-readiness-title">
          Operational Readiness
        </h2>
        <p className="text-sm text-muted-foreground">
          Director oversight, playbooks, and emergency controls
        </p>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium text-foreground flex items-center gap-2" data-testid="text-director-overview-title">
          <Users className="h-5 w-5 text-muted-foreground" />
          Director Overview
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card data-testid="card-total-directors">
            <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Directors</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-directors-count">0</div>
              <p className="text-xs text-muted-foreground">Registered directors</p>
            </CardContent>
          </Card>
          <Card data-testid="card-active-directors">
            <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-active-directors-count">0</div>
              <p className="text-xs text-muted-foreground">Currently active</p>
            </CardContent>
          </Card>
          <Card data-testid="card-suspended-directors">
            <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Suspended</CardTitle>
              <Pause className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-suspended-directors-count">0</div>
              <p className="text-xs text-muted-foreground">Under suspension</p>
            </CardContent>
          </Card>
          <Card data-testid="card-terminated-directors">
            <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Terminated</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-terminated-directors-count">0</div>
              <p className="text-xs text-muted-foreground">Contract ended</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium text-foreground flex items-center gap-2" data-testid="text-playbooks-title">
          <BookOpen className="h-5 w-5 text-muted-foreground" />
          Playbooks
        </h3>
        <div className="space-y-3">
          {playbooks.map((playbook) => {
            const expanded = expandedPlaybooks.has(playbook.id);
            return (
              <Card key={playbook.id} data-testid={`card-playbook-${playbook.id}`}>
                <CardHeader
                  className="cursor-pointer select-none flex flex-row items-center justify-between gap-4 flex-wrap"
                  onClick={() => togglePlaybook(playbook.id)}
                  data-testid={`button-toggle-playbook-${playbook.id}`}
                >
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                    <CardTitle className="text-base">{playbook.title}</CardTitle>
                    <Badge variant="secondary" data-testid={`badge-playbook-steps-${playbook.id}`}>
                      {playbook.steps.length} steps
                    </Badge>
                  </div>
                  {expanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </CardHeader>
                {expanded && (
                  <CardContent data-testid={`content-playbook-${playbook.id}`}>
                    <ol className="list-decimal list-inside space-y-2">
                      {playbook.steps.map((step, index) => (
                        <li
                          key={index}
                          className="text-sm text-muted-foreground"
                          data-testid={`text-playbook-step-${playbook.id}-${index}`}
                        >
                          {step}
                        </li>
                      ))}
                    </ol>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium text-foreground flex items-center gap-2" data-testid="text-emergency-controls-title">
          <Shield className="h-5 w-5 text-muted-foreground" />
          Emergency Controls
        </h3>
        <Card data-testid="card-emergency-controls">
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-3">
              <Button variant="destructive" data-testid="button-emergency-director-suspend">
                <Pause className="mr-1.5 h-4 w-4" />
                Emergency Director Suspend
              </Button>
              <Button variant="default" data-testid="button-system-health-check">
                <Heart className="mr-1.5 h-4 w-4" />
                System Health Check
              </Button>
              <Button variant="outline" data-testid="button-view-appeal-queue">
                <FileText className="mr-1.5 h-4 w-4" />
                View Appeal Queue
              </Button>
              <Button variant="outline" data-testid="button-ziba-support-logs">
                <FileText className="mr-1.5 h-4 w-4" />
                ZIBA Support Logs
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
