import { DriverLayout } from "@/components/driver/DriverLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { ArrowLeft, FileCheck, Info, ShieldCheck, CreditCard, MapPin, Fingerprint } from "lucide-react";
import { ZibraFloatingButton } from "@/components/rider/ZibraFloatingButton";

function getDocBadge(verified: boolean | undefined, status?: string) {
  if (status === "rejected") {
    return <Badge className="bg-red-600 text-white no-default-hover-elevate" data-testid="badge-rejected">Rejected</Badge>;
  }
  if (status === "pending") {
    return <Badge className="bg-yellow-500 text-white no-default-hover-elevate" data-testid="badge-pending">Pending</Badge>;
  }
  if (verified) {
    return <Badge className="bg-green-600 text-white no-default-hover-elevate" data-testid="badge-verified">Verified</Badge>;
  }
  return <Badge variant="secondary" className="no-default-hover-elevate" data-testid="badge-unverified">Unverified</Badge>;
}

interface DriverProfile {
  verificationStatus: string;
  isNINVerified: boolean;
  isDriversLicenseVerified: boolean;
  isAddressVerified: boolean;
  isIdentityVerified: boolean;
}

export default function DriverDocuments() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  const { data: profile, isLoading } = useQuery<DriverProfile>({
    queryKey: ["/api/driver/profile"],
    enabled: !!user,
  });

  const documents = [
    {
      id: "identity",
      title: "Identity Verification",
      icon: Fingerprint,
      verified: profile?.isIdentityVerified,
      status: profile?.verificationStatus,
      description: "Government-issued ID verification for your account.",
    },
    {
      id: "drivers-license",
      title: "Driver's License",
      icon: CreditCard,
      verified: profile?.isDriversLicenseVerified,
      description: "Valid driver's license required to operate on the platform.",
    },
    {
      id: "nin",
      title: "NIN Verification",
      icon: ShieldCheck,
      verified: profile?.isNINVerified,
      description: "National Identification Number verification.",
    },
    {
      id: "address",
      title: "Address Verification",
      icon: MapPin,
      verified: profile?.isAddressVerified,
      description: "Proof of residential address on file.",
    },
  ];

  return (
    <DriverLayout>
      <div className="p-4 space-y-5 max-w-lg mx-auto">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/driver/account")}
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold" data-testid="text-page-title">Documents</h1>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardContent className="pt-4 space-y-2">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-5 w-20" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {documents.map((doc) => {
              const Icon = doc.icon;
              return (
                <Card key={doc.id} data-testid={`card-document-${doc.id}`}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="flex items-start gap-3">
                        <Icon className="h-5 w-5 mt-0.5 text-muted-foreground shrink-0" />
                        <div className="space-y-1">
                          <h3 className="text-sm font-semibold" data-testid={`text-doc-title-${doc.id}`}>{doc.title}</h3>
                          <p className="text-xs text-muted-foreground" data-testid={`text-doc-desc-${doc.id}`}>{doc.description}</p>
                        </div>
                      </div>
                      {getDocBadge(doc.verified, doc.status)}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <Card className="border-blue-200 dark:border-blue-800">
          <CardContent className="flex items-start gap-3 pt-4">
            <Info className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
            <p className="text-sm text-muted-foreground" data-testid="text-info-note">
              Document verification is handled by your regional director. Contact support if you need to update documents.
            </p>
          </CardContent>
        </Card>

        <ZibraFloatingButton />
      </div>
    </DriverLayout>
  );
}
