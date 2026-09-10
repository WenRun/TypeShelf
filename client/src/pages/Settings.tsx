import { useState, useEffect } from "react";
import { Sidebar, MobileSidebar } from "@/components/Sidebar";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { useTheme } from "@/hooks/use-theme";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Moon,
  Sun,
  Download,
  Database,
  Globe,
  Settings as SettingsIcon,
  Menu,
  Sparkles,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Loader2,
  PlugZap,
  RotateCcw,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { type AiSettings, DEFAULT_AI_SYSTEM_PROMPT } from "@shared/schema";

const PROVIDER_PRESETS: Record<string, { nameKey: string; baseUrl: string; model: string }> = {
  deepseek: {
    nameKey: "settings.aiPresetDeepSeek",
    baseUrl: "https://api.deepseek.com",
    model: "deepseek-chat",
  },
  openai: {
    nameKey: "settings.aiPresetOpenAI",
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
  },
  qwen: {
    nameKey: "settings.aiPresetQwen",
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    model: "qwen-plus",
  },
  moonshot: {
    nameKey: "settings.aiPresetMoonshot",
    baseUrl: "https://api.moonshot.cn/v1",
    model: "moonshot-v1-8k",
  },
  ollama: {
    nameKey: "settings.aiPresetOllama",
    baseUrl: "http://localhost:11434/v1",
    model: "qwen2.5:7b",
  },
  custom: {
    nameKey: "settings.aiPresetCustom",
    baseUrl: "",
    model: "",
  },
};

