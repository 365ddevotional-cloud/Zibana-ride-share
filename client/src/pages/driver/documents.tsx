import { useState, useRef, useCallback } from "react";
import { DriverLayout } from "@/components/driver/DriverLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { ArrowLeft, Info, ShieldCheck, CreditCard, MapPin, Fingerprint, Upload, RefreshCw, AlertTriangle, Loader2 } from "lucide-react";
import { ZibraFloatingButton } from "@/components/rider/ZibraFloatingButton";

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/pdf",
];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

function getDocBadge(verified: boolean | undefined, status?: string, expired?: boolean, submitted?: boolean, isTraining?: boolean) {
  if (isTraining) {
    return <Badge className="bg-blue-600 text-white no-default-hover-elevate" data-testid="badge-test-approved">Approved (Test Mode)</Badge>;
  }
  if (expired) {
    return <Badge className="bg-red-600 text-white no-default-hover-elevate" data-testid="badge-expired">Expired</Badge>;
  }
  if (status === "rejected") {
    return <Badge className="bg-red-600 text-white no-default-hover-elevate" data-testid="badge-rejected">Rejected</Badge>;
  }
  if (verified) {
    return <Badge className="bg-green-600 text-white no-default-hover-elevate" data-testid="badge-verified">Verified</Badge>;
  }
  if (submitted) {
    return <Badge className="bg-yellow-500 text-white no-default-hover-elevate" data-testid="badge-pending-review">Pending Review</Badge>;
  }
  if (status === "pending") {
    return <Badge className="bg-yellow-500 text-white no-default-hover-elevate" data-testid="badge-pending">Pending</Badge>;
  }
  return <Badge variant="secondary" className="no-default-hover-elevate" data-testid="badge-unverified">Not Submitted</Badge>;
}

interface DriverProfile {
  verificationStatus: string;
  isNINVerified: boolean;
  isDriversLicenseVerified: boolean;
  isAddressVerified: boolean;
  isIdentityVerified: boolean;
  identityDocSubmitted: boolean;
  driversLicenseDocSubmitted: boolean;
  ninDocSubmitted: boolean;
  addressDocSubmitted: boolean;
  isTraining?: boolean;
}

