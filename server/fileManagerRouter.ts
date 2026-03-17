/**
 * 文件管理 REST 路由
 * 挂载于 /api/file-manager
 *
 * 接口列表：
 *   GET  /api/file-manager/list?path=...          列出目录
 *   POST /api/file-manager/folder                 新建文件夹
 *   POST /api/file-manager/upload                 上传文件（multipart/form-data）
 *   GET  /api/file-manager/preview-url?path=...   获取预览链接
 *   GET  /api/file-manager/public-view?...        文件在线预览
 *   GET  /api/file-manager/download?path=...      下载文件
 *   DELETE /api/file-manager/entry                删除文件/文件夹
 *   PUT  /api/file-manager/rename                 重命名
 *   GET  /api/file-manager/init                   初始化部门根目录
 */
import { Router, Request, Response } from "express";
import multer from "multer";
import path from "node:path";
import crypto from "node:crypto";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import {
  listDirectory,
  createFolder,
  saveFile,
  deleteEntry,
  renameEntry,
  getAbsolutePath,
  initERPRootFolders,
} from "./fileManagerService";
import { DEPARTMENT_NAMES } from "./fileManagerConstants";
import { createContext } from "./_core/context";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
});

const KNOWLEDGE_ROOT = "/ERP/知识库";
const PREVIEW_TOKEN_TTL_MS = 10 * 60 * 1000;
const PREVIEW_TOKEN_SECRET =
  process.env.FILE_MANAGER_PREVIEW_SECRET ||
  process.env.SESSION_SECRET ||
  "file-manager-preview-secret";

function normalizeVirtualPath(value: unknown): string {
  let normalized = String(value || KNOWLEDGE_ROOT).trim().replace(/\\/g, "/");
  if (!normalized) normalized = KNOWLEDGE_ROOT;
  normalized = normalized.replace(/\/{2,}/g, "/");
  if (!normalized.startsWith("/")) normalized = `/${normalized}`;
  if (normalized.length > 1 && normalized.endsWith("/")) {
    normalized = normalized.slice(0, -1);
  }
  return normalized || KNOWLEDGE_ROOT;
}

function getPreviewSignature(virtualPath: string, expiresAt: number): string {
  return crypto
    .createHmac("sha256", PREVIEW_TOKEN_SECRET)
    .update(`${virtualPath}|${expiresAt}`)
    .digest("hex");
}

function resolvePreviewMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".pdf") return "application/pdf";
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".gif") return "image/gif";
  if (ext === ".webp") return "image/webp";
  if (ext === ".bmp") return "image/bmp";
  if (ext === ".svg") return "image/svg+xml";
  if (ext === ".glb") return "model/gltf-binary";
  if (ext === ".gltf") return "model/gltf+json";
  if (ext === ".stl") return "model/stl";
  if (ext === ".3mf") return "model/3mf";
  if (ext === ".txt" || ext === ".md" || ext === ".json" || ext === ".csv" || ext === ".obj" || ext === ".ply") {
    return "text/plain; charset=utf-8";
  }
  return "application/octet-stream";
}

function getRequestOrigin(req: Request): string {
  const forwardedProto = String(req.headers["x-forwarded-proto"] || "").split(",")[0].trim();
  const protocol = forwardedProto || req.protocol;
  const host = req.get("host") || "localhost";
  return `${protocol}://${host}`;
}

function parseDepartments(raw: unknown): string[] {
  return String(raw ?? "")
    .split(/[,\uFF0C;；/、|\s]+/)
    .map(part => part.trim())
    .filter(Boolean);
}

