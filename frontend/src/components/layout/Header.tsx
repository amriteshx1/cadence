import { RefreshCw, Search } from "lucide-react";
import { Button } from "../ui/Button";
import { Input } from "../ui/input";
import { SidebarTrigger } from "../ui/sidebar";

type Props = {
  query: string;
  onQuery: (value: string) => void;
  onRefresh: () => void;
};

export function Header({ query, onQuery, onRefresh }: Props) {
  return (
    <div className="flex items-center gap-2 border-b border-line px-3 py-3 sm:gap-3 sm:px-6 md:px-4 md:py-4">
      <SidebarTrigger aria-label="Toggle sidebar" />
      <label className="relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" />
        <Input
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Search"
          className="pl-10"
          aria-label="Search"
        />
      </label>
      <Button variant="ghost" className="!size-9 shrink-0 !px-0" title="Refresh" aria-label="Refresh" onClick={onRefresh}>
        <RefreshCw className="size-4" />
      </Button>
    </div>
  );
}
