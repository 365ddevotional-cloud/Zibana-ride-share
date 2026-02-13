import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  BookOpen, CheckCircle, Users, Shield, AlertTriangle,
  Eye, Lightbulb, ArrowLeft, ChevronDown, ChevronUp
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";

type TrainingModule = {
  key: string;
  title: string;
  completed: boolean;
  completedAt: string | null;
};

type TrainingData = {
  modules: TrainingModule[];
  allCompleted: boolean;
  totalModules: number;
  completedCount: number;
};

const MODULE_CONTENT: Record<string, { icon: any; sections: { title: string; points: string[] }[] }> = {
  managing_drivers: {
    icon: Users,
    sections: [
      {
        title: "Driver Recruitment & Assignment",
        points: [
          "Drivers join your cell through your referral code or direct assignment by administration.",
          "You are responsible for the performance and conduct of all drivers in your cell.",
          "Monitor driver activity regularly to identify issues before they escalate.",
        ],
      },
      {
        title: "Performance Monitoring",
        points: [
          "Track driver activity rates, trip completion rates, and rider satisfaction.",
          "Identify inactive drivers early and reach out proactively.",
          "Use the reports dashboard to review daily, weekly, and monthly trends.",
        ],
      },
      {
        title: "Communication",
        points: [
          "Maintain open and professional communication with your drivers.",
          "Provide clear guidance on platform policies and expectations.",
          "Document all significant interactions for your records.",
        ],
      },
    ],
  },
  suspension_vs_escalation: {
    icon: Shield,
    sections: [
      {
        title: "When to Suspend",
        points: [
          "Suspension is a serious action — use it only when a driver poses a risk to riders or violates major policies.",
          "Document the reason clearly before suspending a driver.",
          "Excessive suspensions are monitored by ZIBRA and may affect your trust score.",
        ],
      },
      {
        title: "When to Escalate",
        points: [
          "For issues that require investigation or are beyond your authority, escalate to administration.",
          "Escalation is appropriate for safety incidents, fraud suspicion, or repeated policy violations.",
          "Escalating instead of suspending shows responsible management and is viewed favorably.",
        ],
      },
      {
        title: "Consequences of Misuse",
        points: [
          "Retaliatory suspensions — suspending a driver who filed a dispute — are automatically flagged.",
          "Mass suspensions trigger automated ZIBRA alerts and admin review.",
          "Repeated misuse of suspension authority may result in your own suspension or termination.",
        ],
      },
    ],
  },
  staff_management: {
    icon: Users,
    sections: [
      {
        title: "Delegating Responsibilities",
        points: [
          "You may delegate certain tasks to staff members assigned to your directorship.",
          "Staff access is limited to the permissions you grant — never exceed your own authority level.",
          "All staff actions are logged and attributed to your directorship.",
        ],
      },
      {
        title: "Accountability",
        points: [
          "You are fully responsible for the actions of any staff operating under your authority.",
          "Review staff activities regularly to ensure compliance with platform policies.",
          "Report any staff misconduct immediately to administration.",
        ],
      },
    ],
  },
  avoiding_abuse: {
    icon: AlertTriangle,
    sections: [
      {
        title: "Anti-Retaliation Policy",
        points: [
          "Retaliating against a driver who files a dispute is strictly prohibited.",
          "The system automatically detects when a director suspends a driver within 14 days of an active dispute.",
          "Retaliation flags are escalated to Super Admin and affect your trust score significantly.",
        ],
      },
      {
        title: "Fair Treatment Standards",
        points: [
          "Treat all drivers equitably regardless of their activity level, background, or personal relationships.",
          "Do not use your authority to benefit or disadvantage specific drivers unfairly.",
          "All management decisions should be documented and defensible.",
        ],
      },
      {
        title: "Recognizing Abuse Patterns",
        points: [
          "Concentrated suspensions of high-performing drivers may indicate abuse.",
          "Favoritism in driver assignments or opportunities is flagged by the system.",
          "If you are unsure whether an action could be considered abusive, escalate to administration first.",
        ],
      },
    ],
  },
  understanding_trust: {
    icon: Eye,
    sections: [
      {
        title: "What is the Trust Score?",
        points: [
          "Your trust score is an internal metric that reflects your operational reliability.",
          "You cannot see your numeric score — it is used only by administration and the ZIBRA system.",
          "The score is calculated based on driver complaints, suspension patterns, compliance, and admin warnings.",
        ],
      },
      {
        title: "How It Affects You",
        points: [
          "A low trust score triggers ZIBRA coaching prompts to help you improve.",
          "A high-risk trust level triggers an admin review of your directorship.",
          "Maintaining good practices naturally keeps your trust score healthy.",
        ],
      },
      {
        title: "Improving Your Score",
        points: [
          "Respond to driver issues promptly and fairly.",
          "Use suspension sparingly and only when justified.",
          "Complete all compliance requirements and training modules.",
          "Engage positively with ZIBRA coaching suggestions.",
        ],
      },
    ],
  },
  working_with_zibra: {
    icon: Lightbulb,
    sections: [
      {
        title: "What is ZIBRA?",
        points: [
          "ZIBRA is ZIBANA's intelligent assistant that monitors operations and provides coaching insights.",
          "It generates coaching prompts based on your operational patterns — not punishments.",
          "ZIBRA aims to help you succeed, not to penalize you.",
        ],
      },
      {
        title: "Types of ZIBRA Insights",
        points: [
          "Low activity alerts — when many of your drivers are inactive.",
          "Suspension rate warnings — when your suspension rate is above average.",
          "Capacity notifications — when your cell is approaching its driver limit.",
          "Contract expiry reminders — when your directorship term is nearing its end.",
        ],
      },
      {
        title: "What ZIBRA Will Never Do",
        points: [
          "ZIBRA will never threaten you or make demands.",
          "ZIBRA will never promise specific earnings or commission amounts.",
          "ZIBRA will never override admin authority or make management decisions on your behalf.",
        ],
      },
    ],
  },
};

