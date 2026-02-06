import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Globe,
  Settings,
  Plus,
  Pencil,
  Trash2,
  ShieldCheck,
  Check,
  X,
} from "lucide-react";

type CountryTaxConfig = {
  id: number;
  countryCode: string;
  countryName: string;
  taxDocumentsEnabled: boolean;
  documentType: string;
  documentLabel: string;
  currency: string;
  deliveryMethod: string;
  mileageDisclosureEnabled: boolean;
  withholdingEnabled: boolean;
  complianceNotes: string | null;
  driverClassificationLabel: string;
  reportableIncomeIncludesFees: boolean;
  createdAt: string;
  updatedAt: string;
};

type ConfigForm = {
  countryCode: string;
  countryName: string;
  taxDocumentsEnabled: boolean;
  documentType: string;
  documentLabel: string;
  currency: string;
  deliveryMethod: string;
  mileageDisclosureEnabled: boolean;
  withholdingEnabled: boolean;
  complianceNotes: string;
  driverClassificationLabel: string;
  reportableIncomeIncludesFees: boolean;
};

const emptyForm: ConfigForm = {
  countryCode: "",
  countryName: "",
  taxDocumentsEnabled: true,
  documentType: "annual_statement",
  documentLabel: "Annual Earnings & Tax Summary",
  currency: "",
  deliveryMethod: "in_app",
  mileageDisclosureEnabled: true,
  withholdingEnabled: false,
  complianceNotes: "",
  driverClassificationLabel: "Independent Contractor",
  reportableIncomeIncludesFees: false,
};

