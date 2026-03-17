import { promises as fs } from "node:fs";
import { randomBytes } from "node:crypto";
import path from "node:path";
import { ENV } from "./_core/env";
import { storagePut } from "./storage";
import { saveFile } from "./fileManagerService";
import { buildUploadFolderName, normalizeDepartmentForUpload } from "@shared/uploadPolicy";

function safeFileSegment(value: string): string {
  return String(value ?? "")
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizePathSegments(value: string): string[] {
  return String(value ?? "")
    .split(/[\\/]+/)
    .map(safeFileSegment)
    .filter(Boolean);
}

function getExtByMimeType(mimeType: string): string {
  const mime = String(mimeType || "").toLowerCase();
  if (mime.includes("pdf")) return ".pdf";
  if (mime.includes("word")) return ".docx";
  if (mime.includes("excel")) return ".xlsx";
  if (mime.includes("powerpoint")) return ".pptx";
  if (mime.includes("image/")) return ".png";
  if (mime.includes("text/")) return ".txt";
  return "";
}

function normalizeFileBaseName(value: string): string {
  const compact = safeFileSegment(value || "F")
    .replace(/\s+/g, "-")
    .replace(/_+/g, "-")
    .replace(/(?:^|[-_])\d{10,14}(?=$|[-_])/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
  const clipped = Array.from(compact || "F").slice(0, 24).join("");
  return clipped || "F";
}

function buildStoredFileName(baseName: string, ext: string): string {
  const suffix = randomBytes(3).toString("hex");
  return `${normalizeFileBaseName(baseName)}-${suffix}${ext}`;
}

export type SaveAttachmentInput = {
  department: string;
  businessFolder: string;
  originalName: string;
  desiredBaseName: string;
  mimeType?: string;
  buffer: Buffer;
  saveToFileManager?: boolean;
};

export type SavedAttachment = {
  provider: "local" | "forge";
  filePath: string;
  storageKey: string;
  fileName: string;
  fileManagerPath?: string;
};

export function buildKnowledgeBaseVirtualDir(
  department: string,
  businessFolder: string
): string {
  const departmentName = normalizeDepartmentForUpload(department, "管理部");
  const [rawDepartment, rawBusinessFolder] = buildUploadFolderName(
    departmentName,
    businessFolder
  );
  const departmentSegment = safeFileSegment(rawDepartment);
  const businessFolderSegments = normalizePathSegments(rawBusinessFolder);
  return `/ERP/知识库/${[departmentSegment, ...businessFolderSegments].join("/")}`;
}

export async function saveAttachmentFile(input: SaveAttachmentInput): Promise<SavedAttachment> {
  const departmentName = normalizeDepartmentForUpload(input.department, "销售部");
  const [rawDepartment, rawBusinessFolder] = buildUploadFolderName(departmentName, input.businessFolder);
  const department = safeFileSegment(rawDepartment);
  const businessFolderSegments = normalizePathSegments(rawBusinessFolder);
  const businessFolderPath = businessFolderSegments.join("/");
  const extFromName = path.extname(input.originalName || "").toLowerCase();
  const ext = extFromName || getExtByMimeType(String(input.mimeType || ""));
  const baseName = input.desiredBaseName || "附件";
  const uniqueName = buildStoredFileName(baseName, ext);
  const relativeKey = ["uploads", department, ...businessFolderSegments, uniqueName].join("/");
  const driver = String(ENV.fileStorageDriver || "local").toLowerCase();
  const maybeSaveToFileManager = async () => {
    if (!input.saveToFileManager) return undefined;
    const virtualDir = buildKnowledgeBaseVirtualDir(rawDepartment, rawBusinessFolder);
    return await saveFile(virtualDir, uniqueName, input.buffer);
  };

  if (driver === "forge") {
    const uploaded = await storagePut(relativeKey, input.buffer, input.mimeType || "application/octet-stream");
    const fileManagerPath = await maybeSaveToFileManager();
    return {
      provider: "forge",
      filePath: uploaded.url,
      storageKey: uploaded.key,
      fileName: uniqueName,
      fileManagerPath,
    };
  }

  const root = ENV.fileStorageRoot
    ? path.resolve(ENV.fileStorageRoot)
    : path.resolve(process.cwd(), "uploads");
  const absDir = path.resolve(root, department, businessFolderPath);
  await fs.mkdir(absDir, { recursive: true });
  const absPath = path.resolve(absDir, uniqueName);
  await fs.writeFile(absPath, input.buffer);
  const webPath = `/uploads/${[department, ...businessFolderSegments, uniqueName].join("/")}`;
  const fileManagerPath = await maybeSaveToFileManager();
  return {
    provider: "local",
    filePath: webPath,
    storageKey: relativeKey,
    fileName: uniqueName,
    fileManagerPath,
  };
}
