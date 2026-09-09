import { Sidebar } from "@/components/Sidebar";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Moon, Sun, Download, Database, Globe, Settings as SettingsIcon } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

export default function Settings() {
  const { t } = useTranslation();
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const { toast } = useToast();

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
    toast({ 
      title: t("settings.switchedTo", { 
        theme: newTheme === "dark" ? t("common.dark") : t("common.light") 
      }) 
    });
  };

  const exportDatabase = async () => {
    try {
      toast({ 
        title: t("settings.exporting"), 
        description: t("settings.exportingDesc") 
      });
      
      // Trigger download of json data or server backup
      const res = await fetch("/api/backup/export").catch(() => null);
      if (res && res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "typeshelf_backup.json";
        a.click();
        window.URL.revokeObjectURL(url);
      }
      
      setTimeout(() => {
        toast({ 
          title: t("settings.exportSuccess"), 
          description: t("settings.exportSuccessDesc") 
        });
      }, 1000);
    } catch (err) {
      toast({ title: t("settings.exportFailed"), variant: "destructive" });
    }
  };

  return (
    <div className="flex h-screen bg-background text-foreground">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="flex items-center gap-3 mb-8">
            <SettingsIcon className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold font-display">{t("settings.title")}</h1>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Language Settings Card */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Globe className="w-5 h-5 text-primary" />
                  {t("settings.language")}
                </CardTitle>
                <CardDescription>{t("settings.languageDesc")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 bg-secondary/20 rounded-lg border border-border/50">
                  <span className="text-sm font-medium">{t("settings.language")}</span>
                  <LanguageSwitcher variant="select" />
                </div>
              </CardContent>
            </Card>

            {/* Appearance Card */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  {theme === "dark" ? <Moon className="w-5 h-5 text-primary" /> : <Sun className="w-5 h-5 text-primary" />}
                  {t("settings.appearance")}
                </CardTitle>
                <CardDescription>{t("settings.appearanceDesc")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 bg-secondary/20 rounded-lg border border-border/50">
                  <div className="flex items-center gap-3">
                    {theme === "dark" ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                    <span className="font-medium">{theme === "dark" ? t("settings.darkMode") : t("settings.lightMode")}</span>
                  </div>
                  <Button variant="outline" size="sm" onClick={toggleTheme}>
                    {t("settings.switchTheme")}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Data & Backup Card */}
            <Card className="bg-card border-border md:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Database className="w-5 h-5 text-primary" />
                  {t("settings.dataBackup")}
                </CardTitle>
                <CardDescription>{t("settings.dataBackupDesc")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 bg-secondary/20 rounded-lg border border-border/50">
                  <div className="flex items-center gap-3">
                    <Database className="w-5 h-5" />
                    <span className="font-medium">{t("settings.jsonBackup")}</span>
                  </div>
                  <Button variant="outline" size="sm" onClick={exportDatabase}>
                    <Download className="w-4 h-4 mr-2" />
                    {t("settings.exportBtn")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
