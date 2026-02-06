import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";
import {
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Search,
  BookOpen,
  FolderOpen,
  Star,
  StarOff,
  Monitor,
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
  createdAt: string;
  updatedAt: string;
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
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
  categoryName?: string;
  categorySlug?: string;
}

interface HelpSearchLog {
  id: string;
  userId: string | null;
  query: string;
  resultsCount: number;
  clickedArticleId: string | null;
  createdAt: string;
}

const toSlug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

type CategoryFormData = {
  name: string;
  slug: string;
  description: string;
  icon: string;
  audience: string;
  sortOrder: string;
  active: boolean;
};

type ArticleFormData = {
  title: string;
  slug: string;
  summary: string;
  content: string;
  categoryId: string;
  audience: string;
  status: string;
  tags: string;
  featured: boolean;
  countryCode: string;
  sortOrder: string;
};

const defaultCategoryForm: CategoryFormData = {
  name: "",
  slug: "",
  description: "",
  icon: "",
  audience: "ALL",
  sortOrder: "0",
  active: true,
};

const defaultArticleForm: ArticleFormData = {
  title: "",
  slug: "",
  summary: "",
  content: "",
  categoryId: "",
  audience: "ALL",
  status: "DRAFT",
  tags: "",
  featured: false,
  countryCode: "",
  sortOrder: "0",
};

function audienceBadgeVariant(audience: string): "default" | "secondary" | "outline" {
  switch (audience) {
    case "RIDER":
      return "secondary";
    case "DRIVER":
      return "outline";
    default:
      return "default";
  }
}

function statusBadgeVariant(status: string): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "PUBLISHED":
      return "default";
    case "DRAFT":
      return "secondary";
    case "ARCHIVED":
      return "outline";
    default:
      return "secondary";
  }
}

