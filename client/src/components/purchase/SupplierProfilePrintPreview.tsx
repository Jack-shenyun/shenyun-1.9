import React from "react";
import { PrintTemplate } from "@/components/PrintTemplate";
import { formatDateValue, formatDisplayNumber } from "@/lib/formatters";
import {
  getAnnualEvaluationAverage,
  getAnnualEvaluationItemTotal,
  type SupplierAnnualEvaluationFormData,
  type SupplierOptionLite,
  type SupplierProfileRecord,
  type SupplierQualityAgreementFormData,
  type SupplierSurveyFormData,
  SUPPLIER_PROFILE_FORM_LABELS,
} from "@/lib/supplierProfile";

interface SupplierProfilePrintPreviewProps {
  open: boolean;
  onClose: () => void;
  record: SupplierProfileRecord | null;
  supplier?: SupplierOptionLite | null;
}

function cnCell(content: React.ReactNode, className = "") {
  return (
    <td className={`border border-slate-900 px-2 py-1 align-top ${className}`}>
      {content}
    </td>
  );
}

function labelCell(label: string, className = "") {
  return (
    <td
      className={`border border-slate-900 bg-slate-50 px-2 py-1 font-medium ${className}`}
    >
      {label}
    </td>
  );
}

function renderSurvey(record: SupplierProfileRecord) {
  const formData = record.formData as SupplierSurveyFormData;
  return (
    <div className="space-y-3 text-[12px] leading-6 text-slate-900">
      <div className="text-center">
        <h1 className="text-[22px] font-semibold tracking-[6px]">供应商调查表</h1>
        <div className="mt-2 flex justify-between text-[12px]">
          <span>编号：QT/QP12-01</span>
          <span>序号：{record.serialNo || ""}</span>
        </div>
      </div>

      <table className="w-full border-collapse">
        <tbody>
          <tr>
            {labelCell("供应商名称", "w-[14%]")}
            {cnCell(record.supplierName, "w-[36%]")}
            {labelCell("物料名称", "w-[14%]")}
            {cnCell(formData.materialName, "w-[36%]")}
          </tr>
          <tr>
            {labelCell("物料类别")}
            {cnCell(formData.materialCategory)}
            {labelCell("物料编号")}
            {cnCell(formData.materialCode)}
          </tr>
          <tr>
            {labelCell("联 系 人")}
            {cnCell(formData.contactPerson)}
            {labelCell("职 位")}
            {cnCell(formData.position)}
          </tr>
          <tr>
            {labelCell("电 话")}
            {cnCell(formData.phone)}
            {labelCell("E-mail")}
            {cnCell(formData.email)}
          </tr>
          <tr>
            {labelCell("传 真")}
            {cnCell(formData.fax)}
            {labelCell("业务联络地址")}
            {cnCell(formData.businessAddress)}
          </tr>
          <tr>
            {labelCell("业务电话")}
            {cnCell(formData.businessPhone)}
            {labelCell("工厂地址")}
            {cnCell(formData.factoryAddress)}
          </tr>
          <tr>
            {labelCell("工厂电话")}
            {cnCell(formData.factoryPhone)}
            {labelCell("单位负责人")}
            {cnCell(formData.principal)}
          </tr>
          <tr>
            {labelCell("厂房面积")}
            {cnCell(formData.plantArea)}
            {labelCell("员工总人数")}
            {cnCell(formData.employeeCount)}
          </tr>
          <tr>
            {labelCell("注册资本")}
            {cnCell(formData.registeredCapital)}
            {labelCell("年 产 量")}
            {cnCell(formData.annualCapacity)}
          </tr>
          <tr>
            {labelCell("主管部门")}
            {cnCell(formData.supervisingDepartment)}
            {labelCell("企业性质")}
            {cnCell(
              <>
                <span className="mr-3">
                  {formData.enterpriseNature === "manufacturer" ? "■" : "□"} 制造商
                </span>
                <span className="mr-3">
                  {formData.enterpriseNature === "agent" ? "■" : "□"} 代理商
                </span>
                <span>
                  {formData.enterpriseNature === "service" ? "■" : "□"} 服务
                </span>
              </>
            )}
          </tr>
          <tr>
            {labelCell("经营资质")}
            {cnCell(formData.businessQualification, "whitespace-pre-wrap")}
            {labelCell("经营范围")}
            {cnCell(formData.businessScope, "whitespace-pre-wrap")}
          </tr>
          <tr>
            {labelCell("品质负责人")}
            {cnCell(formData.qualityResponsible)}
            {labelCell("职位")}
            {cnCell(formData.qualityPosition)}
          </tr>
          <tr>
            {labelCell("电话")}
            {cnCell(formData.qualityPhone)}
            {labelCell("E-mail")}
            {cnCell(formData.qualityEmail)}
          </tr>
          <tr>
            {labelCell("传真")}
            {cnCell(formData.qualityFax)}
            {labelCell("主要检测设备")}
            {cnCell(formData.mainTestingEquipment, "whitespace-pre-wrap")}
          </tr>
          <tr>
            {labelCell("产品符合之标准")}
            {cnCell(formData.productStandards, "whitespace-pre-wrap",)}
            {labelCell("体系认证/注册")}
            {cnCell(formData.qualitySystemCertification, "whitespace-pre-wrap")}
          </tr>
          <tr>
            {labelCell("备注")}
            {cnCell(formData.remarks, "whitespace-pre-wrap",)}
            {labelCell("填表人")}
            {cnCell(formData.filledBy)}
          </tr>
          <tr>
            {labelCell("日期")}
            {cnCell(formatDateValue(formData.filledDate))}
            {labelCell("版本")}
            {cnCell("V1.0")}
          </tr>
        </tbody>
      </table>

      <div className="pt-4 text-center text-[11px]">苏州神韵医疗器械有限公司</div>
    </div>
  );
}

