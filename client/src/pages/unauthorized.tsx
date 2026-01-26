import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldAlert, ArrowLeft, Home } from "lucide-react";
import { Link } from "wouter";

export default function Unauthorized() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4" data-testid="page-unauthorized">
      <Card className="w-full max-w-md text-center">
        <CardHeader className="space-y-4">
          <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
            <ShieldAlert className="w-8 h-8 text-destructive" />
          </div>
          <CardTitle className="text-2xl" data-testid="text-unauthorized-title">Access Denied</CardTitle>
          <CardDescription className="text-base" data-testid="text-unauthorized-description">
            You do not have permission to access the Admin Dashboard. 
            This area is restricted to authorized administrators only.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            If you believe this is an error, please contact a Super Administrator 
            to request access.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button asChild variant="outline" data-testid="button-go-back">
              <Link href="/">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Go Back
              </Link>
            </Button>
            <Button asChild data-testid="button-go-home">
              <Link href="/">
                <Home className="w-4 h-4 mr-2" />
                Home
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