export default function DirectorTraining() {
  const [, setLocation] = useLocation();
  const [expandedModule, setExpandedModule] = useState<string | null>(null);
  const { toast } = useToast();

  const { data: trainingData, isLoading } = useQuery<TrainingData>({
    queryKey: ["/api/director/training"],
  });

  const completeMutation = useMutation({
    mutationFn: async (moduleKey: string) => {
      await apiRequest("POST", `/api/director/training/${moduleKey}/complete`);
    },
    onSuccess: (_data, moduleKey) => {
      queryClient.invalidateQueries({ queryKey: ["/api/director/training"] });
      queryClient.invalidateQueries({ queryKey: ["/api/director/onboarding/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/director/dashboard/full"] });
      toast({ title: "Module Completed", description: `Training module "${MODULE_CONTENT[moduleKey]?.sections[0]?.title || moduleKey}" marked as complete.` });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      </div>
    );
  }

  const modules = trainingData?.modules || [];
  const progressPercent = trainingData ? (trainingData.completedCount / trainingData.totalModules) * 100 : 0;

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6" data-testid="director-training-page">
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="outline" size="icon" onClick={() => setLocation("/director/dashboard")} data-testid="button-back-dashboard">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-training-title">Director Training</h1>
          <p className="text-sm text-muted-foreground" data-testid="text-training-desc">
            Complete all training modules to unlock full dashboard access.
          </p>
        </div>
      </div>

      <Card data-testid="card-training-progress">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
            <span className="text-sm font-medium" data-testid="text-progress-label">
              {trainingData?.completedCount || 0} of {trainingData?.totalModules || 6} modules completed
            </span>
            {trainingData?.allCompleted && (
              <Badge variant="default" data-testid="badge-training-complete">
                <CheckCircle className="h-3 w-3 mr-1" />
                All Complete
              </Badge>
            )}
          </div>
          <Progress value={progressPercent} className="h-2" data-testid="progress-training" />
        </CardContent>
      </Card>

      <div className="space-y-3">
        {modules.map((mod) => {
          const content = MODULE_CONTENT[mod.key];
          const Icon = content?.icon || BookOpen;
          const isExpanded = expandedModule === mod.key;

          return (
            <Card key={mod.key} data-testid={`card-module-${mod.key}`}>
              <CardHeader
                className="cursor-pointer"
                onClick={() => setExpandedModule(isExpanded ? null : mod.key)}
                data-testid={`button-expand-module-${mod.key}`}
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Icon className="h-4 w-4" />
                    {mod.title}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {mod.completed ? (
                      <Badge variant="default" data-testid={`badge-complete-${mod.key}`}>
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Completed
                      </Badge>
                    ) : (
                      <Badge variant="secondary" data-testid={`badge-pending-${mod.key}`}>
                        Pending
                      </Badge>
                    )}
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                </div>
                {mod.completedAt && (
                  <CardDescription data-testid={`text-completed-date-${mod.key}`}>
                    Completed on {new Date(mod.completedAt).toLocaleDateString()}
                  </CardDescription>
                )}
              </CardHeader>

              {isExpanded && content && (
                <CardContent className="space-y-4 pt-0">
                  {content.sections.map((section, si) => (
                    <div key={si} className="space-y-2">
                      <h4 className="text-sm font-semibold" data-testid={`text-section-title-${mod.key}-${si}`}>
                        {section.title}
                      </h4>
                      <ul className="space-y-1.5">
                        {section.points.map((point, pi) => (
                          <li key={pi} className="flex items-start gap-2 text-sm text-muted-foreground" data-testid={`text-point-${mod.key}-${si}-${pi}`}>
                            <span className="shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}

                  {!mod.completed && (
                    <div className="pt-2 border-t">
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          completeMutation.mutate(mod.key);
                        }}
                        disabled={completeMutation.isPending}
                        data-testid={`button-complete-module-${mod.key}`}
                      >
                        {completeMutation.isPending ? "Marking..." : "Mark as Completed"}
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {trainingData?.allCompleted && (
        <Card className="border-primary/30" data-testid="card-training-success">
          <CardContent className="pt-6 text-center space-y-3">
            <CheckCircle className="h-10 w-10 mx-auto text-primary" />
            <h3 className="text-lg font-semibold" data-testid="text-training-success">Training Complete</h3>
            <p className="text-sm text-muted-foreground" data-testid="text-training-success-desc">
              You have completed all training modules. Full dashboard access is now available.
            </p>
            <Button onClick={() => setLocation("/director/dashboard")} data-testid="button-go-to-dashboard">
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
