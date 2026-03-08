import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";

// 页面导入
import Dashboard from "./pages/Dashboard";
import WorkflowCenterPage from "./pages/workflow/Center";

// 管理部模块
import DocumentsPage from "./pages/admin/Documents";
import PersonnelPage from "./pages/admin/Personnel";
import TrainingPage from "./pages/admin/Training";
import AuditPage from "./pages/admin/Audit";
import ExpensePage from "./pages/admin/forms/Expense";
import OvertimePage from "./pages/admin/forms/Overtime";
import LeavePage from "./pages/admin/forms/Leave";
import OutingPage from "./pages/admin/forms/Outing";

// 招商部模块
import DealerPage from "./pages/investment/Dealer";
import PlatformPage from "./pages/investment/Platform";
import HospitalPage from "./pages/investment/Hospital";

// 销售部模块
import CustomersPage from "./pages/sales/Customers";
import SalesOrdersPage from "./pages/sales/Orders";
import CustomsPage from "./pages/sales/Customs";
import SalesReconciliationPage from "./pages/sales/Reconciliation";
import SalesFinanceCollaborationPage from "./pages/sales/FinanceCollaboration";

// 研发部模块
import ProductsPage from "./pages/rd/Products";
import ProjectsPage from "./pages/rd/Projects";

// 生产部模块
import ProductionOrdersPage from "./pages/production/Orders";
import UDIPage from "./pages/production/UDI";
import UDIArchivePage from "./pages/udi/UDIArchive";
import LabelDesignerPage from "./pages/udi/LabelDesigner";
import LabelPrintPage from "./pages/udi/LabelPrint";
import UDIReportPage from "./pages/udi/UDIReport";
import EquipmentPage from "./pages/production/Equipment";
import BOMPage from "./pages/production/BOM";
import MRPPage from "./pages/production/MRP";
import ProductionPlanBoardPage from "./pages/production/ProductionPlanBoard";
import MaterialRequisitionPage from "./pages/production/MaterialRequisition";
import ProductionRecordPage from "./pages/production/ProductionRecord";
import ProductionRoutingCardPage from "./pages/production/ProductionRoutingCard";
import SterilizationOrderPage from "./pages/production/SterilizationOrder";
import ProductionWarehouseEntryPage from "./pages/production/ProductionWarehouseEntry";
import EnvironmentPage from "./pages/production/Environment";
import ProcessPage from "./pages/production/Process";
import BatchRecordPage from "./pages/production/BatchRecord";

// 质量部模块
import LabPage from "./pages/quality/Lab";
import IQCPage from "./pages/quality/IQC";
import IPQCPage from "./pages/quality/IPQC";
import OQCPage from "./pages/quality/OQC";
import SamplesPage from "./pages/quality/Samples";
import IncidentsPage from "./pages/quality/Incidents";
import InspectionRequirementsPage from "./pages/quality/InspectionRequirements";

// 采购部模块
import SuppliersPage from "./pages/purchase/Suppliers";
import PurchaseOrdersPage from "./pages/purchase/Orders";
import PurchaseFinancePage from "./pages/purchase/Finance";
import PurchasePlanBoardPage from "./pages/purchase/PurchasePlanBoard";
import MaterialRequestsPage from "./pages/purchase/MaterialRequests";
import GoodsReceiptPage from "./pages/purchase/GoodsReceipt";

// 仓库管理模块
import InboundPage from "./pages/warehouse/Inbound";
import OutboundPage from "./pages/warehouse/Outbound";
import InventoryPage from "./pages/warehouse/Inventory";
import StocktakePage from "./pages/warehouse/Stocktake";
import WarehousesPage from "./pages/warehouse/Warehouses";

// 财务部模块
import LedgerPage from "./pages/finance/Ledger";
import InvoicePage from "./pages/finance/Invoice";
import ReimbursementPage from "./pages/finance/Reimbursement";
import ExpenseManagementPage from "./pages/finance/ExpenseManagement";
import ReceivablePage from "./pages/finance/Receivable";
import PayablePage from "./pages/finance/Payable";
import FinanceAccountsPage from "./pages/finance/Accounts";
import CostPage from "./pages/finance/Cost";
import ReportsPage from "./pages/finance/Reports";

// 邮件协同模块
import MailPage from "./pages/mail/MailPage";

// 获客情报模块
import ProspectPage from "./pages/prospect/ProspectPage";

// WhatsApp 工作台
import WhatsAppPage from "./pages/whatsapp/WhatsAppPage";

// 获客营销模块
import DomesticLeadsPage from "./pages/leads/DomesticLeadsPage";
import OverseasLeadsPage from "./pages/leads/OverseasLeadsPage";

// 网站管理模块
import WebsiteManagePage from "./pages/website/WebsiteManagePage";

// 系统设置模块
import DepartmentsPage from "./pages/settings/Departments";
import CompanyInfoPage from "./pages/settings/Company";
import CodesPage from "./pages/settings/Codes";
import UsersPage from "./pages/settings/Users";
import WorkflowSettingsPage from "./pages/settings/WorkflowSettings";
import LanguagePage from "./pages/settings/Language";
import OperationLogsPage from "./pages/settings/OperationLogs";
import RecycleBinPage from "./pages/settings/RecycleBin";
import EmailSettingsPage from "./pages/settings/EmailSettings";
import PrintTemplatesPage from "./pages/settings/PrintTemplates";
import LoginPage from "./pages/Login";

