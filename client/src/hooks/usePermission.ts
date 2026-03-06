import { useMemo } from "react";
import { useAuth } from "@/_core/hooks/useAuth";

/**
 * 用户角色类型
 */
export type UserRole = "admin" | "user";

/**
 * 权限操作类型
 */
export type PermissionAction = "view" | "create" | "edit" | "delete";

/**
 * 权限配置
 * admin: 可以执行所有操作
 * user: 只能查看、新增、编辑，不能删除
 */
const ROLE_PERMISSIONS: Record<UserRole, PermissionAction[]> = {
  admin: ["view", "create", "edit", "delete"],
  user: ["view", "create", "edit"],
};

function parseDepartments(raw: unknown): string[] {
  const value = String(raw ?? "").trim();
  if (!value) return [];
  return value
    .split(/[,\uFF0C;\uFF1B/\u3001|\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

interface UsePermissionReturn {
  /** 当前用户角色 */
  role: UserRole;
  /** 是否是管理员 */
  isAdmin: boolean;
  /** 是否可以查看 */
  canView: boolean;
  /** 是否可以新增 */
  canCreate: boolean;
  /** 是否可以编辑 */
  canEdit: boolean;
  /** 是否可以删除 */
  canDelete: boolean;
  /** 是否可以导入 */
  canImport: boolean;
  /** 是否可以导出 */
  canExport: boolean;
  /** 是否属于销售部 */
  isSalesDept: boolean;
  /** 是否属于财务部 */
  isFinanceDept: boolean;
  /** 是否是部门负责人 */
  isDeptManager: boolean;
  /** 是否是总经理 */
  isGM: boolean;
  /** 用户部门列表 */
  departments: string[];
  /** 检查是否有指定权限 */
  hasPermission: (action: PermissionAction) => boolean;
  /** 获取当前用户所有权限 */
  permissions: PermissionAction[];
}

/**
 * 权限控制Hook
 * 
 * @example
 * ```tsx
 * const { canDelete, isAdmin } = usePermission();
 * 
 * // 根据权限显示/隐藏删除按钮
 * {canDelete && <Button onClick={handleDelete}>删除</Button>}
 * ```
 */
export function usePermission(): UsePermissionReturn {
  const { user, isAuthenticated } = useAuth();

  const departments = useMemo(() => {
    return parseDepartments((user as any)?.department);
  }, [user]);

  const role: UserRole = useMemo(() => {
    if (!isAuthenticated || !user) {
      return "user"; // 默认为普通用户
    }
    return (user.role as UserRole) || "user";
  }, [user, isAuthenticated]);

  const permissions = useMemo(() => {
    return ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.user;
  }, [role]);

  const hasPermission = useMemo(() => {
    return (action: PermissionAction) => permissions.includes(action);
  }, [permissions]);

  const isAdmin = role === "admin";
  const canView = hasPermission("view");
  const canCreate = hasPermission("create");
  const canEdit = hasPermission("edit");
  const canDelete = hasPermission("delete");

  const isSalesDept = departments.includes("销售部");
  const isFinanceDept = departments.includes("财务部");

  const isDeptManager = useMemo(() => {
    const position = String((user as any)?.position ?? "").trim();
    return position === "部门负责人" || position === "经理" || position === "总监";
  }, [user]);

  const isGM = useMemo(() => {
    const position = String((user as any)?.position ?? "").trim();
    return position === "总经理" || position === "CEO" || position === "董事长";
  }, [user]);

  // 导入导出仅管理员和部门负责人可用
  const canImport = isAdmin || isDeptManager;
  const canExport = isAdmin || isDeptManager;

  return {
    role,
    isAdmin,
    canView,
    canCreate,
    canEdit,
    canDelete,
    canImport,
    canExport,
    isSalesDept,
    isFinanceDept,
    isDeptManager,
    isGM,
    departments,
    hasPermission,
    permissions,
  };
}

/**
 * 检查指定角色是否有指定权限
 */
export function checkPermission(role: UserRole, action: PermissionAction): boolean {
  const permissions = ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.user;
  return permissions.includes(action);
}

/**
 * 获取角色的所有权限
 */
export function getRolePermissions(role: UserRole): PermissionAction[] {
  return ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.user;
}
