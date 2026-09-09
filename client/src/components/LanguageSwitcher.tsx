import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface LanguageSwitcherProps {
  variant?: "icon" | "select";
}

export function LanguageSwitcher({ variant = "icon" }: LanguageSwitcherProps) {
  const { i18n } = useTranslation();

  const currentLang = i18n.language || "zh-CN";
  const isZh = currentLang.toLowerCase().startsWith("zh");

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  if (variant === "select") {
    return (
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant={isZh ? "default" : "outline"}
          size="sm"
          onClick={() => changeLanguage("zh-CN")}
        >
          简体中文
        </Button>
        <Button
          type="button"
          variant={!isZh ? "default" : "outline"}
          size="sm"
          onClick={() => changeLanguage("en")}
        >
          English
        </Button>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="relative w-9 h-9"
          title={isZh ? "语言设置 / Language" : "Language settings"}
        >
          <Globe className="w-4 h-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          className={isZh ? "font-semibold text-primary" : ""}
          onClick={() => changeLanguage("zh-CN")}
        >
          简体中文 {isZh && "✓"}
        </DropdownMenuItem>
        <DropdownMenuItem
          className={!isZh ? "font-semibold text-primary" : ""}
          onClick={() => changeLanguage("en")}
        >
          English {!isZh && "✓"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
