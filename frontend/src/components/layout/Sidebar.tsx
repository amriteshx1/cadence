import type { SessionUser } from "../../lib/types";
import { Button } from "../ui/Button";
import { IconSlack } from "../ui/Icons";
import { bullBoardUrl } from "../../lib/api";
import { Wordmark } from "../brand/Wordmark";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { ChevronDown, Clock, ListTree, LogOut, Send } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "../ui/sidebar";

type Props = {
  user: SessionUser;
  tab: "scheduled" | "sent";
  scheduledCount: number;
  sentCount: number;
  onTab: (tab: "scheduled" | "sent") => void;
  onCompose: () => void;
  onLogout: () => void;
  slackConnected: boolean;
  onSlack: () => void;
  onDisconnectSlack: () => void;
};

export function AppSidebar(props: Props) {
  const { setOpenMobile } = useSidebar();
  const go = (fn: () => void) => {
    fn();
    setOpenMobile(false);
  };

  const initials = (props.user.name || props.user.email)
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader>
        <Wordmark className="px-1 text-[22px] leading-none text-sidebar-foreground" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              className="mt-2 !h-auto w-full !justify-start gap-2.5 rounded-xl bg-sidebar-accent !px-2.5 !py-2.5 text-left hover:bg-sidebar-accent"
            >
              {props.user.avatarUrl ? (
                <img src={props.user.avatarUrl} alt="" className="size-9 rounded-full object-cover" />
              ) : (
                <div className="flex size-9 items-center justify-center rounded-full bg-sidebar-primary text-xs font-bold text-sidebar-primary-foreground">
                  {initials}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold leading-tight">{props.user.name || "Account"}</div>
                <div className="truncate text-[11px] leading-tight text-muted-foreground">{props.user.email}</div>
              </div>
              <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="z-[60] w-[var(--radix-dropdown-menu-trigger-width)]">
            {props.slackConnected ? (
              <DropdownMenuItem onSelect={() => go(props.onDisconnectSlack)}>
                <IconSlack /> Disconnect Slack
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onSelect={() => go(props.onSlack)}>
                <IconSlack /> Connect Slack
              </DropdownMenuItem>
            )}
            <DropdownMenuItem asChild>
              <a href={bullBoardUrl()} target="_blank" rel="noreferrer" onClick={() => setOpenMobile(false)}>
                <ListTree className="size-4" /> Queue dashboard
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => go(props.onLogout)}>
              <LogOut className="size-4" /> Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button variant="outline" pill className="mt-1 h-10 w-full" onClick={() => go(props.onCompose)}>
          Compose
        </Button>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Core</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton isActive={props.tab === "scheduled"} onClick={() => go(() => props.onTab("scheduled"))}>
                  <Clock />
                  <span>Scheduled</span>
                </SidebarMenuButton>
                <SidebarMenuBadge>{props.scheduledCount}</SidebarMenuBadge>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton isActive={props.tab === "sent"} onClick={() => go(() => props.onTab("sent"))}>
                  <Send />
                  <span>Sent</span>
                </SidebarMenuButton>
                <SidebarMenuBadge>{props.sentCount}</SidebarMenuBadge>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
