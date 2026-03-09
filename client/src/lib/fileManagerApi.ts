/**
 * 文件管理 API 客户端
 * 对应后端 /api/file-manager/* 接口
 */

export type FileItem = {
  name: string;
  type: "folder" | "file";
  path: string;
  size?: number;
  modifiedAt?: string;
  mimeType?: string;
  ext?: string;
};

const BASE = "/api/file-manager";

/** 列出目录内容 */
export async function listDirectory(virtualPath: string): Promise<FileItem[]> {
  const res = await fetch(`${BASE}/list?path=${encodeURIComponent(virtualPath)}`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || "列目录失败");
  return data.items as FileItem[];
}

/** 新建文件夹 */
export async function createFolder(virtualPath: string): Promise<void> {
  const res = await fetch(`${BASE}/folder`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: virtualPath }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || "新建文件夹失败");
}

/** 上传文件 */
export async function uploadFiles(
  virtualDir: string,
  files: File[],
  onProgress?: (percent: number) => void
): Promise<void> {
  const formData = new FormData();
  formData.append("path", virtualDir);
  for (const file of files) {
    formData.append("files", file);
  }
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${BASE}/upload`);
    if (onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      };
    }
    xhr.onload = () => {
      const data = JSON.parse(xhr.responseText);
      if (data.success) resolve();
      else reject(new Error(data.error || "上传失败"));
    };
    xhr.onerror = () => reject(new Error("网络错误"));
    xhr.send(formData);
  });
}

/** 下载文件 */
export function downloadFile(virtualPath: string, fileName: string): void {
  const a = document.createElement("a");
  a.href = `${BASE}/download?path=${encodeURIComponent(virtualPath)}`;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/** 删除文件或文件夹 */
export async function deleteEntry(virtualPath: string): Promise<void> {
  const res = await fetch(`${BASE}/entry`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: virtualPath }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || "删除失败");
}

/** 重命名 */
export async function renameEntry(virtualPath: string, newName: string): Promise<string> {
  const res = await fetch(`${BASE}/rename`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: virtualPath, newName }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || "重命名失败");
  return data.path as string;
}

/** 初始化部门根目录 */
export async function initERPFolders(): Promise<void> {
  await fetch(`${BASE}/init`);
}

/** 格式化文件大小 */
export function formatFileSize(bytes?: number): string {
  if (bytes === undefined) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

/** 格式化时间 */
export function formatDateTime(iso?: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