function Router() {
  return (
    <Switch>
      {/* 登录 */}
      <Route path="/login" component={LoginPage} />

      {/* 仪表盘 */}
      <Route path="/" component={Dashboard} />
      <Route path="/workflow/center" component={WorkflowCenterPage} />

      {/* 管理部 */}
      <Route path="/admin/documents" component={DocumentsPage} />
      <Route path="/admin/personnel" component={PersonnelPage} />
      <Route path="/admin/training" component={TrainingPage} />
      <Route path="/admin/audit" component={AuditPage} />
      <Route path="/admin/expense" component={ExpensePage} />
      <Route path="/admin/overtime" component={OvertimePage} />
      <Route path="/admin/leave" component={LeavePage} />
      <Route path="/admin/outing" component={OutingPage} />

      {/* 招商部 */}
      <Route path="/investment/dealer" component={DealerPage} />
      <Route path="/investment/platform" component={PlatformPage} />
      <Route path="/investment/hospital" component={HospitalPage} />

      {/* 销售部 */}
      <Route path="/sales/customers" component={CustomersPage} />
      <Route path="/sales/orders" component={SalesOrdersPage} />
      <Route path="/sales/customs" component={CustomsPage} />
      <Route path="/sales/reconciliation" component={SalesReconciliationPage} />
      <Route path="/sales/finance-collaboration" component={SalesFinanceCollaborationPage} />

      {/* 研发部 */}
      <Route path="/rd/products" component={ProductsPage} />
      <Route path="/rd/projects" component={ProjectsPage} />

      {/* 生产部 */}
      <Route path="/production/orders" component={ProductionOrdersPage} />
      <Route path="/production/plan-board" component={ProductionPlanBoardPage} />
      <Route path="/production/material-requisition" component={MaterialRequisitionPage} />
      <Route path="/production/records" component={ProductionRecordPage} />
      <Route path="/production/routing-cards" component={ProductionRoutingCardPage} />
      <Route path="/production/sterilization" component={SterilizationOrderPage} />
      <Route path="/production/warehouse-entry" component={ProductionWarehouseEntryPage} />
      <Route path="/production/bom" component={BOMPage} />
      <Route path="/production/mrp" component={MRPPage} />
      <Route path="/production/udi" component={UDIPage} />
      <Route path="/production/udi/archive" component={UDIArchivePage} />
      <Route path="/production/udi/designer" component={LabelDesignerPage} />
      <Route path="/production/udi/print" component={LabelPrintPage} />
      <Route path="/production/udi/report" component={UDIReportPage} />
      <Route path="/production/equipment" component={EquipmentPage} />
      <Route path="/production/environment" component={EnvironmentPage} />
      <Route path="/production/process" component={ProcessPage} />
      <Route path="/production/batch-records" component={BatchRecordPage} />

      {/* 质量部 */}
      <Route path="/quality/lab" component={LabPage} />
      <Route path="/quality/iqc" component={IQCPage} />
      <Route path="/quality/ipqc" component={IPQCPage} />
      <Route path="/quality/oqc" component={OQCPage} />
      <Route path="/quality/samples" component={SamplesPage} />
      <Route path="/quality/incidents" component={IncidentsPage} />
      <Route path="/quality/inspection-requirements" component={InspectionRequirementsPage} />

      {/* 采购部 */}
      <Route path="/purchase/suppliers" component={SuppliersPage} />
      <Route path="/purchase/orders" component={PurchaseOrdersPage} />
      <Route path="/purchase/finance" component={PurchaseFinancePage} />
      <Route path="/purchase/plan" component={PurchasePlanBoardPage} />
      <Route path="/purchase/requests" component={MaterialRequestsPage} />
      <Route path="/purchase/goods-receipt" component={GoodsReceiptPage} />

      {/* 仓库管理 */}
      <Route path="/warehouse/warehouses" component={WarehousesPage} />
      <Route path="/warehouse/inbound" component={InboundPage} />
      <Route path="/warehouse/outbound" component={OutboundPage} />
      <Route path="/warehouse/inventory" component={InventoryPage} />
      <Route path="/warehouse/stocktake" component={StocktakePage} />

      {/* 财务部 */}
      <Route path="/finance/ledger" component={LedgerPage} />
      <Route path="/finance/receivable" component={ReceivablePage} />
      <Route path="/finance/payable" component={PayablePage} />
      <Route path="/finance/accounts" component={FinanceAccountsPage} />
      <Route path="/finance/cost" component={CostPage} />
      <Route path="/finance/reports" component={ReportsPage} />
      <Route path="/finance/invoice" component={InvoicePage} />
      <Route path="/finance/reimbursement" component={ReimbursementPage} />
      <Route path="/finance/expense-management" component={ExpenseManagementPage} />

      {/* 邮件协同 */}
      <Route path="/mail" component={MailPage} />

      {/* 获客情报 */}
      <Route path="/prospect" component={ProspectPage} />

      {/* WhatsApp 工作台 */}
      <Route path="/whatsapp" component={WhatsAppPage} />

      {/* 获客营销 */}
      <Route path="/leads/domestic" component={DomesticLeadsPage} />
      <Route path="/leads/overseas" component={OverseasLeadsPage} />

      {/* 网站管理模块 */}
      <Route path="/website" component={WebsiteManagePage} />

      {/* 系统设置 */}
      <Route path="/settings/company" component={CompanyInfoPage} />
      <Route path="/settings/departments" component={DepartmentsPage} />
      <Route path="/settings/codes" component={CodesPage} />
      <Route path="/settings/users" component={UsersPage} />
      <Route path="/settings/workflows" component={WorkflowSettingsPage} />
      <Route path="/settings/language" component={LanguagePage} />
      <Route path="/settings/logs" component={OperationLogsPage} />
      <Route path="/settings/recycle-bin" component={RecycleBinPage} />
      <Route path="/settings/email" component={EmailSettingsPage} />
      <Route path="/settings/print-templates" component={PrintTemplatesPage} />

      {/* 404 */}
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
