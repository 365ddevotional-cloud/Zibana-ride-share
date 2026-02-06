import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { HelpCenterFallback } from "@/components/contextual-help";
import {
  Search,
  HelpCircle,
  BookOpen,
  ChevronRight,
  ThumbsUp,
  ThumbsDown,
  ArrowLeft,
  Star,
  TrendingUp,
  Clock,
} from "lucide-react";

interface HelpCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  audience: string;
  sortOrder: number;
  active: boolean;
}

interface HelpArticleWithCategory {
  id: string;
  categoryId: string | null;
  title: string;
  slug: string;
  summary: string | null;
  content: string;
  audience: string;
  status: string;
  tags: string[] | null;
  viewCount: number;
  helpfulYes: number;
  helpfulNo: number;
  sortOrder: number;
  featured: boolean;
  countryCode: string | null;
  categoryName?: string;
  categorySlug?: string;
}

type ViewState = "home" | "category" | "article";

export default function HelpCenterPage({
  audience = "ALL",
}: {
  audience?: string;
}) {
  const [view, setView] = useState<ViewState>("home");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] =
    useState<HelpCategory | null>(null);
  const [selectedArticle, setSelectedArticle] =
    useState<HelpArticleWithCategory | null>(null);
  const [rated, setRated] = useState<boolean | null>(null);

  const { data: categories, isLoading: categoriesLoading } = useQuery<
    HelpCategory[]
  >({
    queryKey: ["/api/help/categories", `?audience=${audience}`],
  });

  const { data: featuredArticles, isLoading: featuredLoading } = useQuery<
    HelpArticleWithCategory[]
  >({
    queryKey: [
      "/api/help/articles",
      `?featured=true&audience=${audience}`,
    ],
  });

  const { data: mostViewedArticles, isLoading: mostViewedLoading } = useQuery<
    HelpArticleWithCategory[]
  >({
    queryKey: ["/api/help/articles/most-viewed", `?audience=${audience}&limit=5`],
  });

  const { data: recentlyUpdatedArticles, isLoading: recentlyUpdatedLoading } = useQuery<
    HelpArticleWithCategory[]
  >({
    queryKey: ["/api/help/articles/recently-updated", `?audience=${audience}&limit=5`],
  });

  const hasLoadError = !categoriesLoading && !categories;

  const { data: searchResults, isLoading: searchLoading } = useQuery<
    HelpArticleWithCategory[]
  >({
    queryKey: [
      "/api/help/search",
      `?q=${encodeURIComponent(searchQuery)}&audience=${audience}`,
    ],
    enabled: searchQuery.trim().length > 0,
  });

  const { data: categoryArticles, isLoading: categoryArticlesLoading } =
    useQuery<HelpArticleWithCategory[]>({
      queryKey: [
        "/api/help/articles",
        `?categoryId=${selectedCategory?.id}&audience=${audience}`,
      ],
      enabled: view === "category" && !!selectedCategory,
    });

  const rateMutation = useMutation({
    mutationFn: async ({
      articleId,
      helpful,
    }: {
      articleId: string;
      helpful: boolean;
    }) => {
      return apiRequest("POST", `/api/help/articles/${articleId}/rate`, {
        helpful,
      });
    },
  });

  const handleCategoryClick = (category: HelpCategory) => {
    setSelectedCategory(category);
    setView("category");
  };

  const handleArticleClick = (article: HelpArticleWithCategory) => {
    setSelectedArticle(article);
    setRated(null);
    setView("article");
  };

  const handleBack = () => {
    if (view === "article") {
      if (selectedCategory) {
        setView("category");
      } else {
        setView("home");
      }
      setSelectedArticle(null);
      setRated(null);
    } else if (view === "category") {
      setView("home");
      setSelectedCategory(null);
    }
  };

  const handleRate = (helpful: boolean) => {
    if (selectedArticle && rated === null) {
      setRated(helpful);
      rateMutation.mutate({ articleId: selectedArticle.id, helpful });
    }
  };

  const isSearching = searchQuery.trim().length > 0;

  if (hasLoadError) {
    return <HelpCenterFallback />;
  }

  if (view === "article" && selectedArticle) {
    return (
      <div className="max-w-3xl mx-auto p-4 space-y-6">
        <Button
          variant="ghost"
          onClick={handleBack}
          data-testid="button-back-from-article"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <div>
          {selectedArticle.categoryName && (
            <Badge variant="secondary" data-testid="badge-article-category">
              {selectedArticle.categoryName}
            </Badge>
          )}
          <h1
            className="text-2xl font-bold mt-2"
            data-testid="text-article-title"
          >
            {selectedArticle.title}
          </h1>
          {selectedArticle.summary && (
            <p
              className="text-muted-foreground mt-1"
              data-testid="text-article-summary"
            >
              {selectedArticle.summary}
            </p>
          )}
        </div>

        <Card>
          <CardContent className="p-6 prose prose-sm max-w-none dark:prose-invert">
            <div
              dangerouslySetInnerHTML={{ __html: selectedArticle.content }}
              data-testid="text-article-content"
            />
          </CardContent>
        </Card>

        {selectedArticle.tags && selectedArticle.tags.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap" data-testid="article-tags">
            {selectedArticle.tags.map((tag) => (
              <Badge key={tag} variant="outline" data-testid={`badge-tag-${tag}`}>
                {tag}
              </Badge>
            ))}
          </div>
        )}

        <Card>
          <CardContent className="p-6 text-center space-y-3">
            <p className="font-medium" data-testid="text-helpful-prompt">
              Was this article helpful?
            </p>
            {rated !== null ? (
              <p
                className="text-muted-foreground"
                data-testid="text-helpful-thanks"
              >
                Thanks for your feedback!
              </p>
            ) : (
              <div className="flex items-center justify-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => handleRate(true)}
                  disabled={rateMutation.isPending}
                  data-testid="button-helpful-yes"
                >
                  <ThumbsUp className="h-4 w-4 mr-2" />
                  Yes
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleRate(false)}
                  disabled={rateMutation.isPending}
                  data-testid="button-helpful-no"
                >
                  <ThumbsDown className="h-4 w-4 mr-2" />
                  No
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (view === "category" && selectedCategory) {
    return (
      <div className="max-w-3xl mx-auto p-4 space-y-6">
        <Button
          variant="ghost"
          onClick={handleBack}
          data-testid="button-back-from-category"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <div>
          <h1
            className="text-2xl font-bold"
            data-testid="text-category-title"
          >
            {selectedCategory.name}
          </h1>
          {selectedCategory.description && (
            <p
              className="text-muted-foreground mt-1"
              data-testid="text-category-description"
            >
              {selectedCategory.description}
            </p>
          )}
        </div>

        {categoryArticlesLoading ? (
          <div className="space-y-3" data-testid="skeleton-category-articles">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : !categoryArticles || categoryArticles.length === 0 ? (
          <div
            className="text-center py-12 text-muted-foreground"
            data-testid="empty-category-articles"
          >
            <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">No articles found</p>
            <p className="text-sm mt-1">
              There are no articles in this category yet.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {categoryArticles.map((article) => (
              <Card
                key={article.id}
                className="hover-elevate cursor-pointer"
                onClick={() => handleArticleClick(article)}
                data-testid={`card-article-${article.id}`}
              >
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p
                      className="font-medium"
                      data-testid={`text-article-title-${article.id}`}
                    >
                      {article.title}
                    </p>
                    {article.summary && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {article.summary}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-6">
      <div className="text-center space-y-2">
        <HelpCircle className="h-10 w-10 mx-auto text-muted-foreground" />
        <h1 className="text-2xl font-bold" data-testid="text-help-center-title">
          Help Center
        </h1>
        <p className="text-muted-foreground" data-testid="text-help-center-subtitle">
          Find answers to your questions
        </p>
      </div>

      <div className="relative" data-testid="search-container">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search for help..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
          data-testid="input-search"
        />
      </div>

      {isSearching ? (
        <div className="space-y-3">
          <h2
            className="text-lg font-semibold"
            data-testid="text-search-results-title"
          >
            Search Results
          </h2>
          {searchLoading ? (
            <div className="space-y-3" data-testid="skeleton-search-results">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : !searchResults || searchResults.length === 0 ? (
            <div
              className="text-center py-12 text-muted-foreground"
              data-testid="empty-search-results"
            >
              <Search className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No results found</p>
              <p className="text-sm mt-1">
                Try a different search term
              </p>
            </div>
          ) : (
            searchResults.map((article) => (
              <Card
                key={article.id}
                className="hover-elevate cursor-pointer"
                onClick={() => {
                  setSelectedCategory(null);
                  handleArticleClick(article);
                }}
                data-testid={`card-search-result-${article.id}`}
              >
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p
                        className="font-medium"
                        data-testid={`text-search-title-${article.id}`}
                      >
                        {article.title}
                      </p>
                      {article.categoryName && (
                        <Badge variant="secondary" className="text-xs">
                          {article.categoryName}
                        </Badge>
                      )}
                    </div>
                    {article.summary && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {article.summary}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                </CardContent>
              </Card>
            ))
          )}
        </div>
      ) : (
        <>
          <div className="space-y-3">
            <h2
              className="text-lg font-semibold"
              data-testid="text-categories-title"
            >
              Categories
            </h2>
            {categoriesLoading ? (
              <div
                className="grid grid-cols-2 gap-3"
                data-testid="skeleton-categories"
              >
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
              </div>
            ) : !categories || categories.length === 0 ? (
              <div
                className="text-center py-8 text-muted-foreground"
                data-testid="empty-categories"
              >
                <HelpCircle className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No categories available</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {categories
                  .filter((c) => c.active)
                  .map((category) => (
                    <Card
                      key={category.id}
                      className="hover-elevate cursor-pointer"
                      onClick={() => handleCategoryClick(category)}
                      data-testid={`card-category-${category.id}`}
                    >
                      <CardContent className="p-4 text-center">
                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mx-auto mb-2">
                          <BookOpen className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <p
                          className="font-medium text-sm"
                          data-testid={`text-category-name-${category.id}`}
                        >
                          {category.name}
                        </p>
                        {category.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {category.description}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <h2
              className="text-lg font-semibold flex items-center gap-2"
              data-testid="text-featured-title"
            >
              <Star className="h-5 w-5 text-muted-foreground" />
              Featured Articles
            </h2>
            {featuredLoading ? (
              <div className="space-y-3" data-testid="skeleton-featured">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : !featuredArticles || featuredArticles.length === 0 ? (
              <div
                className="text-center py-8 text-muted-foreground"
                data-testid="empty-featured"
              >
                <BookOpen className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No featured articles yet</p>
              </div>
            ) : (
              featuredArticles.map((article) => (
                <Card
                  key={article.id}
                  className="hover-elevate cursor-pointer"
                  onClick={() => {
                    setSelectedCategory(null);
                    handleArticleClick(article);
                  }}
                  data-testid={`card-featured-${article.id}`}
                >
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p
                          className="font-medium"
                          data-testid={`text-featured-title-${article.id}`}
                        >
                          {article.title}
                        </p>
                        {article.featured && (
                          <Badge variant="secondary" className="text-xs">
                            <Star className="h-3 w-3 mr-1" />
                            Featured
                          </Badge>
                        )}
                      </div>
                      {article.summary && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {article.summary}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {mostViewedArticles && mostViewedArticles.length > 0 && (
            <div className="space-y-3">
              <h2
                className="text-lg font-semibold flex items-center gap-2"
                data-testid="text-most-viewed-title"
              >
                <TrendingUp className="h-5 w-5 text-muted-foreground" />
                Most Viewed
              </h2>
              {mostViewedLoading ? (
                <div className="space-y-3" data-testid="skeleton-most-viewed">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : (
                mostViewedArticles.map((article) => (
                  <Card
                    key={article.id}
                    className="hover-elevate cursor-pointer"
                    onClick={() => {
                      setSelectedCategory(null);
                      handleArticleClick(article);
                    }}
                    data-testid={`card-most-viewed-${article.id}`}
                  >
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium" data-testid={`text-most-viewed-title-${article.id}`}>
                          {article.title}
                        </p>
                        {article.summary && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                            {article.summary}
                          </p>
                        )}
                      </div>
                      <Badge variant="outline" className="text-xs shrink-0">
                        {article.viewCount} views
                      </Badge>
                      <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}

          {recentlyUpdatedArticles && recentlyUpdatedArticles.length > 0 && (
            <div className="space-y-3">
              <h2
                className="text-lg font-semibold flex items-center gap-2"
                data-testid="text-recently-updated-title"
              >
                <Clock className="h-5 w-5 text-muted-foreground" />
                Recently Updated
              </h2>
              {recentlyUpdatedLoading ? (
                <div className="space-y-3" data-testid="skeleton-recently-updated">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : (
                recentlyUpdatedArticles.map((article) => (
                  <Card
                    key={article.id}
                    className="hover-elevate cursor-pointer"
                    onClick={() => {
                      setSelectedCategory(null);
                      handleArticleClick(article);
                    }}
                    data-testid={`card-recently-updated-${article.id}`}
                  >
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium" data-testid={`text-recently-updated-title-${article.id}`}>
                          {article.title}
                        </p>
                        {article.summary && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                            {article.summary}
                          </p>
                        )}
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
