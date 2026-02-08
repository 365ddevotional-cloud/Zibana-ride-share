import { useState } from "react";
import { RiderLayout } from "@/components/rider/RiderLayout";
import { RiderRouteGuard } from "@/components/rider/RiderRouteGuard";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Check, RotateCcw } from "lucide-react";
import { useLocation } from "wouter";
import { useTranslation, LANGUAGES } from "@/i18n";
import { useToast } from "@/hooks/use-toast";
import { ZibraFloatingButton } from "@/components/rider/ZibraFloatingButton";

const languageGroups = [
  { key: "global", label: "Global Languages", labelKey: "language.globalLanguages" },
  { key: "nigeria", label: "Nigeria", labelKey: "language.nigeria" },
  { key: "southernEastern", label: "Southern & Eastern Africa", labelKey: "language.southernEasternAfrica" },
  { key: "optional", label: "Additional Languages", labelKey: "language.optional" },
];

export default function RiderLanguage() {
  const [, setLocation] = useLocation();
  const { t, language, setLanguage } = useTranslation();
  const { toast } = useToast();
  const [selected, setSelected] = useState(language);

  const handleSelect = (code: string) => {
    setSelected(code);
    setLanguage(code);
    const lang = LANGUAGES.find((l) => l.code === code);
    toast({
      title: lang ? `${lang.nativeName} (${lang.name})` : code,
      description: code === "en" ? "Language set to English" : t("language.current"),
    });
  };

  const handleReset = () => {
    setSelected("en");
    setLanguage("en");
    toast({
      title: "English (Default)",
      description: "Language reset to English",
    });
  };

  return (
    <RiderRouteGuard>
      <RiderLayout>
        <div className="p-4 space-y-5 max-w-lg mx-auto">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/rider/settings")}
              data-testid="button-back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-xl font-bold" data-testid="text-language-title">
                {t("language.title")}
              </h1>
              <p className="text-sm text-muted-foreground">
                {t("language.subtitle")}
              </p>
            </div>
            {selected !== "en" && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                data-testid="button-reset-english"
                className="gap-1"
              >
                <RotateCcw className="h-3 w-3" />
                EN
              </Button>
            )}
          </div>

          {selected !== "en" && (
            <button
              onClick={handleReset}
              className="w-full text-center text-xs text-muted-foreground underline py-1"
              data-testid="button-reset-english-text"
            >
              Reset to English
            </button>
          )}

          {languageGroups.map((group) => {
            const groupLangs = LANGUAGES.filter((l) => l.group === group.key);
            if (groupLangs.length === 0) return null;

            return (
              <div key={group.key} className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-1 mb-2">
                  {t(group.labelKey)}
                </p>
                <Card>
                  <CardContent className="p-0 divide-y">
                    {groupLangs.map((lang) => {
                      const isSelected = selected === lang.code;
                      const isDefault = lang.code === "en";

                      return (
                        <button
                          key={lang.code}
                          className={`w-full p-4 flex items-center gap-3 hover-elevate cursor-pointer transition-colors ${
                            isSelected ? "bg-primary/5" : ""
                          }`}
                          onClick={() => handleSelect(lang.code)}
                          data-testid={`button-lang-${lang.code}`}
                        >
                          <div className="flex-1 min-w-0 text-left">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-medium text-sm">
                                {lang.nativeName}
                                {lang.nativeName !== lang.name && (
                                  <span className="text-muted-foreground font-normal ml-1">
                                    ({lang.name})
                                  </span>
                                )}
                              </p>
                              {isDefault && (
                                <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                  {t("language.default")}
                                </span>
                              )}
                            </div>
                          </div>
                          {isSelected && (
                            <Check className="h-5 w-5 text-primary shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </CardContent>
                </Card>
              </div>
            );
          })}

          <div className="flex justify-center pt-2">
            <button
              onClick={handleReset}
              className="text-xs text-muted-foreground underline"
              data-testid="button-reset-english-bottom"
            >
              Reset to English
            </button>
          </div>
        </div>
        <ZibraFloatingButton />
      </RiderLayout>
    </RiderRouteGuard>
  );
}