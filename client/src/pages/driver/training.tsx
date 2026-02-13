import { useState } from "react";
import { DriverLayout } from "@/components/driver/DriverLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { ChevronLeft, GraduationCap, Package, MapPin, AlertTriangle, Star, Shield, ChevronDown, ChevronUp } from "lucide-react";

interface TrainingModule {
  id: string;
  title: string;
  icon: any;
  sections: { title: string; content: string }[];
}

const TRAINING_MODULES: TrainingModule[] = [
  {
    id: "lost-items",
    title: "Lost Item Protocol",
    icon: Package,
    sections: [
      {
        title: "When a Rider Reports a Lost Item",
        content: "You will receive a notification when a rider reports a lost item from one of your trips. Check your vehicle thoroughly. If you find the item, tap 'Found It' to confirm. If the item is not in your vehicle, tap 'Not Found'. Always respond promptly - it affects your trust score.",
      },
      {
        title: "Returning Items Safely",
        content: "Once you confirm finding an item, you have two return options: Direct Return (coordinate with the rider via in-app chat) or Safe Return Hub (recommended). Using a Safe Return Hub is safer for both parties and earns you a bonus reward.",
      },
      {
        title: "What NOT To Do",
        content: "Never keep a found item for personal use. Never demand payment outside the app. Never share your personal phone number - use the in-app chat. Never arrange meetups in unsafe locations. Never deny finding an item if you have it.",
      },
    ],
  },
  {
    id: "safe-return-hubs",
    title: "Safe Return Hubs",
    icon: MapPin,
    sections: [
      {
        title: "What Are Safe Return Hubs?",
        content: "Safe Return Hubs are designated partner locations (partner stations, police stations, service centers) where you can securely drop off found items for riders to pick up. They reduce conflict and improve safety for everyone.",
      },
      {
        title: "How to Use a Hub",
        content: "After confirming you found an item, select 'Drop at Safe Hub' as your return method. Choose the nearest hub from the list. Drive to the hub during operating hours. Take a photo of the drop-off and confirm in the app. The rider will be notified to pick up their item.",
      },
      {
        title: "Hub Benefits for Drivers",
        content: "You receive a bonus reward (typically 200 NGN) for each item dropped at a hub. Your trust score increases. You avoid the hassle of coordinating a direct meetup. Hubs with CCTV provide proof of drop-off.",
      },
    ],
  },
  {
    id: "accidents",
    title: "Accident Reporting",
    icon: AlertTriangle,
    sections: [
      {
        title: "Immediate Steps After an Accident",
        content: "Ensure everyone's safety first. Call emergency services if anyone is injured. Take photos of the scene, vehicles, and any damage. Report the accident through the ZIBANA app as soon as it is safe to do so.",
      },
      {
        title: "Using the Relief Fund",
        content: "ZIBANA maintains a Driver Accident Relief Fund for verified accidents. After reporting, an admin will review your case. Payouts depend on fault determination and severity. A minimum trust score is required for eligibility.",
      },
      {
        title: "What to Avoid",
        content: "Do not leave the scene of an accident. Do not admit fault at the scene. Do not negotiate with the other party outside the app. False accident reports will result in immediate account suspension and trust score penalties.",
      },
    ],
  },
  {
    id: "trust-score",
    title: "Trust Score & Safety",
    icon: Star,
    sections: [
      {
        title: "How Your Trust Score Works",
        content: "Your trust score reflects your reliability and safety on the platform. It ranges from 0 to 100. Higher scores unlock more ride opportunities and rewards.",
      },
      {
        title: "Actions That Improve Your Score",
        content: "Returning lost items promptly, using Safe Return Hubs, maintaining high ratings, completing trips without incidents, and responding quickly to lost item reports all improve your trust score.",
      },
      {
        title: "Actions That Lower Your Score",
        content: "Denying items you actually have, false accident claims, frequent cancellations, low ratings, and reported safety incidents will decrease your trust score. Severe violations may lead to suspension.",
      },
    ],
  },
];

export default function DriverTraining() {
  const [, setLocation] = useLocation();
  const [expandedModule, setExpandedModule] = useState<string | null>(null);

  return (
    <DriverLayout>
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/driver/dashboard")} data-testid="button-back">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-blue-600" />
            <h1 className="text-xl font-bold" data-testid="text-training-title">Driver Training</h1>
          </div>
        </div>

        <Card data-testid="card-training-intro">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0 mt-0.5">
                <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="font-medium text-sm">Safety First</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Review these training modules to understand best practices for handling lost items, accidents, and maintaining your trust score on ZIBANA.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3">
          {TRAINING_MODULES.map((module) => (
            <Card key={module.id} data-testid={`card-module-${module.id}`}>
              <CardHeader
                className="cursor-pointer pb-2"
                onClick={() => setExpandedModule(expandedModule === module.id ? null : module.id)}
              >
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <module.icon className="h-4 w-4" />
                    {module.title}
                  </CardTitle>
                  <Button variant="ghost" size="icon" data-testid={`button-toggle-${module.id}`}>
                    {expandedModule === module.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </div>
              </CardHeader>
              {expandedModule === module.id && (
                <CardContent className="pt-0 space-y-4">
                  {module.sections.map((section, idx) => (
                    <div key={idx} className="space-y-1">
                      <p className="text-sm font-medium">{section.title}</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{section.content}</p>
                    </div>
                  ))}
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      </div>
    </DriverLayout>
  );
}
