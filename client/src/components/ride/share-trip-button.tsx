import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Share2, Copy, Link, Users, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ShareTripButtonProps {
  tripId: string;
}

export function ShareTripButton({ tripId }: ShareTripButtonProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);
  const { toast } = useToast();

  const { data: trustedContacts, isLoading: contactsLoading } = useQuery<any[]>({
    queryKey: ["/api/trusted-contacts"],
    enabled: dialogOpen,
  });

  const { data: shareLinks, isLoading: linksLoading } = useQuery<any[]>({
    queryKey: ["/api/trips", tripId, "share-links"],
    enabled: dialogOpen,
  });

  const createShareLinkMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/trips/${tripId}/share`);
      return await res.json();
    },
    onSuccess: (data) => {
      const shareUrl = `${window.location.origin}/trip-share/${data.shareToken}`;
      navigator.clipboard.writeText(shareUrl).then(() => {
        toast({
          title: "Link Copied",
          description: "Share link has been copied to your clipboard.",
        });
      }).catch(() => {
        toast({
          title: "Link Created",
          description: shareUrl,
        });
      });
      queryClient.invalidateQueries({ queryKey: ["/api/trips", tripId, "share-links"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create share link",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const shareWithContactMutation = useMutation({
    mutationFn: async (contactId: string) => {
      const res = await apiRequest("POST", `/api/trips/${tripId}/share`, { contactId });
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Trip Shared",
        description: "Your trip has been shared with the selected contact.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/trips", tripId, "share-links"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to share trip",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deactivateLinkMutation = useMutation({
    mutationFn: async (linkId: string) => {
      await apiRequest("DELETE", `/api/trip-share/${linkId}`);
    },
    onSuccess: () => {
      toast({
        title: "Link Deactivated",
        description: "The share link has been deactivated.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/trips", tripId, "share-links"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to deactivate link",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCopyExistingLink = (shareToken: string, linkId: string) => {
    const shareUrl = `${window.location.origin}/trip-share/${shareToken}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopiedLinkId(linkId);
      setTimeout(() => setCopiedLinkId(null), 2000);
      toast({
        title: "Link Copied",
        description: "Share link has been copied to your clipboard.",
      });
    }).catch(() => {
      toast({
        title: "Share Link",
        description: shareUrl,
      });
    });
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setDialogOpen(true)}
        data-testid="button-share-trip"
      >
        <Share2 className="h-4 w-4 mr-2" />
        Share Trip
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md" data-testid="dialog-share-trip">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5" />
              Share Trip
            </DialogTitle>
            <DialogDescription>
              Share your trip status with trusted contacts or create a shareable link.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <Button
              className="w-full"
              onClick={() => createShareLinkMutation.mutate()}
              disabled={createShareLinkMutation.isPending}
              data-testid="button-copy-share-link"
            >
              <Copy className="h-4 w-4 mr-2" />
              {createShareLinkMutation.isPending ? "Creating Link..." : "Copy Share Link"}
            </Button>

            <div className="space-y-2">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4" />
                Share with Trusted Contacts
              </h4>
              {contactsLoading ? (
                <p className="text-sm text-muted-foreground" data-testid="text-contacts-loading">
                  Loading contacts...
                </p>
              ) : trustedContacts && trustedContacts.length > 0 ? (
                <div className="space-y-2" data-testid="list-trusted-contacts">
                  {trustedContacts.map((contact: any) => (
                    <div
                      key={contact.id}
                      className="flex items-center justify-between gap-2 rounded-md border p-2"
                      data-testid={`contact-item-${contact.id}`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{contact.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {contact.phone || contact.email}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => shareWithContactMutation.mutate(contact.id)}
                        disabled={shareWithContactMutation.isPending}
                        data-testid={`button-share-contact-${contact.id}`}
                      >
                        <Share2 className="h-3 w-3 mr-1" />
                        Share
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground" data-testid="text-no-contacts">
                  No trusted contacts found.
                </p>
              )}
            </div>

            {!linksLoading && shareLinks && shareLinks.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Link className="h-4 w-4" />
                  Active Share Links
                </h4>
                <div className="space-y-2" data-testid="list-share-links">
                  {shareLinks.map((link: any) => (
                    <div
                      key={link.id}
                      className="flex items-center justify-between gap-2 rounded-md border p-2"
                      data-testid={`share-link-item-${link.id}`}
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Badge variant="secondary">
                          {link.contactName || "Anyone"}
                        </Badge>
                        <span className="text-xs text-muted-foreground truncate">
                          {link.shareToken?.slice(0, 8)}...
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleCopyExistingLink(link.shareToken, link.id)}
                          data-testid={`button-copy-link-${link.id}`}
                        >
                          {copiedLinkId === link.id ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => deactivateLinkMutation.mutate(link.id)}
                          disabled={deactivateLinkMutation.isPending}
                          data-testid={`button-deactivate-link-${link.id}`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