export default function Settings() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<AiSettings>({
    enabled: false,
    provider: "deepseek",
    baseUrl: "https://api.deepseek.com",
    apiKey: "",
    model: "deepseek-chat",
    temperature: 0.3,
    systemPrompt: DEFAULT_AI_SYSTEM_PROMPT,
  });

  const [showApiKey, setShowApiKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [testStatus, setTestStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Fetch AI settings from server
  const { data: serverAiSettings, isSuccess } = useQuery<AiSettings>({
    queryKey: ["/api/settings/ai"],
    queryFn: async () => {
      const res = await fetch("/api/settings/ai");
      if (!res.ok) throw new Error("Failed to fetch AI settings");
      return res.json();
    },
  });

  useEffect(() => {
    if (isSuccess && serverAiSettings) {
      setFormData({
        ...serverAiSettings,
        systemPrompt: serverAiSettings.systemPrompt || DEFAULT_AI_SYSTEM_PROMPT,
      });
    }
  }, [isSuccess, serverAiSettings]);

  const handleProviderChange = (newProvider: string) => {
    const preset = PROVIDER_PRESETS[newProvider];
    if (preset && newProvider !== "custom") {
      setFormData((prev) => ({
        ...prev,
        provider: newProvider,
        baseUrl: preset.baseUrl,
        model: preset.model,
      }));
    } else {
      setFormData((prev) => ({ ...prev, provider: newProvider }));
    }
  };

  const handleTestConnection = async () => {
    if (!formData.baseUrl) {
      toast({
        title: t("settings.aiBaseUrl") + " 不能为空",
        variant: "destructive",
      });
      return;
    }
    setIsTesting(true);
    setTestStatus(null);
    try {
      const res = await apiRequest("POST", "/api/settings/ai/test", formData);
      const data = await res.json();
      if (data.success) {
        setTestStatus({
          type: "success",
          message: `${t("settings.aiTestSuccess")} (${t("settings.aiLatency")}: ${data.latencyMs}ms)`,
        });
        toast({
          title: t("settings.aiTestSuccess"),
          description: `${t("settings.aiLatency")}: ${data.latencyMs}ms`,
        });
      } else {
        setTestStatus({
          type: "error",
          message: data.message || t("settings.aiTestFailed"),
        });
        toast({
          title: t("settings.aiTestFailed"),
          description: data.message,
          variant: "destructive",
        });
      }
    } catch (err: any) {
      const errMsg = err.message || t("settings.aiTestFailed");
      setTestStatus({
        type: "error",
        message: errMsg,
      });
      toast({
        title: t("settings.aiTestFailed"),
        description: errMsg,
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      const res = await apiRequest("POST", "/api/settings/ai", formData);
      const data = await res.json();
      setFormData(data);
      queryClient.invalidateQueries({ queryKey: ["/api/settings/ai"] });
      toast({
        title: t("settings.aiSaveSuccess"),
      });
    } catch (err: any) {
      toast({
        title: t("settings.aiSaveFailed"),
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const exportDatabase = async () => {
    try {
      toast({
        title: t("settings.exporting"),
        description: t("settings.exportingDesc"),
      });

      const res = await fetch("/api/backup/export").catch(() => null);
      if (res && res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "runfonts_backup.json";
        a.click();
        window.URL.revokeObjectURL(url);
      }

      setTimeout(() => {
        toast({
          title: t("settings.exportSuccess"),
          description: t("settings.exportSuccessDesc"),
        });
      }, 1000);
    } catch (err) {
      toast({ title: t("settings.exportFailed"), variant: "destructive" });
    }
  };

  return (
    <div className="flex h-screen bg-background text-foreground">
      <Sidebar />
      <MobileSidebar open={mobileMenuOpen} onOpenChange={setMobileMenuOpen} />

      <main className="flex-1 flex flex-col h-full overflow-y-auto custom-scrollbar">
        {/* Mobile Header Bar */}
        <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-card/50 backdrop-blur-xl shrink-0">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 -ml-1 text-muted-foreground hover:text-foreground"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Toggle Navigation Menu"
            >
              <Menu className="w-5 h-5" />
            </Button>
            <span className="font-bold font-display text-lg">{t("settings.title")}</span>
          </div>
          <div className="flex items-center gap-1">
            <ThemeSwitcher variant="icon" />
            <LanguageSwitcher variant="icon" />
          </div>
        </div>

        <div className="max-w-4xl mx-auto p-4 sm:p-8 space-y-6 sm:space-y-8 pb-12 w-full">
          <div className="hidden md:flex items-center gap-3 mb-8">
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
                  <ThemeSwitcher variant="select" showToast={true} />
                </div>
              </CardContent>
            </Card>

            {/* AI Configuration Card */}
            <Card className="bg-card border-border md:col-span-2 shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg flex items-center gap-2 text-primary">
                      <Sparkles className="w-5 h-5 text-amber-500" />
                      {t("settings.aiTitle")}
                    </CardTitle>
                    <CardDescription>{t("settings.aiDesc")}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Enable Switch */}
                <div className="flex items-center justify-between p-4 bg-secondary/20 rounded-lg border border-border/50">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium cursor-pointer" htmlFor="ai-enable-switch">
                      {t("settings.aiEnable")}
                    </Label>
                    <p className="text-xs text-muted-foreground">{t("settings.aiEnableDesc")}</p>
                  </div>
                  <Switch
                    id="ai-enable-switch"
                    checked={formData.enabled}
                    onCheckedChange={(val) => setFormData((prev) => ({ ...prev, enabled: val }))}
                  />
                </div>

                {/* Form Inputs */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Provider Preset */}
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                      {t("settings.aiProvider")}
                    </Label>
                    <Select value={formData.provider} onValueChange={handleProviderChange}>
                      <SelectTrigger className="w-full bg-background border-border">
                        <SelectValue placeholder={t("settings.aiSelectProvider")} />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(PROVIDER_PRESETS).map(([key, item]) => (
                          <SelectItem key={key} value={key}>
                            {t(item.nameKey)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Model Name */}
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                      {t("settings.aiModel")}
                    </Label>
                    <Input
                      value={formData.model}
                      onChange={(e) => setFormData((prev) => ({ ...prev, model: e.target.value }))}
                      placeholder={t("settings.aiModelPlaceholder")}
                      className="bg-background border-border"
                    />
                  </div>

                  {/* Base URL */}
                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                      {t("settings.aiBaseUrl")}
                    </Label>
                    <Input
                      value={formData.baseUrl}
                      onChange={(e) => setFormData((prev) => ({ ...prev, baseUrl: e.target.value }))}
                      placeholder={t("settings.aiBaseUrlPlaceholder")}
                      className="bg-background border-border font-mono text-sm"
                    />
                  </div>

                  {/* API Key */}
                  <div className="space-y-2 md:col-span-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                        {t("settings.aiApiKey")}
                      </Label>
                      {formData.provider === "ollama" && (
                        <span className="text-xs text-muted-foreground">{t("settings.aiOllamaNotice")}</span>
                      )}
                    </div>
                    <div className="relative">
                      <Input
                        type={showApiKey ? "text" : "password"}
                        value={formData.apiKey}
                        onChange={(e) => setFormData((prev) => ({ ...prev, apiKey: e.target.value }))}
                        placeholder={t("settings.aiApiKeyPlaceholder")}
                        className="bg-background border-border pr-10 font-mono text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                        tabIndex={-1}
                      >
                        {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* System Prompt */}
                  <div className="space-y-2 md:col-span-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold uppercase text-muted-foreground tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        {t("settings.aiSystemPrompt")}
                      </Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer"
                        onClick={() => setFormData((prev) => ({ ...prev, systemPrompt: DEFAULT_AI_SYSTEM_PROMPT }))}
                        title={t("settings.aiResetPromptTitle")}
                      >
                        <RotateCcw className="w-3 h-3" />
                        {t("settings.aiResetPrompt")}
                      </Button>
                    </div>
                    <Textarea
                      value={formData.systemPrompt ?? DEFAULT_AI_SYSTEM_PROMPT}
                      onChange={(e) => setFormData((prev) => ({ ...prev, systemPrompt: e.target.value }))}
                      placeholder={t("settings.aiSystemPromptPlaceholder")}
                      className="min-h-[170px] font-mono text-xs bg-background border-border leading-relaxed resize-y"
                      rows={8}
                    />
                    <p className="text-[11px] text-muted-foreground">
                      {t("settings.aiSystemPromptDesc")}
                    </p>
                  </div>
                </div>

                {/* Test Result Alert */}
                {testStatus && (
                  <div
                    className={cn(
                      "p-3.5 rounded-lg border text-sm flex items-start gap-2.5 transition-all",
                      testStatus.type === "success"
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                        : "bg-destructive/10 border-destructive/30 text-destructive"
                    )}
                  >
                    {testStatus.type === "success" ? (
                      <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    )}
                    <span className="leading-tight">{testStatus.message}</span>
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 sm:gap-3 pt-2 border-t border-border/50">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleTestConnection}
                    disabled={isTesting || isSaving}
                    className="w-full sm:w-auto"
                  >
                    {isTesting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {t("settings.aiTesting")}
                      </>
                    ) : (
                      <>
                        <PlugZap className="w-4 h-4 mr-2 text-amber-500" />
                        {t("settings.aiTestBtn")}
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleSaveSettings}
                    disabled={isSaving || isTesting}
                    className="w-full sm:w-auto"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {t("settings.aiSaving")}
                      </>
                    ) : (
                      t("settings.aiSaveBtn")
                    )}
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
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-secondary/20 rounded-lg border border-border/50">
                  <div className="flex items-center gap-3">
                    <Database className="w-5 h-5 text-primary shrink-0" />
                    <span className="font-medium text-sm sm:text-base">{t("settings.jsonBackup")}</span>
                  </div>
                  <Button variant="outline" size="sm" onClick={exportDatabase} className="w-full sm:w-auto shrink-0">
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
