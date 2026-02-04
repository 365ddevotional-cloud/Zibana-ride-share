import { DriverLayout } from "@/components/driver/DriverLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Car, Clock, MapPin } from "lucide-react";

export default function DriverTrips() {
  const { user } = useAuth();

  const { data: trips, isLoading } = useQuery({
    queryKey: ["/api/driver/trips"],
    enabled: !!user,
  });

  return (
    <DriverLayout>
      <div className="p-4 space-y-4">
        <h1 className="text-xl font-bold" data-testid="text-trips-title">My Trips</h1>

        <Tabs defaultValue="active" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="active" data-testid="tab-active-trips">Active</TabsTrigger>
            <TabsTrigger value="completed" data-testid="tab-completed-trips">Completed</TabsTrigger>
            <TabsTrigger value="cancelled" data-testid="tab-cancelled-trips">Cancelled</TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="mt-4 space-y-4">
            <EmptyState 
              icon={Car} 
              title="No active trips" 
              description="Go online to start receiving ride requests"
            />
          </TabsContent>

          <TabsContent value="completed" className="mt-4 space-y-4">
            <EmptyState 
              icon={Clock} 
              title="No completed trips yet" 
              description="Your completed trips will appear here"
            />
          </TabsContent>

          <TabsContent value="cancelled" className="mt-4 space-y-4">
            <EmptyState 
              icon={MapPin} 
              title="No cancelled trips" 
              description="Cancelled trips will appear here"
            />
          </TabsContent>
        </Tabs>
      </div>
    </DriverLayout>
  );
}

function EmptyState({ 
  icon: Icon, 
  title, 
  description 
}: { 
  icon: any; 
  title: string; 
  description: string;
}) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-8 text-center">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
          <Icon className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="font-medium">{title}</h3>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </CardContent>
    </Card>
  );
}
