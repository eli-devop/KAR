import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getDashboardLive } from "@/lib/news.functions";

export function useDashboardLive() {
  const fn = useServerFn(getDashboardLive);
  return useQuery({
    queryKey: ["dashboard-live"],
    queryFn: () => fn(),
    refetchInterval: 5 * 60_000,
    staleTime: 60_000,
  });
}
