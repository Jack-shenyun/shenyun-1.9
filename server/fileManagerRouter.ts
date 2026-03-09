/**
 * 文件管理 REST 路由
 * 挂载于 /api/file-manager
 *
 * 接口列表：
 *   GET  /api/file-manager/list?path=...          列出目录
 *   POST /api/file-manager/folder                 新建文件夹
 *   POST /api/file-manager/upload                 上传文件（multipart/form-data）
 *   GET  /api/file-manager/download?path=...      下载文件
 *   DELETE /api/file-manager/entry                删除文件/文件夹
 *   PUT  /api/file-manager/rename                 重命名
 *   GET  /api/file-manager/init                   初始化部门根目录
 */
import { Router, Request, Response } from "express";
import multer from "multer";
import path from "node:path";
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

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
});

export function registerFileManagerRoutes(app: Router): void {
  const r = Router();

  // ── 列出目录 ──────────────────────────────────────────────
  r.get("/list", async (req: Request, res: Response) => {
    try {
      const virtualPath = String(req.query.path || "/ERP");
      const items = await listDirectory(virtualPath);
      res.json({ success: true, path: virtualPath, items });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ── 新建文件夹 ────────────────────────────────────────────
  r.post("/folder", async (req: Request, res: Response) => {
    try {
      const { path: virtualPath } = req.body as { path: string };
      if (!virtualPath) {
        res.status(400).json({ success: false, error: "path 参数必填" });
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
      const virtualDir = String(req.body.path || "/ERP");
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        res.status(400).json({ success: false, error: "未收到文件" });
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

  // ── 下载文件 ──────────────────────────────────────────────
  r.get("/download", async (req: Request, res: Response) => {
    try {
      const virtualPath = String(req.query.path || "");
      if (!virtualPath) {
        res.status(400).json({ success: false, error: "path 参数必填" });
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
      const { path: virtualPath } = req.body as { path: string };
      if (!virtualPath) {
        res.status(400).json({ success: false, error: "path 参数必填" });
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
      const { path: virtualPath, newName } = req.body as { path: string; newName: string };
      if (!virtualPath || !newName) {
        res.status(400).json({ success: false, error: "path 和 newName 参数必填" });
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
      res.json({ success: true, departments: DEPARTMENT_NAMES });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.use("/api/file-manager", r);
}
