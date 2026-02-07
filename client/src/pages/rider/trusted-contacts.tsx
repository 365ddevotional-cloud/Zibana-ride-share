import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { UserPlus, Phone, Trash2, Edit, Shield, Heart, Users } from "lucide-react";

interface TrustedContact {
  id: number;
  name: string;
  phone: string;
  relationship?: string | null;
  isEmergencyContact: boolean;
}

interface ContactFormData {
  name: string;
  phone: string;
  relationship: string;
  isEmergencyContact: boolean;
}

const emptyForm: ContactFormData = {
  name: "",
  phone: "",
  relationship: "",
  isEmergencyContact: false,
};

export default function TrustedContactsPage() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<TrustedContact | null>(null);
  const [formData, setFormData] = useState<ContactFormData>(emptyForm);

  const { data: contacts = [], isLoading } = useQuery<TrustedContact[]>({
    queryKey: ["/api/trusted-contacts"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: ContactFormData) => {
      const res = await apiRequest("POST", "/api/trusted-contacts", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trusted-contacts"] });
      toast({ title: "Contact added", description: "Trusted contact has been added successfully." });
      closeDialog();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to add contact", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: ContactFormData }) => {
      const res = await apiRequest("PATCH", `/api/trusted-contacts/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trusted-contacts"] });
      toast({ title: "Contact updated", description: "Trusted contact has been updated successfully." });
      closeDialog();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update contact", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/trusted-contacts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trusted-contacts"] });
      toast({ title: "Contact removed", description: "Trusted contact has been removed." });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to remove contact", description: error.message, variant: "destructive" });
    },
  });

  function closeDialog() {
    setDialogOpen(false);
    setEditingContact(null);
    setFormData(emptyForm);
  }

  function openAddDialog() {
    setEditingContact(null);
    setFormData(emptyForm);
    setDialogOpen(true);
  }

  function openEditDialog(contact: TrustedContact) {
    setEditingContact(contact);
    setFormData({
      name: contact.name,
      phone: contact.phone,
      relationship: contact.relationship || "",
      isEmergencyContact: contact.isEmergencyContact,
    });
    setDialogOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim()) {
      toast({ title: "Validation error", description: "Name and phone are required.", variant: "destructive" });
      return;
    }
    if (editingContact) {
      updateMutation.mutate({ id: editingContact.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  }

  const atLimit = contacts.length >= 5;
  const isSaving = createMutation.isPending || updateMutation.isPending;

  if (isLoading) {
    return (
      <div className="p-4 space-y-4" data-testid="loading-skeleton">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-9 w-32" />
        </div>
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="space-y-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4" data-testid="trusted-contacts-page">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-muted-foreground" />
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Trusted Contacts</h1>
        </div>
        <Button
          onClick={openAddDialog}
          disabled={atLimit}
          data-testid="button-add-contact"
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Add Contact
        </Button>
      </div>

      {atLimit && (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground" data-testid="text-limit-warning">
              You have reached the maximum of 5 trusted contacts. Remove a contact to add a new one.
            </p>
          </CardContent>
        </Card>
      )}

      {contacts.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No trusted contacts"
          description="Add trusted contacts who can be reached in case of an emergency during your trips."
          action={
            <Button onClick={openAddDialog} data-testid="button-add-first-contact">
              <UserPlus className="h-4 w-4 mr-2" />
              Add Your First Contact
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {contacts.map((contact) => (
            <Card key={contact.id} data-testid={`card-contact-${contact.id}`}>
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                <CardTitle className="text-base font-medium flex items-center gap-2 flex-wrap">
                  <span data-testid={`text-contact-name-${contact.id}`}>{contact.name}</span>
                  {contact.isEmergencyContact && (
                    <Badge variant="destructive" data-testid={`badge-emergency-${contact.id}`}>
                      <Heart className="h-3 w-3 mr-1" />
                      Emergency
                    </Badge>
                  )}
                </CardTitle>
                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => openEditDialog(contact)}
                    data-testid={`button-edit-contact-${contact.id}`}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => deleteMutation.mutate(contact.id)}
                    disabled={deleteMutation.isPending}
                    data-testid={`button-delete-contact-${contact.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5" />
                    <span data-testid={`text-contact-phone-${contact.id}`}>{contact.phone}</span>
                  </div>
                  {contact.relationship && (
                    <div className="flex items-center gap-2">
                      <Users className="h-3.5 w-3.5" />
                      <span data-testid={`text-contact-relationship-${contact.id}`}>{contact.relationship}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent data-testid="dialog-contact-form">
          <DialogHeader>
            <DialogTitle data-testid="text-dialog-title">
              {editingContact ? "Edit Contact" : "Add Trusted Contact"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="contact-name">Name</Label>
              <Input
                id="contact-name"
                placeholder="Contact name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                data-testid="input-contact-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-phone">Phone</Label>
              <Input
                id="contact-phone"
                placeholder="Phone number"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
                data-testid="input-contact-phone"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-relationship">Relationship</Label>
              <Input
                id="contact-relationship"
                placeholder="e.g. Spouse, Parent, Friend"
                value={formData.relationship}
                onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
                data-testid="input-contact-relationship"
              />
            </div>
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="emergency-switch" className="flex items-center gap-2">
                <Heart className="h-4 w-4" />
                Emergency Contact
              </Label>
              <Switch
                id="emergency-switch"
                checked={formData.isEmergencyContact}
                onCheckedChange={(checked) => setFormData({ ...formData, isEmergencyContact: checked })}
                data-testid="switch-emergency-contact"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={closeDialog} data-testid="button-cancel">
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving} data-testid="button-save-contact">
                {isSaving ? "Saving..." : editingContact ? "Update" : "Add Contact"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
