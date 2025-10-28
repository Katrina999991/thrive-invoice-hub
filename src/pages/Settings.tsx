
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { User, Palette, Languages, FileText } from "lucide-react";
import PasswordChangeForm from "@/components/PasswordChangeForm";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useState, useEffect } from "react";
import { useLanguage } from "@/hooks/useLanguage";

export default function Settings() {
  const { user } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [theme, setTheme] = useState<string>("default");
  const [darkMode, setDarkMode] = useState<string>("light");
  const [invoiceTemplate, setInvoiceTemplate] = useState<string>("classic");
  const [invoiceColor, setInvoiceColor] = useState<string>("blue");

  useEffect(() => {
    const savedTheme = localStorage.getItem("app-theme") || "default";
    const savedDarkMode = localStorage.getItem("app-dark-mode") || "light";
    const savedInvoiceTemplate = localStorage.getItem("invoice-template") || "classic";
    const savedInvoiceColor = localStorage.getItem("invoice-color") || "blue";
    setTheme(savedTheme);
    setDarkMode(savedDarkMode);
    setInvoiceTemplate(savedInvoiceTemplate);
    setInvoiceColor(savedInvoiceColor);
    document.documentElement.setAttribute("data-theme", savedTheme);
    if (savedDarkMode === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const handleThemeChange = (value: string) => {
    setTheme(value);
    localStorage.setItem("app-theme", value);
    document.documentElement.setAttribute("data-theme", value);
  };

  const handleDarkModeChange = (value: string) => {
    setDarkMode(value);
    localStorage.setItem("app-dark-mode", value);
    if (value === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const handleInvoiceTemplateChange = (value: string) => {
    setInvoiceTemplate(value);
    localStorage.setItem("invoice-template", value);
  };

  const handleInvoiceColorChange = (value: string) => {
    setInvoiceColor(value);
    localStorage.setItem("invoice-color", value);
  };

  const getColorClasses = () => {
    const colorMap = {
      blue: {
        bg: "bg-blue-600",
        text: "text-blue-600",
        border: "border-blue-600",
        bgLight: "bg-blue-100",
        borderLight: "border-blue-200",
        gradient: "from-blue-50 to-blue-100",
        gradientAccent: "from-blue-600 to-blue-700"
      },
      green: {
        bg: "bg-green-600",
        text: "text-green-600",
        border: "border-green-600",
        bgLight: "bg-green-100",
        borderLight: "border-green-200",
        gradient: "from-green-50 to-green-100",
        gradientAccent: "from-green-600 to-green-700"
      },
      purple: {
        bg: "bg-purple-600",
        text: "text-purple-600",
        border: "border-purple-600",
        bgLight: "bg-purple-100",
        borderLight: "border-purple-200",
        gradient: "from-purple-50 to-purple-100",
        gradientAccent: "from-purple-600 to-purple-700"
      },
      orange: {
        bg: "bg-orange-600",
        text: "text-orange-600",
        border: "border-orange-600",
        bgLight: "bg-orange-100",
        borderLight: "border-orange-200",
        gradient: "from-orange-50 to-orange-100",
        gradientAccent: "from-orange-600 to-orange-700"
      },
      red: {
        bg: "bg-red-600",
        text: "text-red-600",
        border: "border-red-600",
        bgLight: "bg-red-100",
        borderLight: "border-red-200",
        gradient: "from-red-50 to-red-100",
        gradientAccent: "from-red-600 to-red-700"
      }
    };
    return colorMap[invoiceColor as keyof typeof colorMap] || colorMap.blue;
  };

  const colors = getColorClasses();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("settings.title")}</h1>
        <p className="text-muted-foreground">
          {t("settings.description")}
        </p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {t("settings.account.title")}
            </CardTitle>
            <CardDescription>
              {t("settings.account.description")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium">{t("settings.account.email")}</p>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              {t("settings.appearance.title")}
            </CardTitle>
            <CardDescription>
              {t("settings.appearance.description")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <Label className="text-sm font-medium mb-3 block">{t("settings.appearance.displayMode")}</Label>
                <RadioGroup value={darkMode} onValueChange={handleDarkModeChange}>
                  <div className="flex items-center space-x-2 mb-2">
                    <RadioGroupItem value="light" id="light" />
                    <Label htmlFor="light" className="cursor-pointer">{t("settings.appearance.light")}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="dark" id="dark" />
                    <Label htmlFor="dark" className="cursor-pointer">{t("settings.appearance.dark")}</Label>
                  </div>
                </RadioGroup>
              </div>
              
              <div>
                <Label className="text-sm font-medium mb-3 block">{t("settings.appearance.colorTheme")}</Label>
                <RadioGroup value={theme} onValueChange={handleThemeChange}>
                  <div className="flex items-center space-x-2 mb-2">
                    <RadioGroupItem value="default" id="default" />
                    <Label htmlFor="default" className="cursor-pointer">{t("settings.appearance.classic")}</Label>
                  </div>
                  <div className="flex items-center space-x-2 mb-2">
                    <RadioGroupItem value="modern" id="modern" />
                    <Label htmlFor="modern" className="cursor-pointer">{t("settings.appearance.modern")}</Label>
                  </div>
                  <div className="flex items-center space-x-2 mb-2">
                    <RadioGroupItem value="warm" id="warm" />
                    <Label htmlFor="warm" className="cursor-pointer">{t("settings.appearance.warm")}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="nature" id="nature" />
                    <Label htmlFor="nature" className="cursor-pointer">{t("settings.appearance.nature")}</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Languages className="h-5 w-5" />
              {t("settings.language.title")}
            </CardTitle>
            <CardDescription>
              {t("settings.language.description")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup value={language} onValueChange={(value: "en" | "fr") => setLanguage(value)}>
              <div className="flex items-center space-x-2 mb-2">
                <RadioGroupItem value="en" id="en" />
                <Label htmlFor="en" className="cursor-pointer">{t("settings.language.english")}</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="fr" id="fr" />
                <Label htmlFor="fr" className="cursor-pointer">{t("settings.language.french")}</Label>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {t("settings.invoice.title")}
            </CardTitle>
            <CardDescription>
              {t("settings.invoice.description")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium mb-3 block">{t("settings.invoice.templateLabel")}</Label>
                <RadioGroup value={invoiceTemplate} onValueChange={handleInvoiceTemplateChange}>
                  <div className="flex items-center space-x-2 mb-2">
                    <RadioGroupItem value="classic" id="classic" />
                    <Label htmlFor="classic" className="cursor-pointer">{t("settings.invoice.classic")}</Label>
                  </div>
                  <div className="flex items-center space-x-2 mb-2">
                    <RadioGroupItem value="modern" id="modern" />
                    <Label htmlFor="modern" className="cursor-pointer">{t("settings.invoice.modern")}</Label>
                  </div>
                  <div className="flex items-center space-x-2 mb-2">
                    <RadioGroupItem value="professional" id="professional" />
                    <Label htmlFor="professional" className="cursor-pointer">{t("settings.invoice.professional")}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="creative" id="creative" />
                    <Label htmlFor="creative" className="cursor-pointer">{t("settings.invoice.creative")}</Label>
                  </div>
                </RadioGroup>
              </div>

              <div>
                <Label className="text-sm font-medium mb-3 block">{t("settings.invoice.colorLabel")}</Label>
                <RadioGroup value={invoiceColor} onValueChange={handleInvoiceColorChange}>
                  <div className="flex items-center space-x-2 mb-2">
                    <RadioGroupItem value="blue" id="blue" />
                    <Label htmlFor="blue" className="cursor-pointer flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-blue-600"></div>
                      {t("settings.invoice.blue")}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 mb-2">
                    <RadioGroupItem value="green" id="green" />
                    <Label htmlFor="green" className="cursor-pointer flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-green-600"></div>
                      {t("settings.invoice.green")}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 mb-2">
                    <RadioGroupItem value="purple" id="purple" />
                    <Label htmlFor="purple" className="cursor-pointer flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-purple-600"></div>
                      {t("settings.invoice.purple")}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 mb-2">
                    <RadioGroupItem value="orange" id="orange" />
                    <Label htmlFor="orange" className="cursor-pointer flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-orange-600"></div>
                      {t("settings.invoice.orange")}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="red" id="red" />
                    <Label htmlFor="red" className="cursor-pointer flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-red-600"></div>
                      {t("settings.invoice.red")}
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="border rounded-lg p-4 bg-muted/30">
                <p className="text-sm font-medium mb-3">{t("settings.invoice.preview")}</p>
                {invoiceTemplate === "classic" && (
                  <div className="bg-background border rounded p-4 space-y-3 text-xs">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className={`font-bold text-sm ${colors.text}`}>ACME Company</div>
                        <div className="text-muted-foreground">123 Main St, City</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">INVOICE #001</div>
                        <div className="text-muted-foreground">2024-01-15</div>
                      </div>
                    </div>
                    <div className={`border-t ${colors.borderLight} pt-2`}>
                      <div className="font-semibold mb-1">Bill To:</div>
                      <div>Client Name</div>
                    </div>
                    <div className="border-t pt-2 space-y-1">
                      <div className={`flex justify-between font-semibold ${colors.bgLight} p-1 rounded`}>
                        <span>Item</span>
                        <span>Amount</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Service 1</span>
                        <span>$100.00</span>
                      </div>
                    </div>
                    <div className={`border-t ${colors.borderLight} pt-2`}>
                      <div className={`flex justify-between font-bold ${colors.text}`}>
                        <span>Total</span>
                        <span>$100.00</span>
                      </div>
                    </div>
                  </div>
                )}
                {invoiceTemplate === "modern" && (
                  <div className={`bg-gradient-to-br ${colors.gradient} border ${colors.borderLight} rounded p-4 space-y-3 text-xs`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <div className={`font-bold text-sm ${colors.text}`}>ACME Company</div>
                        <div className="text-muted-foreground">123 Main St, City</div>
                      </div>
                      <div className={`text-right ${colors.bg} text-white px-2 py-1 rounded`}>
                        <div className="font-bold">INV-001</div>
                      </div>
                    </div>
                    <div className="bg-background/60 rounded p-2">
                      <div className="font-semibold mb-1">Bill To:</div>
                      <div>Client Name</div>
                    </div>
                    <div className="space-y-1">
                      <div className={`flex justify-between font-semibold ${colors.bgLight} p-1 rounded`}>
                        <span>Item</span>
                        <span>Amount</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Service 1</span>
                        <span>$100.00</span>
                      </div>
                    </div>
                    <div className={`${colors.bg} text-white p-2 rounded`}>
                      <div className="flex justify-between font-bold">
                        <span>Total</span>
                        <span>$100.00</span>
                      </div>
                    </div>
                  </div>
                )}
                {invoiceTemplate === "professional" && (
                  <div className={`bg-background border-2 ${colors.border} rounded p-4 space-y-3 text-xs`}>
                    <div className={`border-b-2 ${colors.border} pb-2 flex justify-between items-start`}>
                      <div>
                        <div className={`font-bold text-base ${colors.text}`}>ACME Company</div>
                        <div className="text-muted-foreground text-xs">123 Main St, City</div>
                      </div>
                      <div className="text-right">
                        <div className="text-muted-foreground uppercase text-xs">Invoice</div>
                        <div className="font-bold">#001</div>
                        <div className="text-muted-foreground">Jan 15, 2024</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className={`font-semibold text-xs uppercase ${colors.text} mb-1`}>Bill To</div>
                        <div>Client Name</div>
                      </div>
                    </div>
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className={`border-b ${colors.borderLight}`}>
                          <th className="text-left py-1 font-semibold">Description</th>
                          <th className="text-right py-1 font-semibold">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="py-1">Service 1</td>
                          <td className="text-right">$100.00</td>
                        </tr>
                      </tbody>
                    </table>
                    <div className={`border-t-2 ${colors.border} pt-2 flex justify-end`}>
                      <div className="w-1/3">
                        <div className={`flex justify-between font-bold text-sm ${colors.text}`}>
                          <span>TOTAL</span>
                          <span>$100.00</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {invoiceTemplate === "creative" && (
                  <div className={`bg-gradient-to-br ${colors.gradient} border-2 ${colors.border} rounded-lg p-4 space-y-3 text-xs`}>
                    <div className="flex justify-between items-start">
                      <div className={`${colors.bgLight} rounded-lg p-2`}>
                        <div className={`font-bold text-sm ${colors.text}`}>ACME</div>
                        <div className="text-xs">Company</div>
                      </div>
                      <div className={`text-right ${colors.bg} text-white px-3 py-1 rounded-full`}>
                        <div className="font-bold">#001</div>
                      </div>
                    </div>
                    <div className="text-muted-foreground text-xs">123 Main St, City</div>
                    <div className={`bg-background/80 backdrop-blur rounded-lg p-2 border ${colors.borderLight}`}>
                      <div className="font-semibold mb-1">Client Name</div>
                      <div className="text-muted-foreground text-xs">Customer</div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between p-1">
                        <span className="text-muted-foreground">Service 1</span>
                        <span className="font-semibold">$100.00</span>
                      </div>
                    </div>
                    <div className={`bg-gradient-to-r ${colors.gradientAccent} text-white p-2 rounded-lg`}>
                      <div className="flex justify-between font-bold">
                        <span>Total</span>
                        <span>$100.00</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <PasswordChangeForm />
      </div>
    </div>
  );
}
