import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  ShieldCheck,
  Smartphone,
  HeartHandshake,
  Wallet,
  Eye,
} from "lucide-react";

const TRAINING_CATEGORIES = [
  {
    id: "driver-onboarding",
    title: "Driver Onboarding",
    description: "Getting started guide for new drivers. Covers account setup, vehicle registration, and first trip walkthrough.",
    category: "Onboarding",
    icon: BookOpen,
    accent: "text-blue-600 dark:text-blue-400",
  },
  {
    id: "safety-protocols",
    title: "Safety Protocols",
    description: "Safety guidelines and emergency procedures. Includes SOS features, incident reporting, and rider verification steps.",
    category: "Safety",
    icon: ShieldCheck,
    accent: "text-red-600 dark:text-red-400",
  },
  {
    id: "app-navigation",
    title: "App Navigation",
    description: "How to use the ZIBA driver app. Covers ride acceptance, navigation integration, earnings tracking, and settings.",
    category: "Technical",
    icon: Smartphone,
    accent: "text-purple-600 dark:text-purple-400",
  },
  {
    id: "customer-service",
    title: "Customer Service",
    description: "Best practices for rider interactions. Covers communication etiquette, handling complaints, and earning high ratings.",
    category: "Service",
    icon: HeartHandshake,
    accent: "text-green-600 dark:text-green-400",
  },
  {
    id: "earnings-payouts",
    title: "Earnings & Payouts",
    description: "Understanding the payment system. Covers fare breakdown, payout schedules, wallet management, and tax statements.",
    category: "Finance",
    icon: Wallet,
    accent: "text-amber-600 dark:text-amber-400",
  },
];

export default function UsersTrainingCenterPage() {
  return (
    <div className="space-y-6">
      <Card className="rounded-xl border-slate-200 dark:border-slate-700" data-testid="card-training-overview">
        <CardContent className="pt-4 pb-4 px-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Training Resources</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {TRAINING_CATEGORIES.length} categories available for driver training and development
              </p>
            </div>
            <Badge variant="secondary" data-testid="badge-total-categories">
              {TRAINING_CATEGORIES.length} Categories
            </Badge>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="training-categories-grid">
        {TRAINING_CATEGORIES.map((cat) => (
          <Card
            key={cat.id}
            className="rounded-xl border-slate-200 dark:border-slate-700"
            data-testid={`card-category-${cat.id}`}
          >
            <CardHeader className="gap-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <cat.icon className={`h-5 w-5 shrink-0 ${cat.accent}`} />
                  <CardTitle className="text-sm">{cat.title}</CardTitle>
                </div>
                <Badge variant="secondary" className="text-xs" data-testid={`badge-category-${cat.id}`}>
                  {cat.category}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-400" data-testid={`text-description-${cat.id}`}>
                {cat.description}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                data-testid={`button-view-${cat.id}`}
              >
                <Eye className="h-4 w-4 mr-2" />
                View Materials
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
