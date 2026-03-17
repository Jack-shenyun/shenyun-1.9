import React, { useMemo, useRef, useState } from "react";
import { ATTACHMENT_ACCEPT } from "@shared/uploadPolicy";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, Camera, CheckCircle2, FileText } from "lucide-react";

type SelectedFile = {
  id: string;
  file: File;
};

function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function IQCMobileUploadPage() {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const inspectionNo = params.get("inspectionNo") || "";
  const productName = params.get("productName") || "";
  const token = params.get("token") || "";
  const [files, setFiles] = useState<SelectedFile[]>([]);
  const [uploaded, setUploaded] = useState<Array<{ fileName: string; filePath: string }>>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  const uploadMutation = trpc.iqcInspections.mobileUploadAttachments.useMutation();

  function appendFiles(fileList: FileList | null) {
    if (!fileList?.length) return;
    setFiles((prev) => [
      ...prev,
      ...Array.from(fileList).map((file, index) => ({
        id: `${Date.now()}-${index}-${file.name}`,
        file,
      })),
    ]);
  }

  async function handleUpload() {
    if (!inspectionNo || !token) return;
    if (files.length === 0) return;
    const payload = await Promise.all(
      files.map(async (item) => ({
        name: item.file.name,
        mimeType: item.file.type,
        base64: await toBase64(item.file),
      })),
    );
    const result = await uploadMutation.mutateAsync({
      inspectionNo,
      productName,
      token,
      files: payload,
    });
    setUploaded((prev) => [...prev, ...(result as Array<{ fileName: string; filePath: string }>)]);
    setFiles([]);
  }

  if (!inspectionNo || !token) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-10">
        <div className="mx-auto max-w-md">
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              上传二维码无效，请回到 ERP 重新生成。
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6">
      <div className="mx-auto max-w-md space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">来料检验附件上传</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border bg-muted/10 p-3 text-sm">
              <div><span className="text-muted-foreground">检验单号：</span>{inspectionNo}</div>
              <div className="mt-1 break-words"><span className="text-muted-foreground">产品名称：</span>{productName || "-"}</div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              multiple
              accept={ATTACHMENT_ACCEPT}
              onChange={(e) => {
                appendFiles(e.target.files);
                e.currentTarget.value = "";
              }}
            />
            <input
              ref={cameraInputRef}
              type="file"
              className="hidden"
              multiple
              accept="image/*"
              capture="environment"
              onChange={(e) => {
                appendFiles(e.target.files);
                e.currentTarget.value = "";
              }}
            />

            <div className="grid grid-cols-2 gap-3">
              <Button type="button" variant="outline" className="h-11" onClick={() => fileInputRef.current?.click()}>
                <Upload className="mr-2 h-4 w-4" />选择文件
              </Button>
              <Button type="button" variant="outline" className="h-11" onClick={() => cameraInputRef.current?.click()}>
                <Camera className="mr-2 h-4 w-4" />拍照上传
              </Button>
            </div>

            {files.length > 0 && (
              <div className="space-y-2 rounded-lg border p-3">
                {files.map((item) => (
                  <div key={item.id} className="flex items-center gap-2 text-sm">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="truncate">{item.file.name}</span>
                  </div>
                ))}
              </div>
            )}

            <Button
              type="button"
              className="h-11 w-full"
              onClick={handleUpload}
              disabled={uploadMutation.isPending || files.length === 0}
            >
              {uploadMutation.isPending ? "上传中..." : "上传到检验单"}
            </Button>

            {uploaded.length > 0 && (
              <div className="space-y-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                {uploaded.map((item, index) => (
                  <div key={`${item.filePath}-${index}`} className="flex items-center gap-2 text-sm text-emerald-700">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="truncate">{item.fileName}</span>
                  </div>
                ))}
                <div className="pt-1 text-xs text-emerald-700">上传成功，回到 ERP 页面即可看到附件。</div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
