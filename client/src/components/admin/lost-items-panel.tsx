import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Package, Search, Settings, MessageCircle, Lock, Unlock, Phone, PhoneOff, CheckCircle } from "lucide-react";

interface LostItem {
  id: string;
  riderId?: string;
  driverId?: string;
  tripId?: string;
  riderName?: string;
  driverName?: string;
  itemDescription?: string;
  category?: string;
  status: string;
  returnFee?: string;
  driverShare?: string;
  platformFee?: string;
  pickupLocation?: string;
  returnLocation?: string;
  communicationUnlocked?: boolean;
  riderPhoneVisible?: boolean;
  driverPhoneVisible?: boolean;
  createdAt: string;
  updatedAt?: string;
}

interface LostItemFeeConfig {
  id: string;
  countryCode: string;
  baseFee: string;
  perKmFee: string;
  maxFee: string;
  driverSharePercent: string;
  currency: string;
}

interface ChatMessage {
  id: string;
  lostItemReportId: string;
  senderId: string;
  senderRole: string;
  message: string;
  isSystemMessage: boolean;
  readAt: string | null;
  createdAt: string;
}

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "reported", label: "Reported" },
  { value: "driver_confirmed", label: "Driver Confirmed" },
  { value: "driver_denied", label: "Driver Denied" },
  { value: "return_in_progress", label: "Return In Progress" },
  { value: "returned", label: "Returned" },
  { value: "closed", label: "Closed" },
  { value: "disputed", label: "Disputed" },
  { value: "found", label: "Found" },
  { value: "resolved_by_admin", label: "Resolved By Admin" },
];

function statusBadgeClass(status: string): string {
  switch (status) {
    case "reported":
      return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300";
    case "driver_confirmed":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300";
    case "driver_denied":
      return "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300";
    case "return_in_progress":
      return "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300";
    case "returned":
      return "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300";
    case "closed":
      return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
    case "disputed":
      return "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300";
    case "found":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300";
    case "resolved_by_admin":
      return "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300";
    default:
      return "";
  }
}

