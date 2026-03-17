import { ScrollText } from "lucide-react";
import DealerDocumentPage from "./DealerDocumentPage";

export default function AuthorizationPage() {
  return (
    <DealerDocumentPage
      mode="authorization"
      title="授权书管理"
      description="集中维护经销商授权书编号、授权区域和有效期"
      icon={ScrollText}
    />
  );
}
