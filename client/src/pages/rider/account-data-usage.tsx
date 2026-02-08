import { RiderLayout } from "@/components/rider/RiderLayout";
import { RiderRouteGuard } from "@/components/rider/RiderRouteGuard";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Eye, ExternalLink, MapPin, CreditCard, BarChart3 } from "lucide-react";
import { useLocation } from "wouter";

export default function AccountDataUsage() {
  const [, setLocation] = useLocation();

  const dataItems = [
    {
      icon: MapPin,
      title: "Location Data",
      description: "We use your location to match you with nearby drivers, calculate fares, and provide navigation during rides.",
    },
    {
      icon: CreditCard,
      title: "Payment Information",
      description: "Your payment details are securely stored and processed to facilitate ride payments and wallet transactions.",
    },
    {
      icon: BarChart3,
      title: "Usage Analytics",
      description: "We collect anonymized usage data to improve our services, optimize routes, and enhance your overall experience.",
    },
  ];

  return (
    <RiderRouteGuard>
      <RiderLayout>
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/rider/account")}
              data-testid="button-back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold">Data Usage</h1>
          </div>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center">
                  <Eye className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium text-sm">How ZIBA Uses Your Data</p>
                  <p className="text-xs text-muted-foreground">Transparency about your information</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                ZIBA is committed to protecting your privacy. Below is a summary of how we collect and use your data to provide our services.
              </p>
            </CardContent>
          </Card>

          {dataItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <Card key={index}>
                <CardContent className="p-4">
                  <div className="flex gap-3">
                    <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-sm mb-1" data-testid={`text-data-title-${index}`}>
                        {item.title}
                      </p>
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          <Card>
            <CardContent className="p-0">
              <button
                className="w-full p-4 flex items-center gap-3 hover-elevate"
                onClick={() => setLocation("/legal")}
                data-testid="button-privacy-policy"
              >
                <ExternalLink className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium text-sm">View Privacy Policy</span>
              </button>
            </CardContent>
          </Card>
        </div>
      </RiderLayout>
    </RiderRouteGuard>
  );
}
