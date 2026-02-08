import { useState } from "react";
import { DriverLayout } from "@/components/driver/DriverLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Eye, MapPin, BarChart3, Share2, Download, Info } from "lucide-react";
import { ZibraFloatingButton } from "@/components/rider/ZibraFloatingButton";

export default function DriverDataUsage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [locationSharing, setLocationSharing] = useState(true);
  const [analyticsSharing, setAnalyticsSharing] = useState(true);
  const [performanceData, setPerformanceData] = useState(true);
  const [thirdPartySharing, setThirdPartySharing] = useState(false);

  const handleToggle = (key: string, value: boolean) => {
    switch (key) {
      case "location": setLocationSharing(value); break;
      case "analytics": setAnalyticsSharing(value); break;
      case "performance": setPerformanceData(value); break;
      case "thirdParty": setThirdPartySharing(value); break;
    }
    toast({ title: "Preference saved" });
  };

  const dataItems = [
    {
      key: "location",
      icon: MapPin,
      label: "Location Data",
      desc: "Share location for ride matching and navigation",
      value: locationSharing,
      required: true,
    },
    {
      key: "analytics",
      icon: BarChart3,
      label: "Usage Analytics",
      desc: "Help improve the app with anonymized usage data",
      value: analyticsSharing,
      required: false,
    },
    {
      key: "performance",
      icon: Eye,
      label: "Performance Metrics",
      desc: "Share driving metrics with your regional director",
      value: performanceData,
      required: true,
    },
    {
      key: "thirdParty",
      icon: Share2,
      label: "Third-Party Sharing",
      desc: "Allow anonymized data for research and insights",
      value: thirdPartySharing,
      required: false,
    },
  ];

  return (
    <DriverLayout>
      <div className="p-4 space-y-5 max-w-lg mx-auto">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/driver/settings")}
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold" data-testid="text-page-title">Data Usage</h1>
        </div>

        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-1 mb-2">
            Data Sharing Controls
          </p>
          <Card>
            <CardContent className="p-4 space-y-4">
              {dataItems.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.key} className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-muted-foreground shrink-0 mt-0.5">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <Label className="text-sm font-medium">{item.label}</Label>
                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                        {item.required && (
                          <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">Required for platform operation</p>
                        )}
                      </div>
                    </div>
                    <Switch
                      checked={item.value}
                      onCheckedChange={(val) => handleToggle(item.key, val)}
                      disabled={item.required}
                      data-testid={`switch-data-${item.key}`}
                    />
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-1 mb-2">
            Your Data
          </p>
          <Card>
            <CardContent className="p-0 divide-y">
              <button
                className="w-full p-4 flex items-center gap-3 hover-elevate cursor-pointer"
                onClick={() => toast({ title: "Request submitted", description: "We'll email you a copy of your data within 30 days." })}
                data-testid="button-download-data"
              >
                <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-muted-foreground shrink-0">
                  <Download className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="font-medium text-sm">Download My Data</p>
                  <p className="text-xs text-muted-foreground">Request a copy of all your personal data</p>
                </div>
              </button>
            </CardContent>
          </Card>
        </div>

        <Card className="border-blue-200 dark:border-blue-800">
          <CardContent className="flex items-start gap-3 pt-4">
            <Info className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
            <p className="text-sm text-muted-foreground" data-testid="text-data-info">
              Location and performance data are required for ride matching and safety monitoring. You can control optional data sharing above. For more details, see our Privacy Policy.
            </p>
          </CardContent>
        </Card>

        <ZibraFloatingButton />
      </div>
    </DriverLayout>
  );
}
