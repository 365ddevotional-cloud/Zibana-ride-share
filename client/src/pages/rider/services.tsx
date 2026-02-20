import { useTranslation } from "@/i18n";
import { RiderLayout } from "@/components/rider/RiderLayout";
import { RiderRouteGuard } from "@/components/rider/RiderRouteGuard";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Building2, Sparkles, ChevronRight } from "lucide-react";
import { useLocation } from "wouter";

export default function Services() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();

  return (
    <RiderRouteGuard>
      <RiderLayout>
        <div className="p-4 space-y-5">
          <div className="pt-4 pb-3">
            <h1 className="text-2xl font-bold tracking-tight" data-testid="text-services-heading">
              {t("services.title")}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm" data-testid="text-services-subtitle">
              {t("services.subtitle")}
            </p>
          </div>

          <div className="space-y-3">
            <Card className="shadow-sm hover-elevate cursor-pointer border" onClick={() => setLocation("/rider/schedule")} data-testid="card-schedule-service">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Calendar className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm" data-testid="text-schedule-service-title">{t("services.scheduleRide")}</p>
                        <Badge variant="default" className="bg-green-600 text-white text-[10px]" data-testid="badge-schedule-popular">
                          Popular
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5" data-testid="text-schedule-service-description">
                        {t("services.scheduleDesc")}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" data-testid="icon-schedule-chevron" />
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm hover-elevate cursor-pointer border" onClick={() => setLocation("/rider/services/corporate")} data-testid="card-corporate-service">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center shrink-0">
                      <Building2 className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm" data-testid="text-corporate-service-title">{t("services.corporateRides")}</p>
                        <Badge variant="secondary" className="text-[10px]" data-testid="badge-corporate-new">
                          New
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5" data-testid="text-corporate-service-description">
                        {t("services.corporateDesc")}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" data-testid="icon-corporate-chevron" />
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm hover-elevate cursor-pointer border" onClick={() => setLocation("/rider/services/special")} data-testid="card-special-service">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center shrink-0">
                      <Sparkles className="h-6 w-6 text-violet-600 dark:text-violet-400" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm" data-testid="text-special-service-title">{t("services.specialRides")}</p>
                        <Badge variant="secondary" className="text-[10px]" data-testid="badge-special-explore">
                          6 Classes
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5" data-testid="text-special-service-description">
                        {t("services.specialDesc")}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" data-testid="icon-special-chevron" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </RiderLayout>
    </RiderRouteGuard>
  );
}
