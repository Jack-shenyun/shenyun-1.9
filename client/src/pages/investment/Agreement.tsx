import { FileCheck } from "lucide-react";
import DealerDocumentPage from "./DealerDocumentPage";

export default function AgreementPage() {
  return (
    <DealerDocumentPage
      mode="agreement"
      title="经销商协议"
      description="集中维护经销商协议编号、协议期限和当前状态"
      icon={FileCheck}
    />
  );
}
