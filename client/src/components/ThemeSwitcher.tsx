import { useTheme } from "@/hooks/use-theme";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { useToast } from "@/hooks/use-toast";

interface ThemeSwitcherProps {
  variant?: "icon" | "select";
  showToast?: boolean;
}

export function ThemeSwitcher({ variant = "icon", showToast = false }: ThemeSwitcherProps) {
  const { theme, setTheme, toggleTheme } = useTheme();
  const { t } = useTranslation();
  const { toast } = useToast();

  const handleSelect = (targetTheme: "light" | "dark") => {
    if (targetTheme === theme) return;
    setTheme(targetTheme);
    if (showToast) {
      toast({
        title: t("settings.switchedTo", {
          theme: targetTheme === "dark" ? t("common.dark") : t("common.light"),
        }),
      });
    }
  };

  const handleToggle = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    toggleTheme();
    if (showToast) {
      toast({
        title: t("settings.switchedTo", {
          theme: nextTheme === "dark" ? t("common.dark") : t("common.light"),
        }),
      });
    }
  };

  if (variant === "select") {
    return (
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant={theme === "light" ? "default" : "outline"}
          size="sm"
          onClick={() => handleSelect("light")}
          className="flex items-center gap-1.5"
        >
          <Sun className="w-4 h-4" />
          {t("settings.lightMode")}
        </Button>
        <Button
          type="button"
          variant={theme === "dark" ? "default" : "outline"}
          size="sm"
          onClick={() => handleSelect("dark")}
          className="flex items-center gap-1.5"
        >
          <Moon className="w-4 h-4" />
          {t("settings.darkMode")}
        </Button>
      </div>
    );
  }

  return (
    <Button
      variant="outline"
      size="icon"
      className="relative w-9 h-9"
      onClick={handleToggle}
      title={theme === "dark" ? t("settings.lightMode") : t("settings.darkMode")}
    >
      {theme === "dark" ? (
        <Sun className="w-4 h-4 text-muted-foreground hover:text-foreground transition-colors" />
      ) : (
        <Moon className="w-4 h-4 text-muted-foreground hover:text-foreground transition-colors" />
      )}
    </Button>
  );
}
