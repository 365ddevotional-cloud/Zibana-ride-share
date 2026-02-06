import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HelpCircle, ChevronRight, ExternalLink, MessageSquare } from "lucide-react";

interface HelpArticle {
  id: string;
  title: string;
  summary: string | null;
  slug: string;
  categoryName?: string;
}

export function ContextualHelpLink({
  category,
  audience = "ALL",
  label = "Learn more",
}: {
  category: string;
  audience?: string;
  label?: string;
}) {
  const [, setLocation] = useLocation();

  const handleClick = () => {
    if (audience === "RIDER") {
      setLocation("/rider/help");
    } else if (audience === "DRIVER") {
      setLocation("/driver/help");
    } else {
      setLocation("/rider/help");
    }
  };

  return (
    <button
      onClick={handleClick}
      className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground text-sm transition-colors"
      data-testid="link-contextual-help"
    >
      <HelpCircle className="h-3.5 w-3.5" />
      <span>{label}</span>
    </button>
  );
}

export function ContextualHelpSuggestion({
  category,
  audience = "ALL",
  title = "Need help?",
  maxArticles = 3,
  show = true,
}: {
  category: string;
  audience?: string;
  title?: string;
  maxArticles?: number;
  show?: boolean;
}) {
  const [, setLocation] = useLocation();

  const { data: articles, isLoading } = useQuery<HelpArticle[]>({
    queryKey: [
      "/api/help/search",
      `?q=${encodeURIComponent(category)}&audience=${audience}`,
    ],
    enabled: show,
  });

  if (!show) return null;
  if (isLoading) return null;

  const displayArticles = articles?.slice(0, maxArticles);

  const handleArticleClick = () => {
    if (audience === "RIDER") {
      setLocation("/rider/help");
    } else if (audience === "DRIVER") {
      setLocation("/driver/help");
    } else {
      setLocation("/rider/help");
    }
  };

  if (!displayArticles || displayArticles.length === 0) {
    return (
      <Card className="bg-muted" data-testid="card-contextual-help-empty">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <HelpCircle className="h-4 w-4 text-muted-foreground" />
            <span
              className="text-sm font-medium"
              data-testid="text-contextual-help-title"
            >
              {title}
            </span>
          </div>
          <p
            className="text-sm text-muted-foreground"
            data-testid="text-contextual-help-fallback"
          >
            Contact support if you need further help
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-muted" data-testid="card-contextual-help">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <HelpCircle className="h-4 w-4 text-muted-foreground" />
          <span
            className="text-sm font-medium"
            data-testid="text-contextual-help-title"
          >
            {title}
          </span>
        </div>
        <div className="space-y-1">
          {displayArticles.map((article) => (
            <button
              key={article.id}
              onClick={handleArticleClick}
              className="w-full flex items-center gap-2 text-left text-sm text-muted-foreground hover:text-foreground transition-colors py-1"
              data-testid={`link-contextual-article-${article.id}`}
            >
              <ChevronRight className="h-3.5 w-3.5 shrink-0" />
              <span className="flex-1 min-w-0 truncate">{article.title}</span>
              <ExternalLink className="h-3 w-3 shrink-0 opacity-50" />
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function HelpCenterFallback() {
  const [, setLocation] = useLocation();

  return (
    <Card data-testid="help-center-fallback">
      <CardContent className="p-6 text-center space-y-4">
        <MessageSquare className="h-10 w-10 mx-auto text-muted-foreground" />
        <div>
          <p
            className="font-medium"
            data-testid="text-help-center-unavailable"
          >
            Help Center is temporarily unavailable
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            We're working to restore access as soon as possible
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => setLocation("/rider/support")}
          data-testid="button-contact-support"
        >
          <MessageSquare className="h-4 w-4 mr-2" />
          Contact Support
        </Button>
      </CardContent>
    </Card>
  );
}