export function HelpCenterPanel() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("categories");

  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState<HelpCategory | null>(null);
  const [categoryForm, setCategoryForm] = useState<CategoryFormData>(defaultCategoryForm);
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(null);

  const [showArticleDialog, setShowArticleDialog] = useState(false);
  const [editingArticle, setEditingArticle] = useState<HelpArticleWithCategory | null>(null);
  const [articleForm, setArticleForm] = useState<ArticleFormData>(defaultArticleForm);
  const [deletingArticleId, setDeletingArticleId] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [audienceFilter, setAudienceFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [previewAudience, setPreviewAudience] = useState<"RIDER" | "DRIVER">("RIDER");

  const { data: categories, isLoading: categoriesLoading } = useQuery<HelpCategory[]>({
    queryKey: ["/api/admin/help/categories"],
  });

  const { data: articles, isLoading: articlesLoading } = useQuery<HelpArticleWithCategory[]>({
    queryKey: ["/api/admin/help/articles"],
  });

  const { data: searchLogs, isLoading: searchLogsLoading } = useQuery<HelpSearchLog[]>({
    queryKey: ["/api/admin/help/search-logs"],
  });

  const createCategoryMutation = useMutation({
    mutationFn: (data: CategoryFormData) =>
      apiRequest("POST", "/api/admin/help/categories", {
        name: data.name,
        slug: data.slug,
        description: data.description || null,
        icon: data.icon || null,
        audience: data.audience,
        sortOrder: parseInt(data.sortOrder) || 0,
        active: data.active,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/help/categories"] });
      setShowCategoryDialog(false);
      setCategoryForm(defaultCategoryForm);
      toast({ title: "Category created successfully" });
    },
    onError: (err: Error) =>
      toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateCategoryMutation = useMutation({
    mutationFn: (data: CategoryFormData & { id: string }) =>
      apiRequest("PATCH", `/api/admin/help/categories/${data.id}`, {
        name: data.name,
        slug: data.slug,
        description: data.description || null,
        icon: data.icon || null,
        audience: data.audience,
        sortOrder: parseInt(data.sortOrder) || 0,
        active: data.active,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/help/categories"] });
      setShowCategoryDialog(false);
      setEditingCategory(null);
      setCategoryForm(defaultCategoryForm);
      toast({ title: "Category updated successfully" });
    },
    onError: (err: Error) =>
      toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/help/categories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/help/categories"] });
      setDeletingCategoryId(null);
      toast({ title: "Category deleted" });
    },
    onError: (err: Error) =>
      toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const createArticleMutation = useMutation({
    mutationFn: (data: ArticleFormData) =>
      apiRequest("POST", "/api/admin/help/articles", {
        title: data.title,
        slug: data.slug,
        summary: data.summary || null,
        content: data.content,
        categoryId: data.categoryId || null,
        audience: data.audience,
        status: data.status,
        tags: data.tags
          ? data.tags.split(",").map((t) => t.trim()).filter(Boolean)
          : null,
        featured: data.featured,
        countryCode: data.countryCode || null,
        sortOrder: parseInt(data.sortOrder) || 0,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/help/articles"] });
      setShowArticleDialog(false);
      setArticleForm(defaultArticleForm);
      toast({ title: "Article created successfully" });
    },
    onError: (err: Error) =>
      toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateArticleMutation = useMutation({
    mutationFn: (data: ArticleFormData & { id: string }) =>
      apiRequest("PATCH", `/api/admin/help/articles/${data.id}`, {
        title: data.title,
        slug: data.slug,
        summary: data.summary || null,
        content: data.content,
        categoryId: data.categoryId || null,
        audience: data.audience,
        status: data.status,
        tags: data.tags
          ? data.tags.split(",").map((t) => t.trim()).filter(Boolean)
          : null,
        featured: data.featured,
        countryCode: data.countryCode || null,
        sortOrder: parseInt(data.sortOrder) || 0,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/help/articles"] });
      setShowArticleDialog(false);
      setEditingArticle(null);
      setArticleForm(defaultArticleForm);
      toast({ title: "Article updated successfully" });
    },
    onError: (err: Error) =>
      toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteArticleMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/help/articles/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/help/articles"] });
      setDeletingArticleId(null);
      toast({ title: "Article deleted" });
    },
    onError: (err: Error) =>
      toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const openCreateCategory = () => {
    setEditingCategory(null);
    setCategoryForm(defaultCategoryForm);
    setShowCategoryDialog(true);
  };

  const openEditCategory = (cat: HelpCategory) => {
    setEditingCategory(cat);
    setCategoryForm({
      name: cat.name,
      slug: cat.slug,
      description: cat.description || "",
      icon: cat.icon || "",
      audience: cat.audience,
      sortOrder: String(cat.sortOrder),
      active: cat.active,
    });
    setShowCategoryDialog(true);
  };

  const handleCategorySubmit = () => {
    if (!categoryForm.name.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    if (editingCategory) {
      updateCategoryMutation.mutate({ ...categoryForm, id: editingCategory.id });
    } else {
      createCategoryMutation.mutate(categoryForm);
    }
  };

  const openCreateArticle = () => {
    setEditingArticle(null);
    setArticleForm(defaultArticleForm);
    setShowArticleDialog(true);
  };

  const openEditArticle = (article: HelpArticleWithCategory) => {
    setEditingArticle(article);
    setArticleForm({
      title: article.title,
      slug: article.slug,
      summary: article.summary || "",
      content: article.content,
      categoryId: article.categoryId || "",
      audience: article.audience,
      status: article.status,
      tags: article.tags ? article.tags.join(", ") : "",
      featured: article.featured,
      countryCode: article.countryCode || "",
      sortOrder: String(article.sortOrder),
    });
    setShowArticleDialog(true);
  };

  const handleArticleSubmit = () => {
    if (!articleForm.title.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }
    if (!articleForm.content.trim()) {
      toast({ title: "Content is required", variant: "destructive" });
      return;
    }
    if (editingArticle) {
      updateArticleMutation.mutate({ ...articleForm, id: editingArticle.id });
    } else {
      createArticleMutation.mutate(articleForm);
    }
  };

  const filteredArticles = (articles || []).filter((article) => {
    if (statusFilter !== "ALL" && article.status !== statusFilter) return false;
    if (categoryFilter !== "ALL" && article.categoryId !== categoryFilter) return false;
    if (audienceFilter !== "ALL" && article.audience !== audienceFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        article.title.toLowerCase().includes(q) ||
        (article.summary || "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6" data-testid="help-center-panel">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-semibold text-foreground" data-testid="text-help-center-title">
            Help Center Management
          </h2>
          <p className="text-sm text-muted-foreground">
            Manage help categories, articles, and review search analytics
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList data-testid="tabs-help-center">
          <TabsTrigger value="categories" data-testid="tab-categories">
            <FolderOpen className="mr-1.5 h-4 w-4" />
            Categories
          </TabsTrigger>
          <TabsTrigger value="articles" data-testid="tab-articles">
            <BookOpen className="mr-1.5 h-4 w-4" />
            Articles
          </TabsTrigger>
          <TabsTrigger value="search-logs" data-testid="tab-search-logs">
            <Search className="mr-1.5 h-4 w-4" />
            Search Logs
          </TabsTrigger>
          <TabsTrigger value="preview" data-testid="tab-preview">
            <Monitor className="mr-1.5 h-4 w-4" />
            Preview
          </TabsTrigger>
        </TabsList>

        <TabsContent value="categories">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
              <CardTitle className="text-lg" data-testid="text-categories-title">
                Categories
              </CardTitle>
              <Button onClick={openCreateCategory} data-testid="button-create-category">
                <Plus className="mr-1.5 h-4 w-4" />
                Add Category
              </Button>
            </CardHeader>
            <CardContent>
              {categoriesLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : !categories?.length ? (
                <p className="text-muted-foreground text-center py-8" data-testid="text-no-categories">
                  No categories yet. Create your first category.
                </p>
              ) : (
                <div className="space-y-2">
                  {categories.map((cat) => (
                    <div
                      key={cat.id}
                      className="flex items-center justify-between gap-4 flex-wrap rounded-md border p-3"
                      data-testid={`category-row-${cat.id}`}
                    >
                      <div className="flex items-center gap-3 flex-wrap min-w-0">
                        <div className="flex flex-col min-w-0">
                          <span className="font-medium text-foreground" data-testid={`text-category-name-${cat.id}`}>
                            {cat.icon ? `${cat.icon} ` : ""}
                            {cat.name}
                          </span>
                          <span className="text-xs text-muted-foreground" data-testid={`text-category-slug-${cat.id}`}>
                            /{cat.slug}
                          </span>
                        </div>
                        <Badge variant={audienceBadgeVariant(cat.audience)} data-testid={`badge-category-audience-${cat.id}`}>
                          {cat.audience}
                        </Badge>
                        <Badge variant={cat.active ? "default" : "outline"} data-testid={`badge-category-active-${cat.id}`}>
                          {cat.active ? "Active" : "Inactive"}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Order: {cat.sortOrder}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => openEditCategory(cat)}
                          data-testid={`button-edit-category-${cat.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setDeletingCategoryId(cat.id)}
                          data-testid={`button-delete-category-${cat.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="articles">
          <Card>
            <CardHeader className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <CardTitle className="text-lg" data-testid="text-articles-title">
                  Articles
                </CardTitle>
                <Button onClick={openCreateArticle} data-testid="button-create-article">
                  <Plus className="mr-1.5 h-4 w-4" />
                  Add Article
                </Button>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search articles..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 w-[200px]"
                    data-testid="input-search-articles"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[130px]" data-testid="select-status-filter">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Status</SelectItem>
                    <SelectItem value="DRAFT">Draft</SelectItem>
                    <SelectItem value="PUBLISHED">Published</SelectItem>
                    <SelectItem value="ARCHIVED">Archived</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-[150px]" data-testid="select-category-filter">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Categories</SelectItem>
                    {(categories || []).map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={audienceFilter} onValueChange={setAudienceFilter}>
                  <SelectTrigger className="w-[130px]" data-testid="select-audience-filter">
                    <SelectValue placeholder="Audience" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Audiences</SelectItem>
                    <SelectItem value="RIDER">Rider</SelectItem>
                    <SelectItem value="DRIVER">Driver</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {articlesLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : !filteredArticles.length ? (
                <p className="text-muted-foreground text-center py-8" data-testid="text-no-articles">
                  No articles found.
                </p>
              ) : (
                <div className="space-y-2">
                  {filteredArticles.map((article) => (
                    <div
                      key={article.id}
                      className="flex items-start justify-between gap-4 flex-wrap rounded-md border p-3"
                      data-testid={`article-row-${article.id}`}
                    >
                      <div className="flex flex-col gap-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-foreground" data-testid={`text-article-title-${article.id}`}>
                            {article.title}
                          </span>
                          {article.featured && (
                            <Star className="h-4 w-4 text-yellow-500" data-testid={`icon-featured-${article.id}`} />
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground" data-testid={`text-article-slug-${article.id}`}>
                          /{article.slug}
                        </span>
                        {article.summary && (
                          <span className="text-sm text-muted-foreground line-clamp-1">
                            {article.summary}
                          </span>
                        )}
                        <div className="flex items-center gap-2 flex-wrap mt-1">
                          <Badge variant={statusBadgeVariant(article.status)} data-testid={`badge-article-status-${article.id}`}>
                            {article.status}
                          </Badge>
                          <Badge variant={audienceBadgeVariant(article.audience)} data-testid={`badge-article-audience-${article.id}`}>
                            {article.audience}
                          </Badge>
                          {article.categoryName && (
                            <Badge variant="outline" data-testid={`badge-article-category-${article.id}`}>
                              {article.categoryName}
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            Views: {article.viewCount}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(article.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => openEditArticle(article)}
                          data-testid={`button-edit-article-${article.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setDeletingArticleId(article.id)}
                          data-testid={`button-delete-article-${article.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="search-logs">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg" data-testid="text-search-logs-title">
                Recent Search Queries
              </CardTitle>
            </CardHeader>
            <CardContent>
              {searchLogsLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : !searchLogs?.length ? (
                <p className="text-muted-foreground text-center py-8" data-testid="text-no-search-logs">
                  No search logs yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {searchLogs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-center justify-between gap-4 flex-wrap rounded-md border p-3"
                      data-testid={`search-log-row-${log.id}`}
                    >
                      <div className="flex items-center gap-3 flex-wrap">
                        <Search className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-foreground" data-testid={`text-search-query-${log.id}`}>
                          {log.query}
                        </span>
                        <Badge variant="secondary" data-testid={`badge-results-count-${log.id}`}>
                          {log.resultsCount} result{log.resultsCount !== 1 ? "s" : ""}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground" data-testid={`text-search-time-${log.id}`}>
                        {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
              <CardTitle className="text-lg" data-testid="text-preview-title">
                Preview Help Center
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant={previewAudience === "RIDER" ? "default" : "outline"}
                  onClick={() => setPreviewAudience("RIDER")}
                  data-testid="button-preview-rider"
                >
                  Preview as Rider
                </Button>
                <Button
                  variant={previewAudience === "DRIVER" ? "default" : "outline"}
                  onClick={() => setPreviewAudience("DRIVER")}
                  data-testid="button-preview-driver"
                >
                  Preview as Driver
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="border rounded-md p-4 bg-muted/30 min-h-[400px]" data-testid="preview-container">
                <PreviewHelpCenter audience={previewAudience} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
        <DialogContent className="max-h-[90vh] overflow-y-auto" data-testid="dialog-category-form">
          <DialogHeader>
            <DialogTitle data-testid="text-category-dialog-title">
              {editingCategory ? "Edit Category" : "Create Category"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="category-name">Name</Label>
              <Input
                id="category-name"
                value={categoryForm.name}
                onChange={(e) => {
                  const name = e.target.value;
                  setCategoryForm((f) => ({
                    ...f,
                    name,
                    slug: editingCategory ? f.slug : toSlug(name),
                  }));
                }}
                placeholder="Category name"
                data-testid="input-category-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category-slug">Slug</Label>
              <Input
                id="category-slug"
                value={categoryForm.slug}
                onChange={(e) => setCategoryForm((f) => ({ ...f, slug: e.target.value }))}
                placeholder="category-slug"
                data-testid="input-category-slug"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category-description">Description</Label>
              <Textarea
                id="category-description"
                value={categoryForm.description}
                onChange={(e) => setCategoryForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Optional description"
                data-testid="input-category-description"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category-icon">Icon</Label>
              <Input
                id="category-icon"
                value={categoryForm.icon}
                onChange={(e) => setCategoryForm((f) => ({ ...f, icon: e.target.value }))}
                placeholder="Icon name or emoji"
                data-testid="input-category-icon"
              />
            </div>
            <div className="space-y-2">
              <Label>Audience</Label>
              <Select
                value={categoryForm.audience}
                onValueChange={(v) => setCategoryForm((f) => ({ ...f, audience: v }))}
              >
                <SelectTrigger data-testid="select-category-audience">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All</SelectItem>
                  <SelectItem value="RIDER">Rider</SelectItem>
                  <SelectItem value="DRIVER">Driver</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="category-sort-order">Sort Order</Label>
              <Input
                id="category-sort-order"
                type="number"
                value={categoryForm.sortOrder}
                onChange={(e) => setCategoryForm((f) => ({ ...f, sortOrder: e.target.value }))}
                data-testid="input-category-sort-order"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={categoryForm.active ? "default" : "outline"}
                onClick={() => setCategoryForm((f) => ({ ...f, active: !f.active }))}
                data-testid="button-category-active-toggle"
              >
                {categoryForm.active ? (
                  <Eye className="mr-1.5 h-4 w-4" />
                ) : (
                  <EyeOff className="mr-1.5 h-4 w-4" />
                )}
                {categoryForm.active ? "Active" : "Inactive"}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCategoryDialog(false)}
              data-testid="button-cancel-category"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCategorySubmit}
              disabled={createCategoryMutation.isPending || updateCategoryMutation.isPending}
              data-testid="button-save-category"
            >
              {createCategoryMutation.isPending || updateCategoryMutation.isPending
                ? "Saving..."
                : editingCategory
                ? "Update"
                : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showArticleDialog} onOpenChange={setShowArticleDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-article-form">
          <DialogHeader>
            <DialogTitle data-testid="text-article-dialog-title">
              {editingArticle ? "Edit Article" : "Create Article"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="article-title">Title</Label>
              <Input
                id="article-title"
                value={articleForm.title}
                onChange={(e) => {
                  const title = e.target.value;
                  setArticleForm((f) => ({
                    ...f,
                    title,
                    slug: editingArticle ? f.slug : toSlug(title),
                  }));
                }}
                placeholder="Article title"
                data-testid="input-article-title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="article-slug">Slug</Label>
              <Input
                id="article-slug"
                value={articleForm.slug}
                onChange={(e) => setArticleForm((f) => ({ ...f, slug: e.target.value }))}
                placeholder="article-slug"
                data-testid="input-article-slug"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="article-summary">Summary</Label>
              <Input
                id="article-summary"
                value={articleForm.summary}
                onChange={(e) => setArticleForm((f) => ({ ...f, summary: e.target.value }))}
                placeholder="Brief summary"
                data-testid="input-article-summary"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="article-content">Content</Label>
              <Textarea
                id="article-content"
                value={articleForm.content}
                onChange={(e) => setArticleForm((f) => ({ ...f, content: e.target.value }))}
                placeholder="Article content..."
                className="min-h-[150px]"
                data-testid="input-article-content"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={articleForm.categoryId || "none"}
                  onValueChange={(v) => setArticleForm((f) => ({ ...f, categoryId: v === "none" ? "" : v }))}
                >
                  <SelectTrigger data-testid="select-article-category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {(categories || []).map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Audience</Label>
                <Select
                  value={articleForm.audience}
                  onValueChange={(v) => setArticleForm((f) => ({ ...f, audience: v }))}
                >
                  <SelectTrigger data-testid="select-article-audience">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All</SelectItem>
                    <SelectItem value="RIDER">Rider</SelectItem>
                    <SelectItem value="DRIVER">Driver</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={articleForm.status}
                  onValueChange={(v) => setArticleForm((f) => ({ ...f, status: v }))}
                >
                  <SelectTrigger data-testid="select-article-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRAFT">Draft</SelectItem>
                    <SelectItem value="PUBLISHED">Published</SelectItem>
                    <SelectItem value="ARCHIVED">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="article-sort-order">Sort Order</Label>
                <Input
                  id="article-sort-order"
                  type="number"
                  value={articleForm.sortOrder}
                  onChange={(e) => setArticleForm((f) => ({ ...f, sortOrder: e.target.value }))}
                  data-testid="input-article-sort-order"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="article-tags">Tags (comma-separated)</Label>
              <Input
                id="article-tags"
                value={articleForm.tags}
                onChange={(e) => setArticleForm((f) => ({ ...f, tags: e.target.value }))}
                placeholder="tag1, tag2, tag3"
                data-testid="input-article-tags"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="article-country">Country Code (optional)</Label>
              <Input
                id="article-country"
                value={articleForm.countryCode}
                onChange={(e) => setArticleForm((f) => ({ ...f, countryCode: e.target.value }))}
                placeholder="e.g. NG, US"
                data-testid="input-article-country"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={articleForm.featured ? "default" : "outline"}
                onClick={() => setArticleForm((f) => ({ ...f, featured: !f.featured }))}
                data-testid="button-article-featured-toggle"
              >
                {articleForm.featured ? (
                  <Star className="mr-1.5 h-4 w-4" />
                ) : (
                  <StarOff className="mr-1.5 h-4 w-4" />
                )}
                {articleForm.featured ? "Featured" : "Not Featured"}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowArticleDialog(false)}
              data-testid="button-cancel-article"
            >
              Cancel
            </Button>
            <Button
              onClick={handleArticleSubmit}
              disabled={createArticleMutation.isPending || updateArticleMutation.isPending}
              data-testid="button-save-article"
            >
              {createArticleMutation.isPending || updateArticleMutation.isPending
                ? "Saving..."
                : editingArticle
                ? "Update"
                : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deletingCategoryId} onOpenChange={() => setDeletingCategoryId(null)}>
        <DialogContent data-testid="dialog-delete-category">
          <DialogHeader>
            <DialogTitle>Delete Category</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this category? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeletingCategoryId(null)}
              data-testid="button-cancel-delete-category"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deletingCategoryId && deleteCategoryMutation.mutate(deletingCategoryId)}
              disabled={deleteCategoryMutation.isPending}
              data-testid="button-confirm-delete-category"
            >
              {deleteCategoryMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deletingArticleId} onOpenChange={() => setDeletingArticleId(null)}>
        <DialogContent data-testid="dialog-delete-article">
          <DialogHeader>
            <DialogTitle>Delete Article</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this article? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeletingArticleId(null)}
              data-testid="button-cancel-delete-article"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deletingArticleId && deleteArticleMutation.mutate(deletingArticleId)}
              disabled={deleteArticleMutation.isPending}
              data-testid="button-confirm-delete-article"
            >
              {deleteArticleMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PreviewHelpCenter({ audience }: { audience: "RIDER" | "DRIVER" }) {
  const [previewSearch, setPreviewSearch] = useState("");
  const [selectedArticle, setSelectedArticle] = useState<HelpArticleWithCategory | null>(null);

  const { data: categories } = useQuery<HelpCategory[]>({
    queryKey: ["/api/help/categories", `?audience=${audience}`],
  });

  const { data: articles } = useQuery<HelpArticleWithCategory[]>({
    queryKey: ["/api/help/articles", `?audience=${audience}`],
  });

  const { data: searchResults } = useQuery<HelpArticleWithCategory[]>({
    queryKey: ["/api/help/search", `?q=${encodeURIComponent(previewSearch)}&audience=${audience}`],
    enabled: previewSearch.trim().length > 0,
  });

  const isSearching = previewSearch.trim().length > 0;
  const displayArticles = isSearching ? searchResults : articles;

  if (selectedArticle) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => setSelectedArticle(null)} data-testid="button-preview-back">
          Back
        </Button>
        <h3 className="text-lg font-semibold" data-testid="text-preview-article-title">{selectedArticle.title}</h3>
        {selectedArticle.summary && (
          <p className="text-sm text-muted-foreground">{selectedArticle.summary}</p>
        )}
        <div className="prose prose-sm max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: selectedArticle.content }} data-testid="text-preview-article-content" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <p className="text-sm text-muted-foreground mb-2" data-testid="text-preview-audience">
          Viewing as: <Badge>{audience}</Badge>
        </p>
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search help articles..."
          value={previewSearch}
          onChange={(e: any) => setPreviewSearch(e.target.value)}
          className="pl-9"
          data-testid="input-preview-search"
        />
      </div>

      {!isSearching && categories && categories.filter(c => c.active).length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {categories.filter(c => c.active).map((cat) => (
            <div key={cat.id} className="p-3 border rounded-md text-center text-sm font-medium" data-testid={`preview-category-${cat.id}`}>
              {cat.name}
            </div>
          ))}
        </div>
      )}

      <div className="space-y-2">
        <h4 className="text-sm font-semibold">{isSearching ? "Search Results" : "Articles"}</h4>
        {!displayArticles || displayArticles.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4" data-testid="text-preview-no-articles">
            {isSearching ? "No results found" : "No articles available for this audience"}
          </p>
        ) : (
          displayArticles.map((article) => (
            <div
              key={article.id}
              className="p-3 border rounded-md cursor-pointer hover-elevate"
              onClick={() => setSelectedArticle(article)}
              data-testid={`preview-article-${article.id}`}
            >
              <p className="font-medium text-sm">{article.title}</p>
              {article.summary && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{article.summary}</p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
