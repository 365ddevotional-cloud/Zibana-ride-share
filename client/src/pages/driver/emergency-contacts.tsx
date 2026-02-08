import { useState } from "react";
import { DriverLayout } from "@/components/driver/DriverLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Phone, Plus, Trash2, Shield, User, Info } from "lucide-react";
import { ZibraFloatingButton } from "@/components/rider/ZibraFloatingButton";

interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relationship: string;
}

export default function DriverEmergencyContacts() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newContact, setNewContact] = useState({ name: "", phone: "", relationship: "" });

  const [contacts, setContacts] = useState<EmergencyContact[]>([
    { id: "1", name: "Emergency Services", phone: "112", relationship: "Emergency" },
  ]);

  const handleAddContact = () => {
    if (!newContact.name || !newContact.phone) {
      toast({ title: "Please fill in name and phone number", variant: "destructive" });
      return;
    }
    const contact: EmergencyContact = {
      id: Date.now().toString(),
      name: newContact.name,
      phone: newContact.phone,
      relationship: newContact.relationship || "Other",
    };
    setContacts((prev) => [...prev, contact]);
    setNewContact({ name: "", phone: "", relationship: "" });
    setAddDialogOpen(false);
    toast({ title: "Emergency contact added" });
  };

  const handleRemoveContact = (id: string) => {
    if (id === "1") {
      toast({ title: "Cannot remove", description: "Emergency services contact is required.", variant: "destructive" });
      return;
    }
    setContacts((prev) => prev.filter((c) => c.id !== id));
    toast({ title: "Contact removed" });
  };

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
          <h1 className="text-xl font-bold" data-testid="text-page-title">Emergency Contacts</h1>
        </div>

        <Card className="bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800">
          <CardContent className="flex items-start gap-3 pt-4">
            <Shield className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">Your safety matters</p>
              <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">
                Emergency contacts will be notified if you trigger an SOS alert during a ride. Keep this list up to date.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-1">
          <div className="flex items-center justify-between px-1 mb-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Contacts ({contacts.length})
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAddDialogOpen(true)}
              data-testid="button-add-contact"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>

          {contacts.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                <Phone className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-sm font-medium">No emergency contacts</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Add contacts who should be notified in emergencies
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {contacts.map((contact) => (
                <Card key={contact.id} data-testid={`card-contact-${contact.id}`}>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground shrink-0">
                          <User className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate" data-testid={`text-contact-name-${contact.id}`}>
                            {contact.name}
                          </p>
                          <p className="text-xs text-muted-foreground" data-testid={`text-contact-phone-${contact.id}`}>
                            {contact.phone}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {contact.relationship}
                          </p>
                        </div>
                      </div>
                      {contact.id !== "1" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive shrink-0"
                          onClick={() => handleRemoveContact(contact.id)}
                          data-testid={`button-remove-contact-${contact.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <Card className="border-blue-200 dark:border-blue-800">
          <CardContent className="flex items-start gap-3 pt-4">
            <Info className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
            <p className="text-sm text-muted-foreground" data-testid="text-emergency-info">
              In an emergency, use the SOS button in the app. Your emergency contacts and local emergency services will be alerted immediately.
            </p>
          </CardContent>
        </Card>

        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Add Emergency Contact</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label>Full Name</Label>
                <Input
                  placeholder="Contact name"
                  value={newContact.name}
                  onChange={(e) => setNewContact((prev) => ({ ...prev, name: e.target.value }))}
                  className="mt-1.5"
                  data-testid="input-contact-name"
                />
              </div>
              <div>
                <Label>Phone Number</Label>
                <Input
                  placeholder="+234 800 000 0000"
                  value={newContact.phone}
                  onChange={(e) => setNewContact((prev) => ({ ...prev, phone: e.target.value }))}
                  className="mt-1.5"
                  data-testid="input-contact-phone"
                />
              </div>
              <div>
                <Label>Relationship</Label>
                <Input
                  placeholder="e.g. Spouse, Parent, Friend"
                  value={newContact.relationship}
                  onChange={(e) => setNewContact((prev) => ({ ...prev, relationship: e.target.value }))}
                  className="mt-1.5"
                  data-testid="input-contact-relationship"
                />
              </div>
            </div>
            <DialogFooter className="flex gap-2">
              <Button variant="outline" onClick={() => setAddDialogOpen(false)} data-testid="button-cancel-add">
                Cancel
              </Button>
              <Button onClick={handleAddContact} data-testid="button-confirm-add">
                Add Contact
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <ZibraFloatingButton />
      </div>
    </DriverLayout>
  );
}
