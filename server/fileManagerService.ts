/**
 * 文件管理服务
 * 目录结构: /ERP/{部门}/{业务类型}/{年份}/{月份}/
 * 支持本地存储，预留阿里云 OSS 接口
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { ENV } from "./_core/env";

// ============================================================
// 工具函数
// ============================================================

/** 获取文件存储根目录 */
export function getFileStorageRoot(): string {
  return ENV.fileStorageRoot
    ? path.resolve(ENV.fileStorageRoot)
    : path.resolve(process.cwd(), "uploads");
}

/** 将路径段中的非法字符替换为短横线 */
function safeSeg(value: string): string {
  return String(value ?? "")
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\.{2,}/g, ".")
    .replace(/\s+/g, " ")
    .trim();
}

/** 将虚拟路径（/ERP/销售部/...）解析为绝对磁盘路径 */
export function virtualToAbsolute(virtualPath: string): string {
  const root = getFileStorageRoot();
  // 去掉开头的 / 和 ERP，得到 ERP 之后的相对路径
  const withoutLeadingSlash = virtualPath.replace(/^\//, "");
  // 如果就是 "ERP" 或 "ERP/" 开头，去掉这个前缀
  const afterERP = withoutLeadingSlash.replace(/^ERP\/?/, "");
  const segments = afterERP
    .split("/")
    .filter(Boolean)
    .map(safeSeg);
  return path.resolve(root, "ERP", ...segments);
}

/** 将绝对路径转换为虚拟路径（/ERP/...） */
export function absoluteToVirtual(absolutePath: string): string {
  const root = getFileStorageRoot();
  const erpRoot = path.resolve(root, "ERP");
  const rel = path.relative(erpRoot, absolutePath);
  return "/ERP/" + rel.split(path.sep).join("/");
}

/** 根据文件扩展名返回 MIME 类型 */
export function getMimeType(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase();
  const map: Record<string, string> = {
    ".pdf": "application/pdf",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xls": "application/vnd.ms-excel",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".ppt": "application/vnd.ms-powerpoint",
    ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ".txt": "text/plain",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".bmp": "image/bmp",
    ".zip": "application/zip",
    ".rar": "application/x-rar-compressed",
  };
  return map[ext] || "application/octet-stream";
}

// ============================================================
// 类型定义
// ============================================================

export type FileItem = {
  name: string;
  type: "folder" | "file";
  path: string;        // 虚拟路径
  size?: number;       // 文件大小（字节），文件夹为 undefined
  modifiedAt?: string; // ISO 时间字符串
  mimeType?: string;
  ext?: string;
};

// ============================================================
// 核心操作
// ============================================================

/**
 * 列出目录内容
 * @param virtualPath 虚拟路径，如 /ERP/销售部
 */
export async function listDirectory(virtualPath: string): Promise<FileItem[]> {
  const absPath = virtualToAbsolute(virtualPath);
  try {
    await fs.mkdir(absPath, { recursive: true });
  } catch {
    // ignore
  }
  const entries = await fs.readdir(absPath, { withFileTypes: true });
  const items: FileItem[] = [];
  for (const entry of entries) {
    const entryAbs = path.join(absPath, entry.name);
    let stat;
    try {
      stat = await fs.stat(entryAbs);
    } catch {
      continue;
    }
    const entryVirtual = absoluteToVirtual(entryAbs);
    if (entry.isDirectory()) {
      items.push({
        name: entry.name,
        type: "folder",
        path: entryVirtual,
        modifiedAt: stat.mtime.toISOString(),
      });
    } else {
      items.push({
        name: entry.name,
        type: "file",
        path: entryVirtual,
        size: stat.size,
        modifiedAt: stat.mtime.toISOString(),
        mimeType: getMimeType(entry.name),
        ext: path.extname(entry.name).toLowerCase(),
      });
    }
  }
  // 文件夹排在前面，同类按名称排序
  items.sort((a, b) => {
    if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
    return a.name.localeCompare(b.name, "zh-CN");
  });
  return items;
}

/**
 * 创建文件夹
 * @param virtualPath 要创建的文件夹虚拟路径
 */
export async function createFolder(virtualPath: string): Promise<void> {
  const absPath = virtualToAbsolute(virtualPath);
  await fs.mkdir(absPath, { recursive: true });
}

/**
 * 保存上传的文件
 * @param virtualDir  目标文件夹虚拟路径
 * @param fileName    文件名
 * @param buffer      文件内容
 * @returns 保存后的虚拟路径
 */
export async function saveFile(
  virtualDir: string,
  fileName: string,
  buffer: Buffer
): Promise<string> {
  const absDir = virtualToAbsolute(virtualDir);
  await fs.mkdir(absDir, { recursive: true });
  const safeFileName = safeSeg(fileName);
  const absFilePath = path.join(absDir, safeFileName);
  await fs.writeFile(absFilePath, buffer);
  return absoluteToVirtual(absFilePath);
}

/**
 * 删除文件或文件夹
 * @param virtualPath 虚拟路径
 */
export async function deleteEntry(virtualPath: string): Promise<void> {
  const absPath = virtualToAbsolute(virtualPath);
  const stat = await fs.stat(absPath);
  if (stat.isDirectory()) {
    await fs.rm(absPath, { recursive: true, force: true });
  } else {
    await fs.unlink(absPath);
  }
}

/**
 * 重命名文件或文件夹
 * @param virtualPath    原虚拟路径
 * @param newName        新名称（仅文件名，不含路径）
 * @returns 新虚拟路径
 */
export async function renameEntry(virtualPath: string, newName: string): Promise<string> {
  const absPath = virtualToAbsolute(virtualPath);
  const parentAbs = path.dirname(absPath);
  const safeNewName = safeSeg(newName);
  const newAbsPath = path.join(parentAbs, safeNewName);
  await fs.rename(absPath, newAbsPath);
  return absoluteToVirtual(newAbsPath);
}

/**
 * 获取文件的绝对路径（用于下载）
 */
export function getAbsolutePath(virtualPath: string): string {
  return virtualToAbsolute(virtualPath);
}

/**
 * 初始化 ERP 根目录和各部门文件夹
 */
export async function initERPRootFolders(departments: string[]): Promise<void> {
  const root = getFileStorageRoot();
  const erpRoot = path.resolve(root, "ERP");
  await fs.mkdir(erpRoot, { recursive: true });
  for (const dept of departments) {
    await fs.mkdir(path.resolve(erpRoot, safeSeg(dept)), { recursive: true });
  }
}
