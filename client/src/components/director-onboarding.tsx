import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Users, Target, Shield, CheckCircle, Briefcase, Eye, FileText,
  ArrowRight, ArrowLeft, Copy, BookOpen, Scale, UserCheck, AlertTriangle,
  Share2
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface DirectorOnboardingProps {
  directorType: "contract" | "employed";
  referralCodeId?: string;
  onComplete: () => void;
}

const TOTAL_STEPS = 8;

const CONTRACT_STEP_LABELS = [
  "Welcome",
  "Responsibilities",
  "Driver Management",
  "Commission Rules",
  "Staff & Permissions",
  "Compliance & Conduct",
  "Terms & Conditions",
  "Ready",
];

const CONTRACT_STEP_ICONS = [Users, Briefcase, UserCheck, Target, Shield, Scale, FileText, CheckCircle];

const EMPLOYED_STEP_LABELS = [
  "Welcome",
  "Your Role",
  "Driver Oversight",
  "Reporting Duties",
  "Authority & Limits",
  "Conduct & Policy",
  "Terms & Conditions",
  "Ready",
];

const EMPLOYED_STEP_ICONS = [Briefcase, Eye, Users, BookOpen, Shield, Scale, FileText, CheckCircle];

export default function DirectorOnboarding({ directorType, referralCodeId, onComplete }: DirectorOnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const { toast } = useToast();

  const completeMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/director/terms/accept");
      return apiRequest("POST", "/api/director/onboarding/complete");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/director/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/director/onboarding/status"] });
      toast({ title: "Onboarding complete", description: "Welcome to your Director dashboard." });
      onComplete();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message || "Failed to complete onboarding", variant: "destructive" });
    },
  });

  const canProceed = () => {
    if (currentStep === 6) return agreedToTerms;
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

  const stepIcons = directorType === "contract" ? CONTRACT_STEP_ICONS : EMPLOYED_STEP_ICONS;
  const stepLabels = directorType === "contract" ? CONTRACT_STEP_LABELS : EMPLOYED_STEP_LABELS;

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
        <div className="flex items-center justify-center gap-1 flex-wrap" data-testid="step-indicators">
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

        <div className="min-h-[260px]" data-testid="step-content">
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
        <div className="space-y-4" data-testid="contract-step-welcome">
          <h3 className="text-lg font-semibold" data-testid="text-welcome-title">Welcome, Director</h3>
          <p className="text-sm text-muted-foreground" data-testid="text-welcome-desc">
            As a Contract Director, you play a key role in building and managing a driver network. Your success depends on growing an active, compliant team of drivers who provide reliable service to riders.
          </p>
          <div className="rounded-md bg-muted p-3 space-y-2">
            <p className="text-sm text-muted-foreground" data-testid="text-role-overview">
              <Briefcase className="inline h-4 w-4 mr-1" />
              You are an independent contractor — not an employee — unless explicitly designated otherwise. Your relationship with ZIBA is governed by the terms you will accept during this onboarding.
            </p>
          </div>
          {referralCodeId && (
            <div className="flex items-center gap-2 pt-2">
              <span className="text-sm text-muted-foreground">Your referral code:</span>
              <Badge variant="secondary" className="text-base px-4 py-1 font-mono" data-testid="text-referral-code">
                {referralCodeId}
              </Badge>
              <Button variant="outline" size="icon" onClick={copyReferralCode} data-testid="button-copy-referral">
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      );

    case 1:
      return (
        <div className="space-y-4" data-testid="contract-step-responsibilities">
          <h3 className="text-lg font-semibold" data-testid="text-responsibilities-title">Your Responsibilities</h3>
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li className="flex items-start gap-2" data-testid="text-resp-recruit">
              <Share2 className="h-4 w-4 mt-0.5 shrink-0" />
              <span>Recruit drivers using your referral code. Drivers who sign up with your code are assigned to your cell.</span>
            </li>
            <li className="flex items-start gap-2" data-testid="text-resp-monitor">
              <Eye className="h-4 w-4 mt-0.5 shrink-0" />
              <span>Monitor driver activity, performance, and compliance. You are accountable for the conduct of drivers in your cell.</span>
            </li>
            <li className="flex items-start gap-2" data-testid="text-resp-escalate">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>Escalate serious issues to administration. Use suspension sparingly and only when justified.</span>
            </li>
            <li className="flex items-start gap-2" data-testid="text-resp-staff">
              <Users className="h-4 w-4 mt-0.5 shrink-0" />
              <span>You are responsible for the actions of any staff operating under your authority.</span>
            </li>
          </ul>
        </div>
      );

    case 2:
      return (
        <div className="space-y-4" data-testid="contract-step-driver-mgmt">
          <h3 className="text-lg font-semibold" data-testid="text-driver-mgmt-title">Driver Management Rules</h3>
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li className="flex items-start gap-2" data-testid="text-rule-min-drivers">
              <Target className="h-4 w-4 mt-0.5 shrink-0" />
              <span>A minimum of 10 active drivers is required before your cell becomes eligible for commission calculations.</span>
            </li>
            <li className="flex items-start gap-2" data-testid="text-rule-cap">
              <Shield className="h-4 w-4 mt-0.5 shrink-0" />
              <span>Your cell has a maximum driver capacity. Approaching or exceeding this limit will trigger system alerts.</span>
            </li>
            <li className="flex items-start gap-2" data-testid="text-rule-suspend">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>Suspending a driver is a serious action. Excessive or retaliatory suspensions are monitored and may affect your standing.</span>
            </li>
            <li className="flex items-start gap-2" data-testid="text-rule-fair">
              <Scale className="h-4 w-4 mt-0.5 shrink-0" />
              <span>All driver management actions must be fair, documented, and comply with platform policies. Disputes from drivers are tracked.</span>
            </li>
          </ul>
        </div>
      );

    case 3:
      return (
        <div className="space-y-4" data-testid="contract-step-commission">
          <h3 className="text-lg font-semibold" data-testid="text-commission-title">Commission Rules</h3>
          <p className="text-sm text-muted-foreground" data-testid="text-commission-intro">
            Commission is calculated daily by the platform. Here is what you need to know:
          </p>
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li className="flex items-start gap-2" data-testid="text-comm-variable">
              <Target className="h-4 w-4 mt-0.5 shrink-0" />
              <span>Commission eligibility is variable and not guaranteed. It depends on driver activity, compliance, and daily calculations that may change.</span>
            </li>
            <li className="flex items-start gap-2" data-testid="text-comm-no-pricing">
              <Shield className="h-4 w-4 mt-0.5 shrink-0" />
              <span>You do not control pricing, fare calculations, or driver payouts. These are managed entirely by the platform.</span>
            </li>
            <li className="flex items-start gap-2" data-testid="text-comm-earnings">
              <Briefcase className="h-4 w-4 mt-0.5 shrink-0" />
              <span>Commission is earned only from platform earnings — not from driver income. Exact amounts are never disclosed in advance.</span>
            </li>
            <li className="flex items-start gap-2" data-testid="text-comm-frozen">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>Commission may be frozen during suspension, investigation, or policy violations.</span>
            </li>
          </ul>
        </div>
      );

    case 4:
      return (
        <div className="space-y-4" data-testid="contract-step-staff">
          <h3 className="text-lg font-semibold" data-testid="text-staff-title">Staff & Permissions</h3>
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li className="flex items-start gap-2" data-testid="text-staff-resp">
              <Users className="h-4 w-4 mt-0.5 shrink-0" />
              <span>If you delegate tasks to staff, you remain fully responsible for their actions on the platform.</span>
            </li>
            <li className="flex items-start gap-2" data-testid="text-staff-access">
              <Shield className="h-4 w-4 mt-0.5 shrink-0" />
              <span>Staff access is limited to the permissions you grant. You cannot grant staff access beyond your own authority level.</span>
            </li>
            <li className="flex items-start gap-2" data-testid="text-staff-audit">
              <Eye className="h-4 w-4 mt-0.5 shrink-0" />
              <span>All actions taken by your staff are logged and attributed to your directorship. Audit trails are permanent.</span>
            </li>
          </ul>
        </div>
      );

    case 5:
      return (
        <div className="space-y-4" data-testid="contract-step-compliance">
          <h3 className="text-lg font-semibold" data-testid="text-compliance-title">Compliance & Conduct</h3>
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li className="flex items-start gap-2" data-testid="text-conduct-fair">
              <Scale className="h-4 w-4 mt-0.5 shrink-0" />
              <span>Treat all drivers fairly and without discrimination. Retaliation against drivers who file disputes is strictly prohibited.</span>
            </li>
            <li className="flex items-start gap-2" data-testid="text-conduct-monitor">
              <Eye className="h-4 w-4 mt-0.5 shrink-0" />
              <span>ZIBRA continuously monitors operational patterns. Unusual activity — such as mass suspensions or inactivity — triggers automated alerts.</span>
            </li>
            <li className="flex items-start gap-2" data-testid="text-conduct-revoke">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>ZIBA reserves the right to suspend or terminate your directorship at its discretion for policy violations or misconduct.</span>
            </li>
            <li className="flex items-start gap-2" data-testid="text-conduct-dispute">
              <FileText className="h-4 w-4 mt-0.5 shrink-0" />
              <span>A formal dispute and appeals process is available. All dispute submissions are tracked and form part of your account record.</span>
            </li>
          </ul>
        </div>
      );

    case 6:
      return (
        <div className="space-y-4" data-testid="contract-step-terms">
          <h3 className="text-lg font-semibold" data-testid="text-terms-title">Terms & Conditions</h3>
          <div className="space-y-3 text-sm text-muted-foreground max-h-[200px] overflow-y-auto border rounded-md p-3">
            <p className="font-medium text-foreground">ZIBA Director Agreement — Version 1.0</p>
            <p>By accepting these terms, you acknowledge and agree to the following:</p>
            <ol className="list-decimal pl-5 space-y-2">
              <li>You are an independent contractor, not an employee, unless explicitly designated as an employed director.</li>
              <li>You do not control pricing, fare calculations, or driver payouts.</li>
              <li>Commission is earned only from ZIBA platform earnings — not from driver income — and is not guaranteed.</li>
              <li>Your appointment is revocable at the discretion of ZIBA administration.</li>
              <li>ZIBA may suspend or terminate your directorship at any time for policy violations, misconduct, or operational reasons.</li>
              <li>There is no guarantee of earnings. Commission eligibility depends on daily calculations, driver activity, and compliance.</li>
              <li>You are fully responsible for the actions of any staff operating under your authority.</li>
              <li>A formal dispute resolution process is available. Appeals are limited and subject to final review.</li>
              <li>Governing law is configurable per country of operation and subject to change.</li>
              <li>These terms may be updated. Continued use of the platform constitutes acceptance of updated terms.</li>
            </ol>
          </div>
          <label className="flex items-start gap-3 cursor-pointer pt-2" data-testid="label-agreement-checkbox">
            <Checkbox
              checked={agreedToTerms}
              onCheckedChange={(v) => onToggleAgreement(!!v)}
              className="mt-0.5"
              data-testid="checkbox-agree-terms"
            />
            <span className="text-sm font-medium">I have read, understood, and accept the Director Terms & Conditions</span>
          </label>
        </div>
      );

    case 7:
      return (
        <div className="space-y-4 text-center" data-testid="contract-step-ready">
          <CheckCircle className="h-12 w-12 mx-auto text-primary" />
          <h3 className="text-lg font-semibold" data-testid="text-ready-title">Onboarding Complete</h3>
          <p className="text-sm text-muted-foreground" data-testid="text-ready-desc">
            You have completed the Director onboarding process. After accessing your dashboard, you will need to complete mandatory training modules before full access is granted.
          </p>
          <div className="rounded-md bg-muted p-3 text-left">
            <p className="text-sm text-muted-foreground">
              <BookOpen className="inline h-4 w-4 mr-1" />
              Next: Complete 6 training modules covering driver management, compliance, and ZIBRA insights.
            </p>
          </div>
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
        <div className="space-y-4" data-testid="employed-step-welcome">
          <h3 className="text-lg font-semibold" data-testid="text-welcome-title">Welcome to the Director Team</h3>
          <p className="text-sm text-muted-foreground" data-testid="text-intro-desc">
            As an Employed Director, you are part of the ZIBA operations team. Your role is to oversee assigned driver operations, monitor performance, and ensure compliance with platform standards.
          </p>
          <div className="rounded-md bg-muted p-3">
            <p className="text-sm text-muted-foreground" data-testid="text-employed-note">
              <Briefcase className="inline h-4 w-4 mr-1" />
              As an employed director, your employment terms are governed by your employment agreement with ZIBA.
            </p>
          </div>
        </div>
      );

    case 1:
      return (
        <div className="space-y-4" data-testid="employed-step-role">
          <h3 className="text-lg font-semibold" data-testid="text-role-title">Your Role</h3>
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li className="flex items-start gap-2" data-testid="text-role-monitor">
              <Eye className="h-4 w-4 mt-0.5 shrink-0" />
              <span>Monitor and oversee drivers assigned to your cell by administration.</span>
            </li>
            <li className="flex items-start gap-2" data-testid="text-role-report">
              <BookOpen className="h-4 w-4 mt-0.5 shrink-0" />
              <span>Submit regular reports on driver activity, performance, and any incidents.</span>
            </li>
            <li className="flex items-start gap-2" data-testid="text-role-escalate">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>Escalate operational concerns and policy violations to administration through proper channels.</span>
            </li>
          </ul>
        </div>
      );

    case 2:
      return (
        <div className="space-y-4" data-testid="employed-step-drivers">
          <h3 className="text-lg font-semibold" data-testid="text-drivers-title">Driver Oversight</h3>
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li className="flex items-start gap-2" data-testid="text-driver-assigned">
              <Users className="h-4 w-4 mt-0.5 shrink-0" />
              <span>Drivers are assigned to you by administration. You do not recruit drivers directly.</span>
            </li>
            <li className="flex items-start gap-2" data-testid="text-driver-activity">
              <Eye className="h-4 w-4 mt-0.5 shrink-0" />
              <span>You can view driver activity, trip history, and performance metrics.</span>
            </li>
            <li className="flex items-start gap-2" data-testid="text-driver-changes">
              <Shield className="h-4 w-4 mt-0.5 shrink-0" />
              <span>Driver assignments may be added or removed by administration at any time.</span>
            </li>
          </ul>
        </div>
      );

    case 3:
      return (
        <div className="space-y-4" data-testid="employed-step-reporting">
          <h3 className="text-lg font-semibold" data-testid="text-reporting-title">Reporting Duties</h3>
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li className="flex items-start gap-2" data-testid="text-report-regular">
              <BookOpen className="h-4 w-4 mt-0.5 shrink-0" />
              <span>Regular performance monitoring of all assigned drivers is expected.</span>
            </li>
            <li className="flex items-start gap-2" data-testid="text-report-incidents">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>Timely reporting of incidents, policy violations, and operational concerns is mandatory.</span>
            </li>
            <li className="flex items-start gap-2" data-testid="text-report-standards">
              <FileText className="h-4 w-4 mt-0.5 shrink-0" />
              <span>All reports must follow the organizational standards and procedures.</span>
            </li>
          </ul>
        </div>
      );

    case 4:
      return (
        <div className="space-y-4" data-testid="employed-step-authority">
          <h3 className="text-lg font-semibold" data-testid="text-authority-title">Authority & Limits</h3>
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li className="flex items-start gap-2" data-testid="text-limit-readonly">
              <Eye className="h-4 w-4 mt-0.5 shrink-0" />
              <span>You have read-only access to driver data unless administration grants additional permissions.</span>
            </li>
            <li className="flex items-start gap-2" data-testid="text-limit-suspend">
              <Shield className="h-4 w-4 mt-0.5 shrink-0" />
              <span>Driver suspension, activation, and assignment actions are reserved for administration.</span>
            </li>
            <li className="flex items-start gap-2" data-testid="text-limit-escalate">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>If action is needed, escalate through the proper channels. Do not take independent disciplinary action.</span>
            </li>
          </ul>
        </div>
      );

    case 5:
      return (
        <div className="space-y-4" data-testid="employed-step-conduct">
          <h3 className="text-lg font-semibold" data-testid="text-conduct-title">Conduct & Policy</h3>
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li className="flex items-start gap-2" data-testid="text-conduct-standards">
              <Scale className="h-4 w-4 mt-0.5 shrink-0" />
              <span>Adhere to all organizational standards, professional conduct requirements, and platform policies at all times.</span>
            </li>
            <li className="flex items-start gap-2" data-testid="text-conduct-monitor">
              <Eye className="h-4 w-4 mt-0.5 shrink-0" />
              <span>ZIBRA monitors operational patterns continuously. Compliance is tracked and forms part of your performance record.</span>
            </li>
            <li className="flex items-start gap-2" data-testid="text-conduct-dispute">
              <FileText className="h-4 w-4 mt-0.5 shrink-0" />
              <span>A formal dispute and appeals process is available for any concerns or disagreements.</span>
            </li>
          </ul>
        </div>
      );

    case 6:
      return (
        <div className="space-y-4" data-testid="employed-step-terms">
          <h3 className="text-lg font-semibold" data-testid="text-terms-title">Terms & Conditions</h3>
          <div className="space-y-3 text-sm text-muted-foreground max-h-[200px] overflow-y-auto border rounded-md p-3">
            <p className="font-medium text-foreground">ZIBA Employed Director Agreement — Version 1.0</p>
            <p>By accepting these terms, you acknowledge and agree to the following:</p>
            <ol className="list-decimal pl-5 space-y-2">
              <li>Your role as an employed director is governed by your employment agreement with ZIBA.</li>
              <li>You do not control pricing, fare calculations, or driver payouts.</li>
              <li>Your authority is limited to the scope defined by administration.</li>
              <li>ZIBA may modify your duties, assignments, or authority at any time.</li>
              <li>You are expected to comply with all platform policies and organizational standards.</li>
              <li>All actions are logged and form part of your performance record.</li>
              <li>A formal dispute resolution process is available.</li>
              <li>Governing law is configurable per country of operation.</li>
            </ol>
          </div>
          <label className="flex items-start gap-3 cursor-pointer pt-2" data-testid="label-agreement-checkbox">
            <Checkbox
              checked={agreedToTerms}
              onCheckedChange={(v) => onToggleAgreement(!!v)}
              className="mt-0.5"
              data-testid="checkbox-agree-terms"
            />
            <span className="text-sm font-medium">I have read, understood, and accept the Director Terms & Conditions</span>
          </label>
        </div>
      );

    case 7:
      return (
        <div className="space-y-4 text-center" data-testid="employed-step-ready">
          <CheckCircle className="h-12 w-12 mx-auto text-primary" />
          <h3 className="text-lg font-semibold" data-testid="text-ready-title">Onboarding Complete</h3>
          <p className="text-sm text-muted-foreground" data-testid="text-ready-desc">
            You have completed the Director onboarding process. After accessing your dashboard, you will need to complete mandatory training modules.
          </p>
          <div className="rounded-md bg-muted p-3 text-left">
            <p className="text-sm text-muted-foreground">
              <BookOpen className="inline h-4 w-4 mr-1" />
              Next: Complete 6 training modules covering driver management, compliance, and ZIBRA insights.
            </p>
          </div>
        </div>
      );

    default:
      return null;
  }
}
