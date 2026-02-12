import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  ArrowLeft,
  Phone,
  Mail,
  CalendarDays,
  Wallet,
} from "lucide-react";

type RiderWithDetails = {
  id: string;
  userId?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  phone?: string;
  createdAt?: string;
  paymentMethod?: string;
  walletBalance?: string;
  preferredLanguage?: string;
  country?: string;
};

export default function AdminRiderDetail({ riderId }: { riderId: string }) {
  const [, navigate] = useLocation();

  const { data: riders = [], isLoading } = useQuery<RiderWithDetails[]>({
    queryKey: ["/api/admin/riders"],
  });

  const rider = riders.find((r) => r.userId === riderId || r.id === riderId);

  function getInitials(name?: string): string {
    if (!name) return "?";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  }

  function formatDate(dateStr?: string | null): string {
    if (!dateStr) return "--";
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  const displayName = rider?.fullName || `${rider?.firstName || ""} ${rider?.lastName || ""}`.trim() || "--";

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="py-12 text-center text-sm text-muted-foreground">Loading rider details...</div>
      </div>
    );
  }

  if (!rider) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" onClick={() => navigate("/admin/users/riders")} data-testid="button-back">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Riders
        </Button>
        <div className="py-12 text-center text-sm text-muted-foreground" data-testid="text-not-found">
          Rider not found.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumb data-testid="breadcrumb-nav">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/admin/overview" data-testid="breadcrumb-admin">Admin</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/admin/users/riders" data-testid="breadcrumb-riders">Riders</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage data-testid="breadcrumb-current">{displayName}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center gap-4 border-b pb-4">
        <Avatar className="h-14 w-14">
          <AvatarFallback>{getInitials(displayName)}</AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-rider-name">{displayName}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Rider Profile</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card data-testid="card-contact">
          <CardHeader className="pb-3 gap-2">
            <CardTitle className="text-sm">Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm" data-testid="text-email">{rider.email || "--"}</span>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm" data-testid="text-phone">{rider.phone || "--"}</span>
            </div>
            <div className="flex items-center gap-3">
              <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm" data-testid="text-joined">Joined {formatDate(rider.createdAt)}</span>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-account">
          <CardHeader className="pb-3 gap-2">
            <CardTitle className="text-sm">Account Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <Wallet className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm" data-testid="text-payment">
                Payment: {rider.paymentMethod || "--"}
              </span>
            </div>
            {rider.walletBalance && (
              <div className="flex items-center gap-3">
                <Wallet className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm" data-testid="text-balance">
                  Balance: {rider.walletBalance}
                </span>
              </div>
            )}
            {rider.country && (
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-4 text-center shrink-0">CO</span>
                <span className="text-sm" data-testid="text-country">{rider.country}</span>
              </div>
            )}
            {rider.preferredLanguage && (
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-4 text-center shrink-0">LN</span>
                <span className="text-sm" data-testid="text-language">{rider.preferredLanguage}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
