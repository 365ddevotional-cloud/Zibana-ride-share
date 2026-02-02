import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Wallet,
  Building2,
  CreditCard,
  Loader2
} from "lucide-react";

type BankAccountData = {
  id: string;
  driverId: string;
  bankName: string;
  bankCode: string;
  accountNumber: string;
  accountName: string;
  countryCode: string;
  isVerified: boolean;
  createdAt: string;
};

type VerificationStatus = {
  isNINVerified: boolean;
  isDriversLicenseVerified: boolean;
  isAddressVerified: boolean;
  isIdentityVerified: boolean;
  withdrawalVerificationStatus: string;
  bankAccountVerified: boolean;
};

type WithdrawalEligibility = {
  isEligible: boolean;
  issues: string[];
  walletBalance: string;
  currency: string;
  minimumWithdrawal: number;
  bankAccount: {
    bankName: string;
    accountNumber: string;
    accountName: string;
    isVerified: boolean;
  } | null;
  verificationStatus: {
    isNINVerified: boolean;
    isDriversLicenseVerified: boolean;
    isAddressVerified: boolean;
    isIdentityVerified: boolean;
    overallStatus: string;
  };
};

type Withdrawal = {
  id: string;
  amount: string;
  currencyCode: string;
  status: string;
  createdAt: string;
};

const NIGERIAN_BANKS = [
  { name: "Access Bank", code: "044" },
  { name: "Citibank Nigeria", code: "023" },
  { name: "Ecobank Nigeria", code: "050" },
  { name: "Fidelity Bank", code: "070" },
  { name: "First Bank of Nigeria", code: "011" },
  { name: "First City Monument Bank", code: "214" },
  { name: "Guaranty Trust Bank", code: "058" },
  { name: "Heritage Bank", code: "030" },
  { name: "Keystone Bank", code: "082" },
  { name: "Polaris Bank", code: "076" },
  { name: "Stanbic IBTC Bank", code: "221" },
  { name: "Standard Chartered Bank", code: "068" },
  { name: "Sterling Bank", code: "232" },
  { name: "Union Bank of Nigeria", code: "032" },
  { name: "United Bank for Africa", code: "033" },
  { name: "Unity Bank", code: "215" },
  { name: "Wema Bank", code: "035" },
  { name: "Zenith Bank", code: "057" },
  { name: "Opay", code: "100004" },
  { name: "Kuda Microfinance Bank", code: "090267" },
  { name: "Moniepoint Microfinance Bank", code: "50515" },
  { name: "PalmPay", code: "999991" },
];

