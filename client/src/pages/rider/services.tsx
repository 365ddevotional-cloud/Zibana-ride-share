import { RiderLayout } from "@/components/rider/RiderLayout";
import { RiderRouteGuard } from "@/components/rider/RiderRouteGuard";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Building2, Star, ChevronRight } from "lucide-react";
import { useLocation } from "wouter";

export default function Services() {
  const [, setLocation] = useLocation();

  return (
    <RiderRouteGuard>
      <RiderLayout>
        <div className="p-4 space-y-6">
          <div className="pt-4 pb-2">
            <h1 className="text-2xl font-bold" data-testid="text-services-heading">
              Services
            </h1>
            <p className="text-muted-foreground mt-1" data-testid="text-services-subtitle">
              Choose a ride option
            </p>
          </div>

          <Card className="shadow-sm hover-elevate cursor-pointer" onClick={() => setLocation("/rider/schedule")} data-testid="card-schedule-service">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Calendar className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium" data-testid="text-schedule-service-title">Schedule a Ride</p>
                      <Badge variant="default" className="bg-green-600 hover:bg-green-700 text-white" data-testid="badge-schedule-popular">
                        Popular
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground" data-testid="text-schedule-service-description">
                      Book your trip in advance for a guaranteed pickup
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" data-testid="icon-schedule-chevron" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm hover-elevate cursor-pointer" onClick={() => setLocation("/rider/corporate")} data-testid="card-corporate-service">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <Building2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium" data-testid="text-corporate-service-title">Corporate Rides</p>
                      <Badge variant="secondary" data-testid="badge-corporate-new">
                        New
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground" data-testid="text-corporate-service-description">
                      Travel on your company's account with monthly invoicing
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" data-testid="icon-corporate-chevron" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm hover-elevate cursor-pointer" onClick={() => setLocation("/rider/special")} data-testid="card-special-service">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                    <Star className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium" data-testid="text-special-service-title">Special Rides</p>
                      <Badge variant="secondary" data-testid="badge-special-new">
                        New
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground" data-testid="text-special-service-description">
                      Premium, group, and event transportation options
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" data-testid="icon-special-chevron" />
              </div>
            </CardContent>
          </Card>
        </div>
      </RiderLayout>
    </RiderRouteGuard>
  );
}
