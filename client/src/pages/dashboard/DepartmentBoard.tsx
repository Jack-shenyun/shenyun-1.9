import { DepartmentDashboardPage } from "@/components/dashboard/DashboardPanels";
import type { DashboardPermissionId } from "@shared/dashboardBoards";

type DepartmentBoardRoutePageProps = {
  dashboardId: Exclude<DashboardPermissionId, "boss_dashboard">;
};

export default function DepartmentBoardRoutePage({ dashboardId }: DepartmentBoardRoutePageProps) {
  return <DepartmentDashboardPage dashboardId={dashboardId} />;
}