export function DriverBankAccountSection() {
  const { toast } = useToast();
  const [showAddForm, setShowAddForm] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [formData, setFormData] = useState({
    bankName: "",
    bankCode: "",
    accountNumber: "",
    accountName: "",
  });

  const { data: bankAccountData, isLoading: bankLoading } = useQuery<{
    bankAccount: BankAccountData | null;
    verificationStatus: VerificationStatus;
  }>({
    queryKey: ["/api/driver/bank-account"],
  });

  const { data: eligibilityData, isLoading: eligibilityLoading } = useQuery<WithdrawalEligibility>({
    queryKey: ["/api/driver/withdrawal-eligibility"],
  });

  const { data: withdrawals = [], isLoading: withdrawalsLoading } = useQuery<Withdrawal[]>({
    queryKey: ["/api/driver/withdrawals"],
  });

  const createBankAccountMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await apiRequest("POST", "/api/driver/bank-account", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Bank account added successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/driver/bank-account"] });
      queryClient.invalidateQueries({ queryKey: ["/api/driver/withdrawal-eligibility"] });
      setShowAddForm(false);
      setFormData({ bankName: "", bankCode: "", accountNumber: "", accountName: "" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to add bank account", description: error.message, variant: "destructive" });
    },
  });

  const updateBankAccountMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await apiRequest("PATCH", "/api/driver/bank-account", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Bank account updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/driver/bank-account"] });
      queryClient.invalidateQueries({ queryKey: ["/api/driver/withdrawal-eligibility"] });
      setShowAddForm(false);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update bank account", description: error.message, variant: "destructive" });
    },
  });

  const withdrawMutation = useMutation({
    mutationFn: async (amount: string) => {
      const res = await apiRequest("POST", "/api/driver/withdrawals", { amount });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Withdrawal request submitted" });
      queryClient.invalidateQueries({ queryKey: ["/api/driver/withdrawals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/driver/withdrawal-eligibility"] });
      setWithdrawAmount("");
    },
    onError: (error: Error) => {
      toast({ title: "Withdrawal failed", description: error.message, variant: "destructive" });
    },
  });

  const handleBankSelect = (bankName: string) => {
    const bank = NIGERIAN_BANKS.find(b => b.name === bankName);
    if (bank) {
      setFormData(prev => ({ ...prev, bankName: bank.name, bankCode: bank.code }));
    }
  };

  const handleSubmit = () => {
    if (bankAccountData?.bankAccount) {
      updateBankAccountMutation.mutate(formData);
    } else {
      createBankAccountMutation.mutate(formData);
    }
  };

  const handleWithdraw = () => {
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount < 1000) {
      toast({ title: "Minimum withdrawal is ₦1,000", variant: "destructive" });
      return;
    }
    withdrawMutation.mutate(withdrawAmount);
  };

  if (bankLoading || eligibilityLoading) {
    return (
      <div className="py-4 text-center text-muted-foreground text-sm flex items-center justify-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading bank details...
      </div>
    );
  }

  const bankAccount = bankAccountData?.bankAccount;
  const verificationStatus = bankAccountData?.verificationStatus;
  const eligibility = eligibilityData;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-muted/50 rounded-lg p-3">
          <div className="text-xs text-muted-foreground">Available Balance</div>
          <div className="text-lg font-bold" data-testid="text-withdrawal-balance">
            ₦{parseFloat(eligibility?.walletBalance || "0").toLocaleString()}
          </div>
        </div>
        <div className="bg-muted/50 rounded-lg p-3">
          <div className="text-xs text-muted-foreground">Minimum Withdrawal</div>
          <div className="text-lg font-bold">₦1,000</div>
        </div>
      </div>

      <Separator />

      <div className="space-y-2">
        <div className="text-sm font-medium flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          Verification Status
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-2">
            {verificationStatus?.isNINVerified ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <XCircle className="h-4 w-4 text-red-500" />
            )}
            <span>NIN Verified</span>
          </div>
          <div className="flex items-center gap-2">
            {verificationStatus?.isDriversLicenseVerified ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <XCircle className="h-4 w-4 text-red-500" />
            )}
            <span>License Verified</span>
          </div>
          <div className="flex items-center gap-2">
            {verificationStatus?.isAddressVerified ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <XCircle className="h-4 w-4 text-red-500" />
            )}
            <span>Address Verified</span>
          </div>
          <div className="flex items-center gap-2">
            {verificationStatus?.bankAccountVerified ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <XCircle className="h-4 w-4 text-red-500" />
            )}
            <span>Bank Verified</span>
          </div>
        </div>
      </div>

      <Separator />

      <div className="space-y-3">
        <div className="text-sm font-medium flex items-center gap-2">
          <CreditCard className="h-4 w-4" />
          Bank Account
        </div>
        
        {bankAccount && !showAddForm ? (
          <div className="bg-muted/30 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{bankAccount.bankName}</div>
                <div className="text-sm text-muted-foreground">
                  ****{bankAccount.accountNumber.slice(-4)} - {bankAccount.accountName}
                </div>
              </div>
              {bankAccount.isVerified ? (
                <Badge className="bg-green-500/10 text-green-600">Verified</Badge>
              ) : (
                <Badge variant="outline">Pending Verification</Badge>
              )}
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                setFormData({
                  bankName: bankAccount.bankName,
                  bankCode: bankAccount.bankCode,
                  accountNumber: bankAccount.accountNumber,
                  accountName: bankAccount.accountName,
                });
                setShowAddForm(true);
              }}
              data-testid="button-edit-bank"
            >
              Update Bank Details
            </Button>
          </div>
        ) : showAddForm ? (
          <div className="space-y-3">
            <div>
              <Label>Bank Name</Label>
              <select
                className="w-full mt-1 p-2 border rounded-md bg-background"
                value={formData.bankName}
                onChange={(e) => handleBankSelect(e.target.value)}
                data-testid="select-bank"
              >
                <option value="">Select a bank</option>
                {NIGERIAN_BANKS.map(bank => (
                  <option key={bank.code} value={bank.name}>{bank.name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Account Number</Label>
              <Input
                type="text"
                maxLength={10}
                value={formData.accountNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, accountNumber: e.target.value }))}
                placeholder="0123456789"
                data-testid="input-account-number"
              />
            </div>
            <div>
              <Label>Account Name</Label>
              <Input
                type="text"
                value={formData.accountName}
                onChange={(e) => setFormData(prev => ({ ...prev, accountName: e.target.value }))}
                placeholder="JOHN DOE"
                data-testid="input-account-name"
              />
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={handleSubmit}
                disabled={!formData.bankName || !formData.accountNumber || !formData.accountName || createBankAccountMutation.isPending || updateBankAccountMutation.isPending}
                data-testid="button-save-bank"
              >
                {(createBankAccountMutation.isPending || updateBankAccountMutation.isPending) && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Save
              </Button>
              <Button variant="outline" onClick={() => setShowAddForm(false)} data-testid="button-cancel-bank">
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button 
            variant="outline" 
            onClick={() => setShowAddForm(true)}
            data-testid="button-add-bank"
          >
            <Building2 className="h-4 w-4 mr-2" />
            Add Bank Account
          </Button>
        )}
      </div>

      <Separator />

      <div className="space-y-3">
        <div className="text-sm font-medium flex items-center gap-2">
          <Wallet className="h-4 w-4" />
          Request Withdrawal
        </div>
        
        {eligibility && !eligibility.isEligible && (
          <div className="bg-destructive/10 rounded-lg p-3 text-sm">
            <div className="font-medium flex items-center gap-2 text-destructive mb-2">
              <AlertCircle className="h-4 w-4" />
              Withdrawal Not Available
            </div>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              {eligibility.issues.map((issue, i) => (
                <li key={i}>{issue}</li>
              ))}
            </ul>
          </div>
        )}

        {eligibility?.isEligible && (
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="Enter amount (min ₦1,000)"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              min={1000}
              data-testid="input-withdraw-amount"
            />
            <Button 
              onClick={handleWithdraw}
              disabled={!withdrawAmount || parseFloat(withdrawAmount) < 1000 || withdrawMutation.isPending}
              data-testid="button-withdraw"
            >
              {withdrawMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Withdraw
            </Button>
          </div>
        )}
      </div>

      {withdrawals.length > 0 && (
        <>
          <Separator />
          <div className="space-y-2">
            <div className="text-sm font-medium">Recent Withdrawal Requests</div>
            <div className="space-y-1 max-h-[150px] overflow-y-auto">
              {withdrawals.slice(0, 5).map((w) => (
                <div 
                  key={w.id} 
                  className="flex items-center justify-between py-2 border-b last:border-0"
                  data-testid={`row-withdrawal-${w.id}`}
                >
                  <div>
                    <div className="text-sm font-medium">₦{parseFloat(w.amount).toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(w.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <Badge variant={
                    w.status === "paid" ? "default" : 
                    w.status === "approved" ? "secondary" :
                    w.status === "rejected" ? "destructive" : "outline"
                  }>
                    {w.status}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
