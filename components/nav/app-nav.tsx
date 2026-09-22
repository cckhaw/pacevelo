"use client";

import Link from "next/link";
import { Building2, LayoutDashboard, LogOut, Menu, MoreVertical, Trophy, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogoInline } from "@/components/logo";

type NavVariant = "admin" | "employee" | "guest";

interface NavLinkItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export interface AppNavProps {
  variant: NavVariant;
  fullName?: string;
  /** Admin only - whether the company has been set up yet; hides nav links during onboarding. */
  hasCompany?: boolean;
  brandHref: string;
  /** Company logo to show instead of the PaceVelo mark (leaderboard page only). */
  brandLogoUrl?: string | null;
  brandLabel?: string;
  signOutAction?: () => Promise<void>;
}

function primaryLinksFor(variant: NavVariant, hasCompany: boolean): NavLinkItem[] {
  if (variant === "admin") {
    if (!hasCompany) return [];
    return [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
      { href: "/admin/challenges", label: "Challenges", icon: Trophy },
    ];
  }
  if (variant === "employee") {
    return [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }];
  }
  return [];
}

function menuLinksFor(variant: NavVariant, hasCompany: boolean): NavLinkItem[] {
  if (variant === "admin") {
    return [
      ...(hasCompany ? [{ href: "/admin/company", label: "Company settings", icon: Building2 }] : []),
      { href: "/admin/account", label: "Account", icon: UserRound },
    ];
  }
  return [];
}

function SignOutMenuItem({ signOutAction }: { signOutAction: () => Promise<void> }) {
  return (
    <DropdownMenuItem
      className="text-destructive focus:text-destructive"
      onSelect={() => {
        void signOutAction();
      }}
    >
      <LogOut className="h-4 w-4" /> Sign out
    </DropdownMenuItem>
  );
}

export function AppNav({
  variant,
  fullName,
  hasCompany = true,
  brandHref,
  brandLogoUrl,
  brandLabel,
  signOutAction,
}: AppNavProps) {
  const primaryLinks = primaryLinksFor(variant, hasCompany);
  const menuLinks = menuLinksFor(variant, hasCompany);
  const hasMenu = variant !== "guest" && Boolean(signOutAction);

  return (
    <header className="border-b bg-card">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link
          href={brandHref}
          className="flex items-center gap-2 opacity-90 transition-opacity hover:opacity-100"
        >
          {brandLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- storage URL, not a static asset
            <img
              src={brandLogoUrl}
              alt={brandLabel ?? "Company logo"}
              className="h-8 w-8 rounded-md object-contain"
            />
          ) : (
            <LogoInline markSize={32} />
          )}
        </Link>

        {/* Desktop: primary links inline, everything else in a compact menu */}
        <div className="hidden items-center gap-4 md:flex">
          {primaryLinks.length > 0 ? (
            <nav className="flex items-center gap-4 text-sm text-muted-foreground">
              {primaryLinks.map((item) => (
                <Link key={item.href} href={item.href} className="hover:text-foreground">
                  {item.label}
                </Link>
              ))}
            </nav>
          ) : null}

          {hasMenu ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" aria-label="Account menu">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {fullName ? <DropdownMenuLabel>{fullName}</DropdownMenuLabel> : null}
                {menuLinks.map((item) => (
                  <DropdownMenuItem key={item.href} asChild>
                    <Link href={item.href}>
                      <item.icon className="h-4 w-4" /> {item.label}
                    </Link>
                  </DropdownMenuItem>
                ))}
                {menuLinks.length > 0 ? <DropdownMenuSeparator /> : null}
                {signOutAction ? <SignOutMenuItem signOutAction={signOutAction} /> : null}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : variant === "guest" ? (
            <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">
              Log in
            </Link>
          ) : null}
        </div>

        {/* Mobile: a single hamburger houses every item */}
        <div className="md:hidden">
          {hasMenu ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" aria-label="Menu">
                  <Menu className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {fullName ? <DropdownMenuLabel>{fullName}</DropdownMenuLabel> : null}
                {[...primaryLinks, ...menuLinks].map((item) => (
                  <DropdownMenuItem key={item.href} asChild>
                    <Link href={item.href}>
                      <item.icon className="h-4 w-4" /> {item.label}
                    </Link>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                {signOutAction ? <SignOutMenuItem signOutAction={signOutAction} /> : null}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : variant === "guest" ? (
            <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">
              Log in
            </Link>
          ) : null}
        </div>
      </div>
    </header>
  );
}