export function TaxComplianceConfig() {
  const { toast } = useToast();
  const [editingConfig, setEditingConfig] = useState<ConfigForm | null>(null);
  const [isNew, setIsNew] = useState(false);

  const { data: configs = [], isLoading } = useQuery<CountryTaxConfig[]>({
    queryKey: ["/api/admin/tax/country-configs"],
  });

  const saveMutation = useMutation({
    mutationFn: (data: ConfigForm) =>
      apiRequest("POST", "/api/admin/tax/country-configs", data),
    onSuccess: () => {
      toast({ title: "Configuration saved", description: "Country tax compliance rules updated." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tax/country-configs"] });
      setEditingConfig(null);
    },
    onError: (err: any) => {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (countryCode: string) =>
      apiRequest("DELETE", `/api/admin/tax/country-configs/${countryCode}`),
    onSuccess: () => {
      toast({ title: "Configuration removed", description: "Country tax rules deleted." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tax/country-configs"] });
    },
    onError: (err: any) => {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    },
  });

  const handleEdit = (config: CountryTaxConfig) => {
    setEditingConfig({
      countryCode: config.countryCode,
      countryName: config.countryName,
      taxDocumentsEnabled: config.taxDocumentsEnabled,
      documentType: config.documentType,
      documentLabel: config.documentLabel,
      currency: config.currency,
      deliveryMethod: config.deliveryMethod,
      mileageDisclosureEnabled: config.mileageDisclosureEnabled,
      withholdingEnabled: config.withholdingEnabled,
      complianceNotes: config.complianceNotes || "",
      driverClassificationLabel: config.driverClassificationLabel,
      reportableIncomeIncludesFees: config.reportableIncomeIncludesFees,
    });
    setIsNew(false);
  };

  const handleNew = () => {
    setEditingConfig({ ...emptyForm });
    setIsNew(true);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2" data-testid="text-tax-compliance-title">
              <Globe className="h-5 w-5" />
              Country Tax Compliance Rules
            </CardTitle>
            <CardDescription>Configure tax document types, currencies, and compliance rules per country</CardDescription>
          </div>
          <Button onClick={handleNew} data-testid="button-add-country-config">
            <Plus className="h-4 w-4 mr-2" />
            Add Country
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading configurations...</div>
          ) : configs.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <Settings className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No country tax configurations found</p>
              <p className="text-xs mt-1">Default rules will apply to all countries</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Country</TableHead>
                    <TableHead>Document Type</TableHead>
                    <TableHead>Currency</TableHead>
                    <TableHead>Delivery</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Mileage</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {configs.map((config) => (
                    <TableRow key={config.id} data-testid={`row-tax-config-${config.countryCode}`}>
                      <TableCell className="font-medium">
                        <div>
                          <span>{config.countryName}</span>
                          <span className="ml-2 text-xs text-muted-foreground">({config.countryCode})</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{config.documentLabel}</span>
                      </TableCell>
                      <TableCell>{config.currency}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{config.deliveryMethod.replace("_", "-")}</Badge>
                      </TableCell>
                      <TableCell>
                        {config.taxDocumentsEnabled ? (
                          <Badge variant="default" className="text-xs">
                            <Check className="h-3 w-3 mr-1" />Enabled
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            <X className="h-3 w-3 mr-1" />Disabled
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {config.mileageDisclosureEnabled ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <X className="h-4 w-4 text-muted-foreground" />
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center gap-1 justify-end">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleEdit(config)}
                            data-testid={`button-edit-config-${config.countryCode}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              if (confirm(`Remove tax configuration for ${config.countryName}? Default rules will apply.`)) {
                                deleteMutation.mutate(config.countryCode);
                              }
                            }}
                            data-testid={`button-delete-config-${config.countryCode}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="mt-4 p-3 rounded-md bg-muted/30">
            <div className="flex items-start gap-2">
              <ShieldCheck className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
              <div className="text-xs text-muted-foreground space-y-1">
                <p>Countries without explicit configuration will receive a generic Annual Earnings & Tax Summary.</p>
                <p>Tax withholding is never automatically applied. ZIBA provides summaries for filing purposes only.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!editingConfig} onOpenChange={(open) => { if (!open) setEditingConfig(null); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle data-testid="text-config-dialog-title">
              {isNew ? "Add Country Tax Configuration" : `Edit: ${editingConfig?.countryName || editingConfig?.countryCode}`}
            </DialogTitle>
            <DialogDescription>Configure tax compliance rules for this country</DialogDescription>
          </DialogHeader>

          {editingConfig && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="countryCode">Country Code (ISO)</Label>
                  <Input
                    id="countryCode"
                    value={editingConfig.countryCode}
                    onChange={(e) => setEditingConfig({ ...editingConfig, countryCode: e.target.value.toUpperCase() })}
                    placeholder="US"
                    maxLength={3}
                    disabled={!isNew}
                    data-testid="input-country-code"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="countryName">Country Name</Label>
                  <Input
                    id="countryName"
                    value={editingConfig.countryName}
                    onChange={(e) => setEditingConfig({ ...editingConfig, countryName: e.target.value })}
                    placeholder="United States"
                    data-testid="input-country-name"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="currency">Currency</Label>
                  <Input
                    id="currency"
                    value={editingConfig.currency}
                    onChange={(e) => setEditingConfig({ ...editingConfig, currency: e.target.value.toUpperCase() })}
                    placeholder="USD"
                    maxLength={3}
                    data-testid="input-currency"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="deliveryMethod">Delivery Method</Label>
                  <Select
                    value={editingConfig.deliveryMethod}
                    onValueChange={(v) => setEditingConfig({ ...editingConfig, deliveryMethod: v })}
                  >
                    <SelectTrigger data-testid="select-delivery-method">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="in_app">In-App</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="both">Both</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="documentType">Document Type</Label>
                <Select
                  value={editingConfig.documentType}
                  onValueChange={(v) => setEditingConfig({ ...editingConfig, documentType: v })}
                >
                  <SelectTrigger data-testid="select-document-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1099">1099 (IRS Form)</SelectItem>
                    <SelectItem value="annual_statement">Annual Statement</SelectItem>
                    <SelectItem value="country_equivalent">Country Equivalent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="documentLabel">Document Title / Label</Label>
                <Input
                  id="documentLabel"
                  value={editingConfig.documentLabel}
                  onChange={(e) => setEditingConfig({ ...editingConfig, documentLabel: e.target.value })}
                  placeholder="Annual Earnings & Tax Summary"
                  data-testid="input-document-label"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="classificationLabel">Driver Classification Label</Label>
                <Input
                  id="classificationLabel"
                  value={editingConfig.driverClassificationLabel}
                  onChange={(e) => setEditingConfig({ ...editingConfig, driverClassificationLabel: e.target.value })}
                  placeholder="Independent Contractor"
                  data-testid="input-classification-label"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="complianceNotes">Compliance Notes (shown on documents)</Label>
                <Textarea
                  id="complianceNotes"
                  value={editingConfig.complianceNotes}
                  onChange={(e) => setEditingConfig({ ...editingConfig, complianceNotes: e.target.value })}
                  placeholder="Driver is responsible for filing applicable taxes..."
                  className="resize-none text-sm"
                  rows={3}
                  data-testid="input-compliance-notes"
                />
              </div>

              <div className="space-y-3 rounded-md border p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Tax Documents Enabled</Label>
                    <p className="text-xs text-muted-foreground">Allow generation of tax documents for this country</p>
                  </div>
                  <Switch
                    checked={editingConfig.taxDocumentsEnabled}
                    onCheckedChange={(v) => setEditingConfig({ ...editingConfig, taxDocumentsEnabled: v })}
                    data-testid="switch-tax-enabled"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Mileage Disclosure</Label>
                    <p className="text-xs text-muted-foreground">Include total miles driven in tax documents</p>
                  </div>
                  <Switch
                    checked={editingConfig.mileageDisclosureEnabled}
                    onCheckedChange={(v) => setEditingConfig({ ...editingConfig, mileageDisclosureEnabled: v })}
                    data-testid="switch-mileage-enabled"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Tax Withholding</Label>
                    <p className="text-xs text-muted-foreground">Show withholding information (default: disabled)</p>
                  </div>
                  <Switch
                    checked={editingConfig.withholdingEnabled}
                    onCheckedChange={(v) => setEditingConfig({ ...editingConfig, withholdingEnabled: v })}
                    data-testid="switch-withholding-enabled"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Include Fees in Reportable Income</Label>
                    <p className="text-xs text-muted-foreground">Whether platform fees are deducted from reportable income</p>
                  </div>
                  <Switch
                    checked={editingConfig.reportableIncomeIncludesFees}
                    onCheckedChange={(v) => setEditingConfig({ ...editingConfig, reportableIncomeIncludesFees: v })}
                    data-testid="switch-fees-in-income"
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditingConfig(null)} data-testid="button-cancel-config">
              Cancel
            </Button>
            <Button
              onClick={() => editingConfig && saveMutation.mutate(editingConfig)}
              disabled={saveMutation.isPending || !editingConfig?.countryCode || !editingConfig?.countryName || !editingConfig?.currency}
              data-testid="button-save-config"
            >
              {saveMutation.isPending ? "Saving..." : "Save Configuration"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