export function LostItemsPanel() {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState<LostItem | null>(null);
  const [updateStatus, setUpdateStatus] = useState("");
  const [returnFee, setReturnFee] = useState("");
  const [driverShare, setDriverShare] = useState("");
  const [platformFee, setPlatformFee] = useState("");
  const [chatDialogItem, setChatDialogItem] = useState<LostItem | null>(null);

  const [feeCountryCode, setFeeCountryCode] = useState("NG");
  const [feeBaseFee, setFeeBaseFee] = useState("");
  const [feePerKmFee, setFeePerKmFee] = useState("");
  const [feeMaxFee, setFeeMaxFee] = useState("");
  const [feeDriverSharePercent, setFeeDriverSharePercent] = useState("");
  const [feeCurrency, setFeeCurrency] = useState("NGN");

  const { data: lostItems, isLoading } = useQuery<LostItem[]>({
    queryKey: ["/api/admin/lost-items"],
  });

  const { data: feeConfigs, isLoading: feesLoading } = useQuery<LostItemFeeConfig[]>({
    queryKey: ["/api/admin/lost-item-fees"],
  });

  const { data: chatMessages, isLoading: chatLoading } = useQuery<ChatMessage[]>({
    queryKey: ["/api/lost-items", chatDialogItem?.id, "messages"],
    enabled: !!chatDialogItem,
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, ...body }: { id: string; status: string; returnFee?: string; driverShare?: string; platformFee?: string }) =>
      apiRequest("PATCH", `/api/lost-items/${id}/status`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/lost-items"] });
      setSelectedItem(null);
      toast({ title: "Status updated successfully" });
    },
    onError: (err: Error) =>
      toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const communicationMutation = useMutation({
    mutationFn: ({ id, ...body }: { id: string; unlock?: boolean; riderPhoneVisible?: boolean; driverPhoneVisible?: boolean }) =>
      apiRequest("PATCH", `/api/admin/lost-items/${id}/communication`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/lost-items"] });
      toast({ title: "Communication settings updated" });
    },
    onError: (err: Error) =>
      toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const resolveDisputeMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest("PATCH", `/api/lost-items/${id}/status`, { status: "resolved_by_admin" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/lost-items"] });
      toast({ title: "Dispute resolved successfully" });
    },
    onError: (err: Error) =>
      toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const saveFeeConfigMutation = useMutation({
    mutationFn: (body: { countryCode: string; baseFee: string; perKmFee: string; maxFee: string; driverSharePercent: string; currency: string }) =>
      apiRequest("POST", "/api/admin/lost-item-fees", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/lost-item-fees"] });
      toast({ title: "Fee configuration saved" });
      setFeeBaseFee("");
      setFeePerKmFee("");
      setFeeMaxFee("");
      setFeeDriverSharePercent("");
    },
    onError: (err: Error) =>
      toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const handleUpdateStatus = () => {
    if (!selectedItem || !updateStatus) return;
    updateStatusMutation.mutate({
      id: selectedItem.id,
      status: updateStatus,
      returnFee: returnFee || undefined,
      driverShare: driverShare || undefined,
      platformFee: platformFee || undefined,
    });
  };

  const handleSaveFeeConfig = () => {
    if (!feeBaseFee || !feePerKmFee || !feeMaxFee || !feeDriverSharePercent) {
      toast({ title: "All fee fields are required", variant: "destructive" });
      return;
    }
    saveFeeConfigMutation.mutate({
      countryCode: feeCountryCode,
      baseFee: feeBaseFee,
      perKmFee: feePerKmFee,
      maxFee: feeMaxFee,
      driverSharePercent: feeDriverSharePercent,
      currency: feeCurrency,
    });
  };

  const filteredItems = (lostItems || []).filter((item) => {
    if (statusFilter !== "all" && item.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        item.itemDescription?.toLowerCase().includes(q) ||
        item.riderName?.toLowerCase().includes(q) ||
        item.driverName?.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const openDetailDialog = (item: LostItem) => {
    setSelectedItem(item);
    setUpdateStatus(item.status);
    setReturnFee(item.returnFee || "");
    setDriverShare(item.driverShare || "");
    setPlatformFee(item.platformFee || "");
  };

  return (
    <div className="space-y-6" data-testid="lost-items-panel">
      <div>
        <h2 className="text-xl font-semibold text-foreground" data-testid="text-lost-items-title">
          Lost Items Management
        </h2>
        <p className="text-sm text-muted-foreground">
          Review and manage lost item reports from riders and drivers
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
          <CardTitle className="text-lg" data-testid="text-lost-items-reports-title">
            Lost Item Reports
          </CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 w-[200px]"
                data-testid="input-search-lost-items"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]" data-testid="select-lost-items-status-filter">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : !filteredItems.length ? (
            <div className="text-center py-8" data-testid="text-no-lost-items">
              <Package className="mx-auto h-10 w-10 text-muted-foreground mb-2" />
              <p className="text-muted-foreground">No lost item reports found</p>
            </div>
          ) : (
            <Table data-testid="table-lost-items">
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Rider</TableHead>
                  <TableHead>Driver</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => (
                  <TableRow key={item.id} data-testid={`lost-item-row-${item.id}`}>
                    <TableCell data-testid={`text-lost-item-id-${item.id}`}>
                      {item.id.slice(0, 8)}
                    </TableCell>
                    <TableCell data-testid={`text-lost-item-rider-${item.id}`}>
                      {item.riderName || item.riderId || "N/A"}
                    </TableCell>
                    <TableCell data-testid={`text-lost-item-driver-${item.id}`}>
                      {item.driverName || item.driverId || "N/A"}
                    </TableCell>
                    <TableCell data-testid={`text-lost-item-desc-${item.id}`}>
                      {item.itemDescription || "N/A"}
                    </TableCell>
                    <TableCell data-testid={`text-lost-item-category-${item.id}`}>
                      {item.category || "N/A"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={statusBadgeClass(item.status)}
                        data-testid={`badge-lost-item-status-${item.id}`}
                      >
                        {item.status.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell data-testid={`text-lost-item-date-${item.id}`}>
                      {new Date(item.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 flex-wrap">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openDetailDialog(item)}
                          data-testid={`button-view-lost-item-${item.id}`}
                        >
                          View
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setChatDialogItem(item)}
                          data-testid={`button-view-chat-${item.id}`}
                        >
                          <MessageCircle className="h-3 w-3 mr-1" />
                          Chat
                        </Button>
                        {item.status === "disputed" && (
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => resolveDisputeMutation.mutate(item.id)}
                            disabled={resolveDisputeMutation.isPending}
                            data-testid={`button-resolve-dispute-${item.id}`}
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Resolve
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
        <DialogContent className="max-w-lg" data-testid="dialog-lost-item-detail">
          <DialogHeader>
            <DialogTitle data-testid="text-lost-item-dialog-title">Lost Item Details</DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">ID:</span>
                  <p data-testid="text-detail-id">{selectedItem.id}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Status:</span>
                  <p>
                    <Badge variant="secondary" className={statusBadgeClass(selectedItem.status)} data-testid="badge-detail-status">
                      {selectedItem.status.replace(/_/g, " ")}
                    </Badge>
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Rider:</span>
                  <p data-testid="text-detail-rider">{selectedItem.riderName || selectedItem.riderId || "N/A"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Driver:</span>
                  <p data-testid="text-detail-driver">{selectedItem.driverName || selectedItem.driverId || "N/A"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Item:</span>
                  <p data-testid="text-detail-item">{selectedItem.itemDescription || "N/A"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Category:</span>
                  <p data-testid="text-detail-category">{selectedItem.category || "N/A"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Trip ID:</span>
                  <p data-testid="text-detail-trip">{selectedItem.tripId || "N/A"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Date:</span>
                  <p data-testid="text-detail-date">{new Date(selectedItem.createdAt).toLocaleString()}</p>
                </div>
                {selectedItem.pickupLocation && (
                  <div>
                    <span className="text-muted-foreground">Pickup Location:</span>
                    <p data-testid="text-detail-pickup">{selectedItem.pickupLocation}</p>
                  </div>
                )}
                {selectedItem.returnLocation && (
                  <div>
                    <span className="text-muted-foreground">Return Location:</span>
                    <p data-testid="text-detail-return-location">{selectedItem.returnLocation}</p>
                  </div>
                )}
              </div>

              <div className="border-t pt-4 space-y-3">
                <h4 className="font-medium text-sm">Communication Controls</h4>
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    size="sm"
                    variant={selectedItem.communicationUnlocked ? "default" : "outline"}
                    onClick={() => communicationMutation.mutate({
                      id: selectedItem.id,
                      unlock: !selectedItem.communicationUnlocked,
                    })}
                    disabled={communicationMutation.isPending}
                    data-testid={`button-toggle-communication-${selectedItem.id}`}
                  >
                    {selectedItem.communicationUnlocked ? (
                      <><Unlock className="h-3 w-3 mr-1" />Unlocked</>
                    ) : (
                      <><Lock className="h-3 w-3 mr-1" />Locked</>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant={selectedItem.riderPhoneVisible ? "default" : "outline"}
                    onClick={() => communicationMutation.mutate({
                      id: selectedItem.id,
                      riderPhoneVisible: !selectedItem.riderPhoneVisible,
                    })}
                    disabled={communicationMutation.isPending}
                    data-testid={`button-toggle-rider-phone-${selectedItem.id}`}
                  >
                    {selectedItem.riderPhoneVisible ? (
                      <><Phone className="h-3 w-3 mr-1" />Rider Phone On</>
                    ) : (
                      <><PhoneOff className="h-3 w-3 mr-1" />Rider Phone Off</>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant={selectedItem.driverPhoneVisible ? "default" : "outline"}
                    onClick={() => communicationMutation.mutate({
                      id: selectedItem.id,
                      driverPhoneVisible: !selectedItem.driverPhoneVisible,
                    })}
                    disabled={communicationMutation.isPending}
                    data-testid={`button-toggle-driver-phone-${selectedItem.id}`}
                  >
                    {selectedItem.driverPhoneVisible ? (
                      <><Phone className="h-3 w-3 mr-1" />Driver Phone On</>
                    ) : (
                      <><PhoneOff className="h-3 w-3 mr-1" />Driver Phone Off</>
                    )}
                  </Button>
                </div>
              </div>

              <div className="border-t pt-4 space-y-3">
                <h4 className="font-medium text-sm">Update Status</h4>
                <Select value={updateStatus} onValueChange={setUpdateStatus}>
                  <SelectTrigger data-testid="select-update-status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.filter((o) => o.value !== "all").map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground">Return Fee</label>
                    <Input
                      value={returnFee}
                      onChange={(e) => setReturnFee(e.target.value)}
                      placeholder="0.00"
                      data-testid="input-return-fee"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Driver Share</label>
                    <Input
                      value={driverShare}
                      onChange={(e) => setDriverShare(e.target.value)}
                      placeholder="0.00"
                      data-testid="input-driver-share"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Platform Fee</label>
                    <Input
                      value={platformFee}
                      onChange={(e) => setPlatformFee(e.target.value)}
                      placeholder="0.00"
                      data-testid="input-platform-fee"
                    />
                  </div>
                </div>
                <Button
                  onClick={handleUpdateStatus}
                  disabled={updateStatusMutation.isPending}
                  data-testid="button-update-lost-item-status"
                >
                  {updateStatusMutation.isPending ? "Updating..." : "Update Status"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!chatDialogItem} onOpenChange={(open) => !open && setChatDialogItem(null)}>
        <DialogContent className="max-w-lg" data-testid="dialog-view-chat">
          <DialogHeader>
            <DialogTitle data-testid="text-chat-dialog-title">
              Chat Messages - {chatDialogItem?.itemDescription || "Lost Item"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {chatLoading ? (
              <div className="space-y-3 p-3">
                <Skeleton className="h-8 w-2/3" />
                <Skeleton className="h-8 w-1/2 ml-auto" />
                <Skeleton className="h-8 w-3/5" />
              </div>
            ) : !chatMessages || chatMessages.length === 0 ? (
              <div className="text-center py-8" data-testid="text-no-chat-messages">
                <MessageCircle className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No messages in this conversation</p>
              </div>
            ) : (
              <div className="max-h-[400px] overflow-y-auto bg-muted/30 rounded-md p-3 space-y-2" data-testid="container-admin-chat-messages">
                {chatMessages.map((msg) => {
                  if (msg.isSystemMessage) {
                    return (
                      <div key={msg.id} className="text-center py-1" data-testid={`admin-message-system-${msg.id}`}>
                        <span className="text-muted-foreground text-xs italic">{msg.message}</span>
                      </div>
                    );
                  }
                  return (
                    <div key={msg.id} className="space-y-1" data-testid={`admin-message-${msg.id}`}>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {msg.senderRole}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(msg.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <div className="bg-muted rounded-md px-3 py-2">
                        <p className="text-sm break-words" data-testid={`text-admin-message-content-${msg.id}`}>{msg.message}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg" data-testid="text-fee-config-title">
            <Settings className="h-5 w-5" />
            Lost Item Fee Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {feesLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : feeConfigs && feeConfigs.length > 0 ? (
            <Table data-testid="table-fee-configs">
              <TableHeader>
                <TableRow>
                  <TableHead>Country</TableHead>
                  <TableHead>Base Fee</TableHead>
                  <TableHead>Per Km Fee</TableHead>
                  <TableHead>Max Fee</TableHead>
                  <TableHead>Driver Share %</TableHead>
                  <TableHead>Currency</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {feeConfigs.map((cfg) => (
                  <TableRow key={cfg.id} data-testid={`fee-config-row-${cfg.id}`}>
                    <TableCell data-testid={`text-fee-country-${cfg.id}`}>{cfg.countryCode}</TableCell>
                    <TableCell data-testid={`text-fee-base-${cfg.id}`}>{cfg.baseFee}</TableCell>
                    <TableCell data-testid={`text-fee-perkm-${cfg.id}`}>{cfg.perKmFee}</TableCell>
                    <TableCell data-testid={`text-fee-max-${cfg.id}`}>{cfg.maxFee}</TableCell>
                    <TableCell data-testid={`text-fee-driver-share-${cfg.id}`}>{cfg.driverSharePercent}%</TableCell>
                    <TableCell data-testid={`text-fee-currency-${cfg.id}`}>{cfg.currency}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground" data-testid="text-no-fee-configs">No fee configurations found.</p>
          )}

          <div className="border-t pt-4 space-y-3">
            <h4 className="font-medium text-sm">Add / Update Fee Configuration</h4>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div>
                <label className="text-xs text-muted-foreground">Country Code</label>
                <Select value={feeCountryCode} onValueChange={setFeeCountryCode}>
                  <SelectTrigger data-testid="select-fee-country">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NG">Nigeria</SelectItem>
                    <SelectItem value="US">United States</SelectItem>
                    <SelectItem value="GB">United Kingdom</SelectItem>
                    <SelectItem value="ZA">South Africa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Base Fee</label>
                <Input
                  value={feeBaseFee}
                  onChange={(e) => setFeeBaseFee(e.target.value)}
                  placeholder="500"
                  data-testid="input-fee-base"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Per Km Fee</label>
                <Input
                  value={feePerKmFee}
                  onChange={(e) => setFeePerKmFee(e.target.value)}
                  placeholder="50"
                  data-testid="input-fee-perkm"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Max Fee</label>
                <Input
                  value={feeMaxFee}
                  onChange={(e) => setFeeMaxFee(e.target.value)}
                  placeholder="5000"
                  data-testid="input-fee-max"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Driver Share %</label>
                <Input
                  value={feeDriverSharePercent}
                  onChange={(e) => setFeeDriverSharePercent(e.target.value)}
                  placeholder="70"
                  data-testid="input-fee-driver-share"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Currency</label>
                <Select value={feeCurrency} onValueChange={setFeeCurrency}>
                  <SelectTrigger data-testid="select-fee-currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NGN">NGN</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                    <SelectItem value="ZAR">ZAR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button
              onClick={handleSaveFeeConfig}
              disabled={saveFeeConfigMutation.isPending}
              data-testid="button-save-fee-config"
            >
              {saveFeeConfigMutation.isPending ? "Saving..." : "Save Fee Configuration"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
