
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { User, Palette } from "lucide-react";
import PasswordChangeForm from "@/components/PasswordChangeForm";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useState, useEffect } from "react";

export default function Settings() {
  const { user } = useAuth();
  const [theme, setTheme] = useState<string>("default");
  const [darkMode, setDarkMode] = useState<string>("light");

  useEffect(() => {
    const savedTheme = localStorage.getItem("app-theme") || "default";
    const savedDarkMode = localStorage.getItem("app-dark-mode") || "light";
    setTheme(savedTheme);
    setDarkMode(savedDarkMode);
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account settings
        </p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Account Information
            </CardTitle>
            <CardDescription>
              Your personal information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium">Email</p>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Appearance
            </CardTitle>
            <CardDescription>
              Customize the application appearance according to your preferences
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <Label className="text-sm font-medium mb-3 block">Display Mode</Label>
                <RadioGroup value={darkMode} onValueChange={handleDarkModeChange}>
                  <div className="flex items-center space-x-2 mb-2">
                    <RadioGroupItem value="light" id="light" />
                    <Label htmlFor="light" className="cursor-pointer">Light</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="dark" id="dark" />
                    <Label htmlFor="dark" className="cursor-pointer">Dark</Label>
                  </div>
                </RadioGroup>
              </div>
              
              <div>
                <Label className="text-sm font-medium mb-3 block">Color Theme</Label>
                <RadioGroup value={theme} onValueChange={handleThemeChange}>
                  <div className="flex items-center space-x-2 mb-2">
                    <RadioGroupItem value="default" id="default" />
                    <Label htmlFor="default" className="cursor-pointer">Classic (Blue)</Label>
                  </div>
                  <div className="flex items-center space-x-2 mb-2">
                    <RadioGroupItem value="modern" id="modern" />
                    <Label htmlFor="modern" className="cursor-pointer">Modern (Purple)</Label>
                  </div>
                  <div className="flex items-center space-x-2 mb-2">
                    <RadioGroupItem value="warm" id="warm" />
                    <Label htmlFor="warm" className="cursor-pointer">Warm (Orange)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="nature" id="nature" />
                    <Label htmlFor="nature" className="cursor-pointer">Nature (Green)</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
          </CardContent>
        </Card>

        <PasswordChangeForm />
      </div>
    </div>
  );
}