function sanitizePathSegment(value: unknown): string {
  return String(value ?? "")
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function resolveUserDataScope(user: any): "self" | "department" | "all" {
  if (String(user?.role ?? "") === "admin" || Boolean(user?.isCompanyAdmin)) {
    return "all";
  }
  const configured = String(user?.dataScope ?? "").trim();
  if (configured === "self" || configured === "department" || configured === "all") {
    return configured;
  }
  const position = String(user?.position ?? "").trim();
  if (position === "部门负责人" || position === "经理" || position === "总监") {
    return "department";
  }
  return "self";
}

function isDepartmentManager(user: any): boolean {
  return /负责人|经理|主管|总监/.test(String(user?.position ?? "").trim());
}

function isSameOrDescendant(candidatePath: string, referencePath: string): boolean {
  return candidatePath === referencePath || candidatePath.startsWith(`${referencePath}/`);
}

function isSameOrAncestor(candidatePath: string, referencePath: string): boolean {
  return candidatePath === referencePath || referencePath.startsWith(`${candidatePath}/`);
}

function resolveKnowledgeBaseAccess(user: any) {
  const scope = resolveUserDataScope(user);
  const departments = parseDepartments(user?.department);

  if (scope === "all") {
    return {
      scope,
      roots: [KNOWLEDGE_ROOT],
      homePath: KNOWLEDGE_ROOT,
    };
  }

  const roots = departments.map(department => `${KNOWLEDGE_ROOT}/${sanitizePathSegment(department)}`);

  return {
    scope,
    roots: roots.length > 0 ? roots : [`${KNOWLEDGE_ROOT}/管理部`],
    homePath: roots[0] || `${KNOWLEDGE_ROOT}/管理部`,
  };
}

function canListKnowledgePath(virtualPath: string, roots: string[]): boolean {
  if (roots.some(root => isSameOrDescendant(virtualPath, root))) return true;
  return roots.some(root => isSameOrAncestor(virtualPath, root));
}

function canMutateKnowledgePath(virtualPath: string, roots: string[]): boolean {
  return roots.some(root => isSameOrDescendant(virtualPath, root));
}

function canManageKnowledgePath(user: any, virtualPath: string, roots: string[]): boolean {
  if (String(user?.role ?? "") === "admin" || Boolean(user?.isCompanyAdmin)) {
    return canMutateKnowledgePath(virtualPath, roots);
  }
  if (!isDepartmentManager(user)) {
    return false;
  }
  return canMutateKnowledgePath(virtualPath, roots);
}

function filterVisibleItemsForKnowledge(
  virtualPath: string,
  items: Array<{ path: string }>,
  roots: string[]
) {
  return items.filter(item =>
    roots.some(root => isSameOrDescendant(item.path, root) || isSameOrAncestor(item.path, root))
  );
}

async function getKnowledgeBaseRequestContext(req: Request, res: Response) {
  const ctx = await createContext({ req, res } as any);
  if (!ctx.user) {
    res.status(401).json({ success: false, error: "未登录" });
    return null;
  }
  return {
    ctx,
    access: resolveKnowledgeBaseAccess(ctx.user),
  };
}

export function registerFileManagerRoutes(app: Router): void {
  const r = Router();

  // ── 列出目录 ──────────────────────────────────────────────
  r.get("/list", async (req: Request, res: Response) => {
    try {
      const requestContext = await getKnowledgeBaseRequestContext(req, res);
      if (!requestContext) return;

      const virtualPath = normalizeVirtualPath(req.query.path);
      if (!canListKnowledgePath(virtualPath, requestContext.access.roots)) {
        res.status(403).json({ success: false, error: "您无权查看该文件管理目录" });
        return;
      }

      const items = filterVisibleItemsForKnowledge(
        virtualPath,
        await listDirectory(virtualPath),
        requestContext.access.roots
      );
      res.json({ success: true, path: virtualPath, items });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ── 新建文件夹 ────────────────────────────────────────────
  r.post("/folder", async (req: Request, res: Response) => {
    try {
      const requestContext = await getKnowledgeBaseRequestContext(req, res);
      if (!requestContext) return;

      const { path: rawVirtualPath } = req.body as { path: string };
      const virtualPath = normalizeVirtualPath(rawVirtualPath);
      if (!virtualPath) {
        res.status(400).json({ success: false, error: "path 参数必填" });
        return;
      }
      if (!canMutateKnowledgePath(virtualPath, requestContext.access.roots)) {
        res.status(403).json({ success: false, error: "您无权在该文件管理目录创建文件夹" });
        return;
      }
      if (!canManageKnowledgePath(requestContext.ctx.user, virtualPath, requestContext.access.roots)) {
        res.status(403).json({ success: false, error: "仅管理员或部门管理员可创建文件夹" });
        return;
      }
      await createFolder(virtualPath);
      res.json({ success: true, path: virtualPath });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ── 上传文件 ──────────────────────────────────────────────
  r.post("/upload", upload.array("files"), async (req: Request, res: Response) => {
    try {
      const requestContext = await getKnowledgeBaseRequestContext(req, res);
      if (!requestContext) return;

      const virtualDir = normalizeVirtualPath(req.body.path);
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        res.status(400).json({ success: false, error: "未收到文件" });
        return;
      }
      if (!canMutateKnowledgePath(virtualDir, requestContext.access.roots)) {
        res.status(403).json({ success: false, error: "您无权上传到该文件管理目录" });
        return;
      }
      if (!canManageKnowledgePath(requestContext.ctx.user, virtualDir, requestContext.access.roots)) {
        res.status(403).json({ success: false, error: "仅管理员或部门管理员可上传文件" });
        return;
      }
      const saved: Array<{ name: string; path: string; size: number }> = [];
      for (const file of files) {
        const virtualFilePath = await saveFile(virtualDir, file.originalname, file.buffer);
        saved.push({ name: file.originalname, path: virtualFilePath, size: file.size });
      }
      res.json({ success: true, files: saved });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ── 生成预览链接 ───────────────────────────────────────────
  r.get("/preview-url", async (req: Request, res: Response) => {
    try {
      const requestContext = await getKnowledgeBaseRequestContext(req, res);
      if (!requestContext) return;

      const virtualPath = normalizeVirtualPath(req.query.path);
      if (!virtualPath) {
        res.status(400).json({ success: false, error: "path 参数必填" });
        return;
      }
      if (!canListKnowledgePath(virtualPath, requestContext.access.roots)) {
        res.status(403).json({ success: false, error: "您无权预览该文件" });
        return;
      }

      const expiresAt = Date.now() + PREVIEW_TOKEN_TTL_MS;
      const signature = getPreviewSignature(virtualPath, expiresAt);
      const previewPath =
        `/api/file-manager/public-view?path=${encodeURIComponent(virtualPath)}` +
        `&expires=${expiresAt}&signature=${signature}`;

      res.json({
        success: true,
        url: `${getRequestOrigin(req)}${previewPath}`,
        expiresAt,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ── 公共预览（签名）───────────────────────────────────────
  r.get("/public-view", async (req: Request, res: Response) => {
    try {
      const virtualPath = normalizeVirtualPath(req.query.path);
      const expiresAt = Number(req.query.expires || 0);
      const signature = String(req.query.signature || "");

      if (!virtualPath || !expiresAt || !signature) {
        res.status(400).json({ success: false, error: "预览参数不完整" });
        return;
      }
      if (!virtualPath.startsWith(KNOWLEDGE_ROOT)) {
        res.status(403).json({ success: false, error: "该文件不支持在线预览" });
        return;
      }
      if (Date.now() > expiresAt) {
        res.status(403).json({ success: false, error: "预览链接已过期" });
        return;
      }
      if (getPreviewSignature(virtualPath, expiresAt) !== signature) {
        res.status(403).json({ success: false, error: "预览签名无效" });
        return;
      }

      const absPath = getAbsolutePath(virtualPath);
      const fileStat = await stat(absPath);
      if (!fileStat.isFile()) {
        res.status(400).json({ success: false, error: "目标不是文件" });
        return;
      }

      const fileName = path.basename(absPath);
      res.setHeader("Content-Type", resolvePreviewMimeType(absPath));
      res.setHeader("Content-Disposition", `inline; filename*=UTF-8''${encodeURIComponent(fileName)}`);
      res.setHeader("Content-Length", fileStat.size);
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Cache-Control", "private, max-age=300");

      createReadStream(absPath).pipe(res);
    } catch (_err: any) {
      res.status(404).json({ success: false, error: "文件不存在" });
    }
  });

  // ── 下载文件 ──────────────────────────────────────────────
  r.get("/download", async (req: Request, res: Response) => {
    try {
      const requestContext = await getKnowledgeBaseRequestContext(req, res);
      if (!requestContext) return;

      const virtualPath = normalizeVirtualPath(req.query.path);
      if (!virtualPath) {
        res.status(400).json({ success: false, error: "path 参数必填" });
        return;
      }
      if (!canMutateKnowledgePath(virtualPath, requestContext.access.roots)) {
        res.status(403).json({ success: false, error: "您无权下载该文件" });
        return;
      }
      const absPath = getAbsolutePath(virtualPath);
      const fileStat = await stat(absPath);
      if (!fileStat.isFile()) {
        res.status(400).json({ success: false, error: "目标不是文件" });
        return;
      }
      const fileName = path.basename(absPath);
      res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`);
      res.setHeader("Content-Length", fileStat.size);
      const stream = createReadStream(absPath);
      stream.pipe(res);
    } catch (err: any) {
      res.status(404).json({ success: false, error: "文件不存在" });
    }
  });

  // ── 删除文件/文件夹 ───────────────────────────────────────
  r.delete("/entry", async (req: Request, res: Response) => {
    try {
      const requestContext = await getKnowledgeBaseRequestContext(req, res);
      if (!requestContext) return;

      const { path: rawVirtualPath } = req.body as { path: string };
      const virtualPath = normalizeVirtualPath(rawVirtualPath);
      if (!virtualPath) {
        res.status(400).json({ success: false, error: "path 参数必填" });
        return;
      }
      if (!canMutateKnowledgePath(virtualPath, requestContext.access.roots)) {
        res.status(403).json({ success: false, error: "您无权删除该文件" });
        return;
      }
      if (!canManageKnowledgePath(requestContext.ctx.user, virtualPath, requestContext.access.roots)) {
        res.status(403).json({ success: false, error: "仅管理员或部门管理员可删除文件" });
        return;
      }
      await deleteEntry(virtualPath);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ── 重命名 ────────────────────────────────────────────────
  r.put("/rename", async (req: Request, res: Response) => {
    try {
      const requestContext = await getKnowledgeBaseRequestContext(req, res);
      if (!requestContext) return;

      const {
        path: rawVirtualPath,
        newName,
      } = req.body as { path: string; newName: string };
      const virtualPath = normalizeVirtualPath(rawVirtualPath);
      if (!virtualPath || !newName) {
        res.status(400).json({ success: false, error: "path 和 newName 参数必填" });
        return;
      }
      if (!canMutateKnowledgePath(virtualPath, requestContext.access.roots)) {
        res.status(403).json({ success: false, error: "您无权重命名该文件" });
        return;
      }
      if (!canManageKnowledgePath(requestContext.ctx.user, virtualPath, requestContext.access.roots)) {
        res.status(403).json({ success: false, error: "仅管理员或部门管理员可重命名文件" });
        return;
      }
      const newPath = await renameEntry(virtualPath, newName);
      res.json({ success: true, path: newPath });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ── 初始化部门根目录 ──────────────────────────────────────
  r.get("/init", async (_req: Request, res: Response) => {
    try {
      await initERPRootFolders(DEPARTMENT_NAMES);
      await createFolder(KNOWLEDGE_ROOT);
      for (const department of DEPARTMENT_NAMES) {
        await createFolder(`${KNOWLEDGE_ROOT}/${department}`);
      }
      res.json({ success: true, departments: DEPARTMENT_NAMES });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.use("/api/file-manager", r);
}