function renderAnnualEvaluation(record: SupplierProfileRecord) {
  const formData = record.formData as SupplierAnnualEvaluationFormData;
  const average = getAnnualEvaluationAverage(formData);
  return (
    <div className="space-y-3 text-[12px] leading-6 text-slate-900">
      <div className="text-center">
        <h1 className="text-[22px] font-semibold tracking-[4px]">供应商年度评价表</h1>
        <div className="mt-2 flex justify-between text-[12px]">
          <span>编号：QT/QP12-06</span>
          <span>序号：{record.serialNo || ""}</span>
        </div>
      </div>

      <table className="w-full border-collapse">
        <tbody>
          <tr>
            {labelCell("供应商名称", "w-[14%]")}
            {cnCell(record.supplierName, "w-[36%]")}
            {labelCell("年度", "w-[14%]")}
            {cnCell(record.yearLabel || "", "w-[36%]")}
          </tr>
        </tbody>
      </table>

      <table className="w-full border-collapse text-[11px]">
        <thead>
          <tr>
            {[
              "日期",
              "物料名称",
              "物料类别",
              "单位",
              "应交数量",
              "实交数量",
              "质量评估",
              "交货评估",
              "价格评估",
              "服务评估",
              "综合评分",
            ].map(header => (
              <th
                key={header}
                className="border border-slate-900 bg-slate-50 px-1.5 py-1 font-medium"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {formData.items.length === 0 ? (
            <tr>
              <td colSpan={11} className="border border-slate-900 py-6 text-center">
                暂无评价记录
              </td>
            </tr>
          ) : (
            formData.items.map(item => (
              <tr key={item.id}>
                {cnCell(formatDateValue(item.date), "text-center")}
                {cnCell(item.materialName)}
                {cnCell(item.materialCategory)}
                {cnCell(item.unit, "text-center")}
                {cnCell(item.shouldQty, "text-right")}
                {cnCell(item.actualQty, "text-right")}
                {cnCell(item.qualityScore, "text-right")}
                {cnCell(item.deliveryScore, "text-right")}
                {cnCell(item.priceScore, "text-right")}
                {cnCell(item.serviceScore, "text-right")}
                {cnCell(String(getAnnualEvaluationItemTotal(item)), "text-right font-semibold")}
              </tr>
            ))
          )}
          <tr>
            {labelCell("综合平均分数", "text-right")}
            <td colSpan={10} className="border border-slate-900 px-2 py-1 font-semibold">
              {formatDisplayNumber(average)}
            </td>
          </tr>
          <tr>
            {labelCell("备注", "text-right")}
            <td colSpan={10} className="border border-slate-900 px-2 py-1 whitespace-pre-wrap">
              {formData.remarks || "-"}
            </td>
          </tr>
        </tbody>
      </table>

      <div className="space-y-1.5 text-[11px]">
        <div className="font-medium">评分标准：</div>
        <div>1.质量评估：30×合格率（合格数量/总数量×100%）</div>
        <div>2.交货评估：30×交付准时率（交付准时率/需求数量×100%）</div>
        <div>3.价格评估：20×合理性（价格优：90%-100%；市场价：70%-90%；高于市场价：＜70%）</div>
        <div>4.服务评估：20×服务水平（配合态度和改善及时：90%-100%；服务配合度一般：60%-90%；拖延经常失误＜60%）</div>
        <div>综合评分=质量评估得分+交货评估得分+价格得分+服务得分</div>
      </div>

      <table className="w-full border-collapse text-[11px]">
        <tbody>
          <tr>
            {labelCell("评价结果", "w-[14%]")}
            <td className="border border-slate-900 px-2 py-1">
              <span className="mr-4">
                {formData.result === "qualified" ? "■" : "□"} 合格（&gt;85分）
              </span>
              <span className="mr-4">
                {formData.result === "rectify" ? "■" : "□"} 整改（85～65分）
              </span>
              <span>{formData.result === "cancel" ? "■" : "□"} 撤消（&lt;65分）</span>
            </td>
          </tr>
          <tr>
            {labelCell("评价意见")}
            <td className="border border-slate-900 px-2 py-3 whitespace-pre-wrap">
              {formData.resultOpinion || "-"}
            </td>
          </tr>
          <tr>
            {labelCell("编制")}
            {cnCell(formData.preparedBy)}
            {labelCell("审核")}
            {cnCell(formData.reviewedBy)}
          </tr>
        </tbody>
      </table>

      <div className="pt-4 text-center text-[11px]">苏州神韵医疗器械有限公司 版本：V1.0</div>
    </div>
  );
}

function renderQualityAgreement(record: SupplierProfileRecord, supplier?: SupplierOptionLite | null) {
  const formData = record.formData as SupplierQualityAgreementFormData;
  return (
    <div className="space-y-3 text-[12px] leading-6 text-slate-900">
      <div className="text-center">
        <h1 className="text-[22px] font-semibold tracking-[4px]">质量保证协议</h1>
        <div className="mt-2 flex justify-between text-[12px]">
          <span>编号：QT/QP12-13</span>
          <span>序号：{record.serialNo || ""}</span>
        </div>
      </div>

      <div className="space-y-1.5">
        <div>甲方（需方）：苏州神韵医疗器械有限公司</div>
        <div>
          乙方（供方）：{record.supplierName}
          <span className="ml-10">签订时间：{formatDateValue(formData.signDate)}</span>
        </div>
      </div>

      <div className="space-y-2 text-justify">
        <p><span className="font-semibold">一、目的：</span>为明确本公司（以下简称甲方）对供应商的质量要求，并为供应商（以下简称乙方）的产品不合格时，作为处理和索赔的依据。</p>
        <div>
          <div className="font-semibold">二、质量要求：</div>
          <p>1、乙方为甲方提供的产品，其性能必须符合甲方的《原材料技术标准》或甲方提供的相关要求；</p>
          <p>2、乙方每次供货时，必须提供产品的合格检验报告或可证明产品合格的相关资料，并应附有标识可追溯性的相关信息，在出厂检验报告和送货单上体现该批物料的合同编号。</p>
          <p>3、乙方的产品包装必须满足甲方要求；</p>
          <p>4、当甲方有需要到乙方进行验证时，乙方应给予安排并配合验证工作；</p>
          <p>5、乙方必须保证及时供货的能力。</p>
        </div>
        <div>
          <div className="font-semibold">三、质量问题的处理：</div>
          <p>1、乙方接到甲方通报供货品质异常时，应能迅速应对，并满足甲方的筛选、更换等要求；</p>
          <p>2、甲方对乙方的供货验收不合格时，应及时通知乙方，乙方应在接到通知后两个工作日内对品质异常进行调查、分析、处理，并以书面的形式通知甲方；</p>
          <p>3、对于在甲方验收检查及后续生产直至最终用户处发现的不合格品，甲方有权从乙方的货款中扣除不合格品造成的损失，如果是预付款，甲方有权要求还款；</p>
          <p>4、甲方保管不合格品期间，由可归责于乙方的事导致不合格品的全部或部分损失、损坏或变质时，该损失由乙方承担；</p>
          <p>5、乙方应确保所供物品不会因其不良给甲方的生产活动造成困扰，由于乙方的原因造成的甲方生产的产品或相关的设备发生不良或损坏以及停产造成甲方不能及时完成客户订单时，乙方应赔偿所产生的全部实际损失；</p>
          <p>6、因乙方不能及时交付合格产品而造成甲方停线，乙方须按每条线每小时2000元的标准计算赔偿甲方；</p>
          <p>7、乙方提交的物料连续三次以上（含三次）发生品质问题，甲方有权对乙方进行经济处罚，按购货数量价值的2%罚款；乙方不得故意将不合格物品提交给甲方，如有此行为发生，发现一次甲方将至少处以罚款壹万元；</p>
          <p>8、如因乙方提供的物品造成甲方的产品发生质量问题，从而被第三方索赔时，经甲乙双方协商或技术监督部门或其它权威机构鉴定认定是乙方的责任时，乙方应承担相应的法律责任，并承担甲方乃至第三方相应的经济损失。</p>
          <p>9、乙方需每年一次无偿向甲方提供验证所需要的材料约300pcs，具体按甲方需求进行。</p>
        </div>
        <div>
          <div className="font-semibold">四、四级变更处理：</div>
          <p>1、一级变更：乙方供货给甲方的原材料如需停止生产，乙方必须提前6个月时间以书面形式通知甲方；</p>
          <p>2、二级变更：乙方生产厂址变更、设计变更、模具修改、关键工艺变化，必须提前3个月时间以书面形式通知，突发批量性质量事故，必须在2个工作日内以书面形式通知甲方；</p>
          <p>3、乙方流水线变更调整，标签变更、型号料码变更，必须提前2个月时间以书面形式通知甲方；</p>
          <p>4、四级变更：乙方质量或技术负责人，负责甲方业务人员变更、主要设备更换，必须提前1个月以书面形式通知甲方。</p>
        </div>
        <p><span className="font-semibold">五、异常联络：</span>订货物品由于一定的协议或合同例如质量特性、期限、发货数量等明显地不可能做到，设计或制造工程不合格，预想或已发生了与质量要求不符或其它质量异常时，乙方应立即与甲方书面联络，且由乙方立即调查产生的原因及纠正预防措施对策，报甲方认可后实施。</p>
        <p><span className="font-semibold">六、保密：</span>乙方应严格保守本质量协议及本公司提供的任何技术指标，履行过程中知晓的甲方任何商业秘密，在本协议有效期届满后，也不得向任何第三者泄露上述秘密。甲乙双方终止供货合同后15日内，乙方有责任和义务全部返还甲方订货物品相关的图纸等技术资料原件。逾期不还，视同乙方私自泄露；乙方有责任对本质量协议保守秘密，如将甲方资料泄露，甲方将通过法律手段追究乙方的泄露责任。</p>
        <p>附：此质量协议作为合同编号为：{formData.contractNo || "____"} 的合同附件。本协议一式二份，甲方与乙方各执一份，自协议签订之日起开始生效，有效期伍年。</p>
      </div>

      <table className="w-full border-collapse text-[11px]">
        <tbody>
          <tr>
            {labelCell("供需方", "w-[12%]")}
            {labelCell("甲方（需方）", "w-[38%]")}
            {labelCell("乙方（供方）", "w-[38%]")}
          </tr>
          <tr>
            {labelCell("单位名称（章）")}
            {cnCell("苏州神韵医疗器械有限公司")}
            {cnCell(formData.supplierStampName || record.supplierName)}
          </tr>
          <tr>
            {labelCell("单位地址")}
            {cnCell("苏州市吴中区临湖镇银藏路666号")}
            {cnCell(formData.supplierAddress || supplier?.address || "-")}
          </tr>
          <tr>
            {labelCell("法定代表人")}
            {cnCell("马双双")}
            {cnCell(formData.supplierLegalRepresentative || "-")}
          </tr>
          <tr>
            {labelCell("联 系 人")}
            {cnCell("刘源")}
            {cnCell(formData.supplierContact || supplier?.contactPerson || "-")}
          </tr>
          <tr>
            {labelCell("电 话")}
            {cnCell("15150457575")}
            {cnCell(formData.supplierPhone || supplier?.phone || "-")}
          </tr>
        </tbody>
      </table>

      <div className="pt-4 text-center text-[11px]">苏州神韵医疗器械有限公司 版本：V1.0</div>
    </div>
  );
}

export default function SupplierProfilePrintPreview({
  open,
  onClose,
  record,
  supplier,
}: SupplierProfilePrintPreviewProps) {
  if (!record) return null;
  return (
    <PrintTemplate
      open={open}
      onClose={onClose}
      title={`${SUPPLIER_PROFILE_FORM_LABELS[record.formType]}打印预览`}
      paperSize="A4"
      marginTop={18}
      marginRight={18}
      marginBottom={18}
      marginLeft={18}
    >
      {record.formType === "survey"
        ? renderSurvey(record)
        : record.formType === "annual_evaluation"
          ? renderAnnualEvaluation(record)
          : renderQualityAgreement(record, supplier)}
    </PrintTemplate>
  );
}
