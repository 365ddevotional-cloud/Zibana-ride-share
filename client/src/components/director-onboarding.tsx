import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Share2, Target, Shield, CheckCircle, Briefcase, Eye, FileText, ArrowRight, ArrowLeft, Copy } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface DirectorOnboardingProps {
  directorType: "contract" | "employed";
  referralCodeId?: string;
  onComplete: () => void;
}

const TOTAL_STEPS = 5;

export default function DirectorOnboarding({ directorType, referralCodeId, onComplete }: DirectorOnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const { toast } = useToast();

  const completeMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/director/onboarding/complete");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/director/dashboard"] });
      toast({ title: "Onboarding complete", description: "You are now ready to use the dashboard." });
      onComplete();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message || "Failed to complete onboarding", variant: "destructive" });
    },
  });

  const canProceed = () => {
    if (currentStep === 3) return agreedToTerms;
    return true;
  };

  const handleNext = () => {
    if (currentStep === TOTAL_STEPS - 1) {
      completeMutation.mutate();
      return;
    }
    if (canProceed()) {
      setCurrentStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
    }
  };

  const handlePrev = () => {
    setCurrentStep((s) => Math.max(s - 1, 0));
  };

  const stepIcons = directorType === "contract"
    ? [Users, Share2, Target, Shield, CheckCircle]
    : [Briefcase, Users, Eye, FileText, CheckCircle];

  const stepLabels = directorType === "contract"
    ? ["Introduction", "Referral Code", "Activation Rules", "Agreement", "Ready"]
    : ["Introduction", "Assigned Drivers", "Authority Limits", "Compliance", "Ready"];

  return (
    <Card className="mb-6" data-testid="director-onboarding-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2" data-testid="text-onboarding-title">
          {directorType === "contract" ? <Users className="h-5 w-5" /> : <Briefcase className="h-5 w-5" />}
          Director Onboarding
          <Badge variant="secondary" data-testid="badge-step-count">
            Step {currentStep + 1} of {TOTAL_STEPS}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-center gap-2" data-testid="step-indicators">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => {
            const Icon = stepIcons[i];
            return (
              <div
                key={i}
                className={`flex items-center justify-center w-8 h-8 rounded-full border text-xs font-medium transition-colors ${
                  i === currentStep
                    ? "bg-primary text-primary-foreground border-primary"
                    : i < currentStep
                      ? "bg-primary/20 text-primary border-primary/40"
                      : "bg-muted text-muted-foreground border-muted-foreground/30"
                }`}
                data-testid={`step-indicator-${i}`}
              >
                <Icon className="h-4 w-4" />
              </div>
            );
          })}
        </div>

        <p className="text-center text-xs text-muted-foreground" data-testid="text-step-label">
          {stepLabels[currentStep]}
        </p>

        <div className="min-h-[200px]" data-testid="step-content">
          {directorType === "contract" ? (
            <ContractStepContent
              step={currentStep}
              referralCodeId={referralCodeId}
              agreedToTerms={agreedToTerms}
              onToggleAgreement={setAgreedToTerms}
            />
          ) : (
            <EmployedStepContent
              step={currentStep}
              agreedToTerms={agreedToTerms}
              onToggleAgreement={setAgreedToTerms}
            />
          )}
        </div>

        <div className="flex items-center justify-between gap-2 pt-4 border-t">
          <Button
            variant="outline"
            onClick={handlePrev}
            disabled={currentStep === 0}
            data-testid="button-prev-step"
          >
            <ArrowLeft className="h-4 w-4" />
            Previous
          </Button>

          {currentStep === TOTAL_STEPS - 1 ? (
            <Button
              onClick={handleNext}
              disabled={completeMutation.isPending}
              data-testid="button-complete-onboarding"
            >
              {completeMutation.isPending ? "Completing..." : "Go to Dashboard"}
              <CheckCircle className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              disabled={!canProceed()}
              data-testid="button-next-step"
            >
              Next
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ContractStepContent({
  step,
  referralCodeId,
  agreedToTerms,
  onToggleAgreement,
}: {
  step: number;
  referralCodeId?: string;
  agreedToTerms: boolean;
  onToggleAgreement: (v: boolean) => void;
}) {
  const { toast } = useToast();

  const copyReferralCode = () => {
    if (referralCodeId) {
      navigator.clipboard.writeText(referralCodeId);
      toast({ title: "Copied", description: "Referral code copied to clipboard." });
    }
  };

  switch (step) {
    case 0:
      return (
        <div className="space-y-4" data-testid="contract-step-intro">
          <h3 className="text-lg font-semibold" data-testid="text-welcome-title">Welcome, Driver Network Manager</h3>
          <p className="text-sm text-muted-foreground" data-testid="text-intro-desc">
            As a contract director, your role is to manage and grow a driver network. You are responsible for the performance and discipline of drivers within your assigned cell.
          </p>
          <div className="rounded-md bg-muted p-3">
            <p className="text-sm text-muted-foreground" data-testid="text-eligibility-note">
              <Shield className="inline h-4 w-4 mr-1" />
              Commission eligibility is variable and not guaranteed. It depends on driver activity, policy compliance, and daily calculations that may change.
            </p>
          </div>
        </div>
      );
    case 1:
      return (
        <div className="space-y-4" data-testid="contract-step-referral">
          <h3 className="text-lg font-semibold" data-testid="text-referral-title">Your Referral Code</h3>
          <p className="text-sm text-muted-foreground" data-testid="text-referral-desc">
            Drivers who sign up using your referral code are automatically assigned to your cell. Share this code to grow your network.
          </p>
          {referralCodeId ? (
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-base px-4 py-2 font-mono" data-testid="text-referral-code">
                {referralCodeId}
              </Badge>
              <Button variant="outline" size="icon" onClick={copyReferralCode} data-testid="button-copy-referral">
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground" data-testid="text-no-referral">
              Your referral code will be available once your account is fully set up.
            </p>
          )}
        </div>
      );
    case 2:
      return (
        <div className="space-y-4" data-testid="contract-step-activation">
          <h3 className="text-lg font-semibold" data-testid="text-activation-title">Activation Rules</h3>
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li className="flex items-start gap-2" data-testid="text-rule-min-drivers">
              <Target className="h-4 w-4 mt-0.5 shrink-0" />
              <span>A minimum of 10 drivers is required to activate your cell and become eligible for commission.</span>
            </li>
            <li className="flex items-start gap-2" data-testid="text-rule-daily-cap">
              <Shield className="h-4 w-4 mt-0.5 shrink-0" />
              <span>Commission eligibility is calculated daily and capped. Not all active drivers may count toward your eligibility.</span>
            </li>
            <li className="flex items-start gap-2" data-testid="text-rule-daily-calc">
              <Target className="h-4 w-4 mt-0.5 shrink-0" />
              <span>Daily calculations determine how many of your drivers contribute to your commission. Ratios and caps may change based on policy.</span>
            </li>
          </ul>
        </div>
      );
    case 3:
      return (
        <div className="space-y-4" data-testid="contract-step-agreement">
          <h3 className="text-lg font-semibold" data-testid="text-agreement-title">Terms and Agreement</h3>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p data-testid="text-obligation-desc">
              By proceeding, you acknowledge the following obligations and conditions:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li data-testid="text-obligation-performance">You are responsible for the performance and conduct of drivers in your cell.</li>
              <li data-testid="text-obligation-variable">Commission eligibility is variable, not guaranteed, and subject to daily recalculation.</li>
              <li data-testid="text-obligation-policy">Policy terms, caps, and ratios may be adjusted by administration at any time.</li>
            </ul>
          </div>
          <label className="flex items-center gap-3 cursor-pointer" data-testid="label-agreement-checkbox">
            <input
              type="checkbox"
              checked={agreedToTerms}
              onChange={(e) => onToggleAgreement(e.target.checked)}
              className="h-4 w-4 rounded border-muted-foreground"
              data-testid="checkbox-agree-terms"
            />
            <span className="text-sm font-medium">I understand and accept these terms</span>
          </label>
        </div>
      );
    case 4:
      return (
        <div className="space-y-4 text-center" data-testid="contract-step-ready">
          <CheckCircle className="h-12 w-12 mx-auto text-primary" />
          <h3 className="text-lg font-semibold" data-testid="text-ready-title">You are ready</h3>
          <p className="text-sm text-muted-foreground" data-testid="text-ready-desc">
            Your onboarding is complete. Click "Go to Dashboard" to start managing your driver network.
          </p>
        </div>
      );
    default:
      return null;
  }
}

function EmployedStepContent({
  step,
  agreedToTerms,
  onToggleAgreement,
}: {
  step: number;
  agreedToTerms: boolean;
  onToggleAgreement: (v: boolean) => void;
}) {
  switch (step) {
    case 0:
      return (
        <div className="space-y-4" data-testid="employed-step-intro">
          <h3 className="text-lg font-semibold" data-testid="text-welcome-title">Welcome to the Director Team</h3>
          <p className="text-sm text-muted-foreground" data-testid="text-intro-desc">
            As an employed director, your role is to oversee assigned driver operations. You will monitor driver activity, track performance, and report on key metrics.
          </p>
        </div>
      );
    case 1:
      return (
        <div className="space-y-4" data-testid="employed-step-assigned">
          <h3 className="text-lg font-semibold" data-testid="text-assigned-title">Assigned Drivers</h3>
          <p className="text-sm text-muted-foreground" data-testid="text-assigned-desc">
            Drivers are assigned to you by administration. You do not recruit drivers directly. Your responsibility is to monitor their activity and report any issues.
          </p>
          <div className="rounded-md bg-muted p-3">
            <p className="text-sm text-muted-foreground" data-testid="text-assigned-note">
              <Users className="inline h-4 w-4 mr-1" />
              Driver assignments may be added or removed by administration at any time.
            </p>
          </div>
        </div>
      );
    case 2:
      return (
        <div className="space-y-4" data-testid="employed-step-authority">
          <h3 className="text-lg font-semibold" data-testid="text-authority-title">Authority Limits</h3>
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li className="flex items-start gap-2" data-testid="text-limit-readonly">
              <Eye className="h-4 w-4 mt-0.5 shrink-0" />
              <span>You have read-only access to driver data. You can view driver activity, trip history, and performance metrics.</span>
            </li>
            <li className="flex items-start gap-2" data-testid="text-limit-no-suspend">
              <Shield className="h-4 w-4 mt-0.5 shrink-0" />
              <span>You cannot suspend or activate drivers. These actions are reserved for administration.</span>
            </li>
            <li className="flex items-start gap-2" data-testid="text-limit-escalate">
              <FileText className="h-4 w-4 mt-0.5 shrink-0" />
              <span>If you identify issues that require action, escalate them to administration through the appropriate channels.</span>
            </li>
          </ul>
        </div>
      );
    case 3:
      return (
        <div className="space-y-4" data-testid="employed-step-compliance">
          <h3 className="text-lg font-semibold" data-testid="text-compliance-title">Compliance and Reporting</h3>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p data-testid="text-compliance-desc">
              You are expected to monitor driver performance and submit reports as required:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li data-testid="text-compliance-monitoring">Regular performance monitoring of all assigned drivers.</li>
              <li data-testid="text-compliance-reporting">Timely reporting of any incidents, policy violations, or operational concerns.</li>
              <li data-testid="text-compliance-standards">Adherence to all organizational standards and procedures.</li>
            </ul>
          </div>
          <label className="flex items-center gap-3 cursor-pointer" data-testid="label-agreement-checkbox">
            <input
              type="checkbox"
              checked={agreedToTerms}
              onChange={(e) => onToggleAgreement(e.target.checked)}
              className="h-4 w-4 rounded border-muted-foreground"
              data-testid="checkbox-agree-terms"
            />
            <span className="text-sm font-medium">I understand and accept these requirements</span>
          </label>
        </div>
      );
    case 4:
      return (
        <div className="space-y-4 text-center" data-testid="employed-step-ready">
          <CheckCircle className="h-12 w-12 mx-auto text-primary" />
          <h3 className="text-lg font-semibold" data-testid="text-ready-title">You are ready</h3>
          <p className="text-sm text-muted-foreground" data-testid="text-ready-desc">
            Your onboarding is complete. Click "Go to Dashboard" to begin overseeing your assigned drivers.
          </p>
        </div>
      );
    default:
      return null;
  }
}