export default function DriverDocuments() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingDocRef = useRef<string | null>(null);

  const { data: profile, isLoading } = useQuery<DriverProfile>({
    queryKey: ["/api/driver/profile"],
    enabled: !!user,
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ documentType, fileData }: { documentType: string; fileData: string }) => {
      const res = await fetch("/api/driver/document/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentType, fileData }),
        credentials: "include",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message || `Upload failed (${res.status})`);
      }
      return res.json();
    },
    onSuccess: (data: any) => {
      const isApproved = data?.status === "approved";
      toast({
        title: isApproved ? "Document approved" : "Document submitted for review",
        description: isApproved ? "Your document has been automatically approved." : "You'll be notified once your document is verified.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/driver/profile"] });
      setUploadingDoc(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload document. Please try again.",
        variant: "destructive",
      });
      setUploadingDoc(null);
    },
  });

  const documents = [
    {
      id: "identity",
      title: "Identity Verification",
      icon: Fingerprint,
      verified: profile?.isIdentityVerified,
      submitted: profile?.identityDocSubmitted,
      status: profile?.verificationStatus,
      description: "Government-issued photo ID (passport, national ID, or voter's card).",
      expired: false,
    },
    {
      id: "drivers-license",
      title: "Driver's License",
      icon: CreditCard,
      verified: profile?.isDriversLicenseVerified,
      submitted: profile?.driversLicenseDocSubmitted,
      description: "Valid driver's license required to operate on the platform.",
      expired: false,
    },
    {
      id: "nin",
      title: "NIN Verification",
      icon: ShieldCheck,
      verified: profile?.isNINVerified,
      submitted: profile?.ninDocSubmitted,
      description: "National Identification Number slip or card.",
      expired: false,
    },
    {
      id: "address",
      title: "Address Verification",
      icon: MapPin,
      verified: profile?.isAddressVerified,
      submitted: profile?.addressDocSubmitted,
      description: "Proof of residential address (utility bill or bank statement, within 3 months).",
      expired: false,
    },
  ];

  const handleUpload = useCallback((docId: string) => {
    if (uploadingDoc) return;
    pendingDocRef.current = docId;
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  }, [uploadingDoc]);

  const handleFileSelected = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const docId = pendingDocRef.current;

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    if (!file || !docId) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please select a JPG, PNG, WebP, HEIC, or PDF file.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: "File too large",
        description: "Please select a file under 10MB.",
        variant: "destructive",
      });
      return;
    }

    setUploadingDoc(docId);
    const reader = new FileReader();
    reader.onload = () => {
      const fileData = reader.result as string;
      if (!fileData || !fileData.startsWith("data:")) {
        toast({
          title: "Read error",
          description: "Failed to process the selected file.",
          variant: "destructive",
        });
        setUploadingDoc(null);
        return;
      }
      uploadMutation.mutate({ documentType: docId, fileData });
    };
    reader.onerror = () => {
      toast({
        title: "Read error",
        description: "Failed to read the selected file.",
        variant: "destructive",
      });
      setUploadingDoc(null);
    };
    reader.readAsDataURL(file);
  }, [toast, uploadMutation]);

  return (
    <DriverLayout>
      <div className="p-4 space-y-5 max-w-lg mx-auto">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf"
          className="hidden"
          onChange={handleFileSelected}
          data-testid="input-file-picker"
        />

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
              const isVerified = doc.verified;
              const isExpired = doc.expired;
              const isUploading = uploadingDoc === doc.id;
              return (
                <Card key={doc.id} data-testid={`card-document-${doc.id}`}>
                  <CardContent className="pt-4 space-y-3">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-muted-foreground shrink-0">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="space-y-1 min-w-0">
                          <h3 className="text-sm font-semibold" data-testid={`text-doc-title-${doc.id}`}>{doc.title}</h3>
                          <p className="text-xs text-muted-foreground" data-testid={`text-doc-desc-${doc.id}`}>{doc.description}</p>
                        </div>
                      </div>
                      {getDocBadge(doc.verified, doc.status, doc.expired, doc.submitted, profile?.isTraining)}
                    </div>

                    {isExpired && !profile?.isTraining && (
                      <div className="flex items-start gap-2 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-md p-2.5">
                        <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                        <p className="text-xs text-red-800 dark:text-red-200">
                          This document has expired. Please upload a current version to continue driving.
                        </p>
                      </div>
                    )}

                    {!profile?.isTraining && (
                    <div className="flex gap-2">
                      {isVerified && !isExpired ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUpload(doc.id)}
                          disabled={isUploading}
                          data-testid={`button-replace-${doc.id}`}
                        >
                          {isUploading ? (
                            <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                          ) : (
                            <RefreshCw className="h-3.5 w-3.5 mr-1" />
                          )}
                          {isUploading ? "Uploading..." : "Replace"}
                        </Button>
                      ) : doc.submitted && !isExpired ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled
                          data-testid={`button-submitted-${doc.id}`}
                        >
                          <Loader2 className="h-3.5 w-3.5 mr-1" />
                          Awaiting Review
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          className="bg-emerald-600"
                          onClick={() => handleUpload(doc.id)}
                          disabled={isUploading}
                          data-testid={`button-upload-${doc.id}`}
                        >
                          {isUploading ? (
                            <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                          ) : (
                            <Upload className="h-3.5 w-3.5 mr-1" />
                          )}
                          {isUploading ? "Uploading..." : isExpired ? "Re-upload" : "Upload"}
                        </Button>
                      )}
                    </div>
                    )}
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
              Document verification is handled by your regional director. Submissions are typically reviewed within 1-3 business days.
            </p>
          </CardContent>
        </Card>

        <ZibraFloatingButton />
      </div>
    </DriverLayout>
  );
}
