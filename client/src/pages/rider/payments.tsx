import { useState } from "react";
import { RiderLayout } from "@/components/rider/RiderLayout";
import { RiderRouteGuard } from "@/components/rider/RiderRouteGuard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { 
  CreditCard, Wallet, Building, Smartphone, 
  Plus, CheckCircle, ChevronRight, ArrowLeft 
} from "lucide-react";
import { useLocation } from "wouter";

interface PaymentMethod {
  id: string;
  type: string;
  name: string;
  lastFour?: string;
  isDefault: boolean;
}

export default function RiderPayments() {
  const [, setLocation] = useLocation();

  const { data: methods, isLoading } = useQuery<PaymentMethod[]>({
    queryKey: ["/api/rider/payment-methods"],
  });

  const getPaymentIcon = (type: string) => {
    switch (type) {
      case "card": return <CreditCard className="h-5 w-5" />;
      case "bank": return <Building className="h-5 w-5" />;
      case "mobile": return <Smartphone className="h-5 w-5" />;
      default: return <Wallet className="h-5 w-5" />;
    }
  };

  return (
    <RiderRouteGuard>
      <RiderLayout>
        <div className="p-4 space-y-6">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setLocation("/rider/wallet")}
              data-testid="button-back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold" data-testid="text-payments-title">
              Payment Methods
            </h1>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Your Payment Methods
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : !methods || methods.length === 0 ? (
                <div className="text-center py-8">
                  <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                    <CreditCard className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground mb-2">No payment methods</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Add a payment method to pay for rides
                  </p>
                  <Button data-testid="button-add-first-method">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Payment Method
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {methods.map((method) => (
                    <div 
                      key={method.id}
                      className="flex items-center justify-between p-4 rounded-lg border hover-elevate cursor-pointer"
                      data-testid={`payment-method-${method.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                          {getPaymentIcon(method.type)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{method.name}</p>
                            {method.isDefault && (
                              <Badge variant="secondary" className="text-xs">
                                Default
                              </Badge>
                            )}
                          </div>
                          {method.lastFour && (
                            <p className="text-sm text-muted-foreground">
                              **** {method.lastFour}
                            </p>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-dashed">
            <CardContent className="p-4">
              <button 
                className="w-full flex items-center justify-center gap-2 py-4 text-primary hover-elevate rounded-lg"
                data-testid="button-add-method"
              >
                <Plus className="h-5 w-5" />
                <span className="font-medium">Add Payment Method</span>
              </button>
            </CardContent>
          </Card>

          <div className="space-y-3">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Available Options
            </h2>
            <Card>
              <CardContent className="p-0 divide-y">
                <button 
                  className="w-full p-4 flex items-center gap-3 hover-elevate text-left"
                  data-testid="button-add-card"
                >
                  <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                    <CreditCard className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="font-medium">Credit or Debit Card</p>
                    <p className="text-sm text-muted-foreground">Visa, Mastercard, Verve</p>
                  </div>
                </button>
                <button 
                  className="w-full p-4 flex items-center gap-3 hover-elevate text-left"
                  data-testid="button-add-bank"
                >
                  <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                    <Building className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="font-medium">Bank Transfer</p>
                    <p className="text-sm text-muted-foreground">Direct bank payment</p>
                  </div>
                </button>
                <button 
                  className="w-full p-4 flex items-center gap-3 hover-elevate text-left"
                  data-testid="button-add-mobile"
                >
                  <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                    <Smartphone className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="font-medium">Mobile Money</p>
                    <p className="text-sm text-muted-foreground">MTN, Airtel Money</p>
                  </div>
                </button>
              </CardContent>
            </Card>
          </div>

          <p className="text-xs text-muted-foreground text-center px-4">
            Your payment information is encrypted and stored securely. 
            Payment methods are managed in test mode.
          </p>
        </div>
      </RiderLayout>
    </RiderRouteGuard>
  );
}
