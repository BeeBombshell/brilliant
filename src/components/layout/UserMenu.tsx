import { useState } from "react";
import { useGoogleAuth } from "@/contexts/GoogleAuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { IconChevronDown, IconMoon, IconSun, IconLogout } from "@tabler/icons-react";

export function UserMenu() {
  const { user, logout } = useGoogleAuth();
  // Use lazy initializer to avoid calling setState in an effect
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    // Check initial theme from document
    const isDark = document.documentElement.classList.contains("dark") ||
      document.body.classList.contains("dark");
    return isDark ? "dark" : "light";
  });

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);

    // Update both html and body elements
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
      document.body.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
      document.body.classList.remove("dark");
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex items-center gap-2 h-auto py-1.5 pl-1.5 pr-3 bg-muted/80 dark:bg-muted hover:bg-muted rounded-xl border border-border/60 transition-colors shadow-sm"
        >
          {user?.picture ? (
            <img src={user.picture} alt={user.name} className="size-8 rounded-full" />
          ) : (
            <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
              {user?.name?.[0] || "U"}
            </div>
          )}
          <div className="hidden lg:flex flex-col items-start overflow-hidden">
            <p className="truncate text-sm font-medium leading-none max-w-[120px] text-foreground">{user?.name || "User"}</p>
            <p className="truncate text-xs text-muted-foreground mt-1 max-w-[120px]">{user?.email}</p>
          </div>
          <IconChevronDown size={14} className="hidden lg:block text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user?.name || "User"}</p>
            <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={toggleTheme}>
          {theme === "dark" ? (
            <>
              <IconSun size={16} />
              <span>Light mode</span>
            </>
          ) : (
            <>
              <IconMoon size={16} />
              <span>Dark mode</span>
            </>
          )}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={logout} variant="destructive">
          <IconLogout size={16} />
          <span>Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
