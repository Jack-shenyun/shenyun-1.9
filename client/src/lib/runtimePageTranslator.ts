const TERM_PAIRS: Array<[string, string]> = [
  ["语言设置", "Language"],
  ["系统设置", "System"],
  ["保存设置", "Save"],
  ["恢复默认", "Reset"],
  ["自动检测浏览器语言", "Auto Detect Browser Lang."],
  ["系统语言", "UI Lang."],
  ["时区设置", "Time Zone"],
  ["日期时间格式", "Date & Time"],
  ["货币设置", "Currency"],
  ["格式预览", "Preview"],
  ["当前生效语言", "Active Lang."],
  ["配置系统语言和区域格式", "Set UI language and locale"],
  ["设备点检", "Eq. Insp."],
  ["设备保养", "Eq. Maint."],
  ["设备运行", "Eq. Run"],
  ["设备管理", "Equipment"],
  ["记录管理", "Records"],
  ["生产记录", "Prod. Rec."],
  ["环境记录", "Env. Rec."],
  ["清场记录", "Line Clearance"],
  ["清洗记录", "Cleaning Rec."],
  ["消毒记录", "Disinfection Rec."],
  ["生产记录单", "Prod. Record"],
  ["设备使用记录", "Eq. Use Rec."],
  ["设备记录", "Eq. Rec."],
  ["日期示例", "Date"],
  ["时间示例", "Time"],
  ["金额示例", "Amount"],
  ["当前时区", "Time Zone"],
  ["新增", "Add"],
  ["编辑", "Edit"],
  ["删除", "Del"],
  ["查看", "View"],
  ["查看详情", "Details"],
  ["关闭", "Close"],
  ["取消", "Cancel"],
  ["确认", "Confirm"],
  ["保存", "Save"],
  ["搜索", "Search"],
  ["全部", "All"],
  ["全部状态", "All Status"],
  ["全部结果", "All Results"],
  ["状态", "Status"],
  ["类型", "Type"],
  ["结果", "Result"],
  ["日期", "Date"],
  ["时间", "Time"],
  ["编号", "No."],
  ["单号", "No."],
  ["名称", "Name"],
  ["描述", "Desc."],
  ["内容", "Content"],
  ["说明", "Desc."],
  ["备注", "Note"],
  ["计划", "Plan"],
  ["实际", "Actual"],
  ["总数", "Total"],
  ["记录人", "Recorder"],
  ["执行人", "Executor"],
  ["负责人", "Owner"],
  ["复核人", "Reviewer"],
  ["责任人", "Resp."],
  ["部门", "Dept."],
  ["位置", "Location"],
  ["设备编号", "Eq. No."],
  ["设备名称", "Eq. Name"],
  ["设备型号", "Eq. Model"],
  ["型号规格", "Model"],
  ["使用部门", "Dept."],
  ["安装位置", "Location"],
  ["记录编号", "Rec. No."],
  ["记录类型", "Rec. Type"],
  ["记录日期", "Rec. Date"],
  ["记录时间", "Rec. Time"],
  ["关联指令", "Order Ref."],
  ["关联生产指令", "Prod. Order"],
  ["产品信息", "Product"],
  ["工序信息", "Process"],
  ["记录内容", "Content"],
  ["基本信息", "Basic Info"],
  ["数量信息", "Qty Info"],
  ["记录明细", "Detail"],
  ["异常与纠正", "Deviation & Action"],
  ["异常描述", "Deviation"],
  ["纠正措施", "Action"],
  ["点检明细", "Inspection Detail"],
  ["保养明细", "Maintenance Detail"],
  ["设备使用", "Eq. Use"],
  ["点检日期", "Insp. Date"],
  ["点检类型", "Insp. Type"],
  ["点检结果", "Insp. Result"],
  ["点检人", "Inspector"],
  ["点检项目", "Inspection Item"],
  ["点检标准", "Inspection Std."],
  ["点检方法", "Inspection Method"],
  ["处理要求", "Action Req."],
  ["日点检", "Daily Insp."],
  ["班次点检", "Shift Insp."],
  ["周点检", "Weekly Insp."],
  ["月点检", "Monthly Insp."],
  ["专项点检", "Special Insp."],
  ["保养日期", "Maint. Date"],
  ["保养类型", "Maint. Type"],
  ["保养结果", "Maint. Result"],
  ["保养项目", "Maint. Item"],
  ["保养内容", "Maint. Content"],
  ["保养周期", "Maint. Cycle"],
  ["保养要求", "Maint. Req."],
  ["点检要求", "Insp. Req."],
  ["下次保养", "Next Maint."],
  ["保修截止", "Warranty End"],
  ["日常保养", "Routine Maint."],
  ["周期保养", "Periodic Maint."],
  ["年度保养", "Annual Maint."],
  ["专项保养", "Special Maint."],
  ["温度", "Temp."],
  ["湿度", "RH"],
  ["温度范围", "Temp. Range"],
  ["湿度范围", "RH Range"],
  ["车间", "Workshop"],
  ["区域", "Area"],
  ["车间/区域", "Workshop/Area"],
  ["生产批号", "Batch No."],
  ["产品名称", "Product Name"],
  ["工序", "Process"],
  ["今日记录", "Today"],
  ["正常记录", "Normal"],
  ["异常记录", "Abnormal"],
  ["进行中", "In Prog."],
  ["已完成", "Done"],
  ["草稿", "Draft"],
  ["计划中", "Planned"],
  ["待确认", "Pending"],
  ["通过", "Pass"],
  ["需维修", "Repair Req."],
  ["停机", "Shutdown"],
  ["正常", "OK"],
  ["异常", "Abn."],
  ["合格", "Pass"],
  ["不合格", "Fail"],
  ["已完成", "Done"],
  ["已确认", "Confirmed"],
  ["未开始", "Not Started"],
  ["操作", "Action"],
  ["医疗器械", "Med. Device"],
  ["灭菌", "Sterilization"],
  ["消毒", "Disinfection"],
  ["清洗", "Cleaning"],
  ["验证", "Verification"],
  ["确认", "Validation"],
  ["校准", "Calibration"],
  ["自测报告", "Self-Inspection Report"],
  ["设计验证报告", "Design Verification Report"],
  ["设计确认报告", "Design Validation Report"],
  ["上市评估表", "Launch Assessment"],
  ["试制任务单", "Pilot Task Order"],
  ["生产日期", "MFG Date"],
  ["有效期", "Exp. Date"],
  ["批号", "Lot No."],
  ["版本", "Ver."],
  ["页码", "Page"],
  ["审核", "Reviewed By"],
  ["批准", "Approved By"],
  ["检验员", "Inspector"],
  ["数量", "Qty"],
  ["单位", "Unit"],
  ["单价", "U/P"],
  ["总价", "Total"],
  ["金额", "Amount"],
  ["币种", "Curr."],
  ["客户", "Customer"],
  ["供应商", "Supplier"],
];

const DICT = new Map(TERM_PAIRS);
const SORTED_TERMS = [...DICT.keys()].sort((a, b) => b.length - a.length);
const TEXT_NODE_STORE = new Set<Text>();
const ELEMENT_STORE = new Set<HTMLElement>();
const TEXT_ORIGINALS = new WeakMap<Text, string>();
const ATTR_ORIGINALS = new WeakMap<HTMLElement, Map<string, string | null>>();
const TRANSLATION_CACHE = new Map<string, string>();
const PENDING_TRANSLATIONS = new Map<string, Promise<string>>();

let observer: MutationObserver | null = null;
let enabled = false;
let aiTranslate: ((text: string) => Promise<string>) | null = null;

function isChineseChar(char: string) {
  return /[\u3400-\u9fff]/.test(char);
}

function containsChinese(text: string) {
  return /[\u3400-\u9fff]/.test(text);
}

function normalizePunctuation(text: string) {
  return text
    .replace(/[，]/g, ", ")
    .replace(/[。]/g, ".")
    .replace(/[；]/g, "; ")
    .replace(/[（]/g, " (")
    .replace(/[）]/g, ") ")
    .replace(/[【]/g, " [")
    .replace(/[】]/g, "] ")
    .replace(/[、]/g, ", ")
    .replace(/[：]/g, ": ")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:)\]])/g, "$1")
    .trim();
}

const ENGLISH_ABBREVIATIONS: Array<[RegExp, string]> = [
  [/\bProduction Record(s)?\b/gi, "Prod. Rec.$1"],
  [/\bEnvironment Record(s)?\b/gi, "Env. Rec.$1"],
  [/\bCleaning Record(s)?\b/gi, "Cleaning Rec.$1"],
  [/\bDisinfection Record(s)?\b/gi, "Disinfection Rec.$1"],
  [/\bInspection Detail(s)?\b/gi, "Insp. Detail$1"],
  [/\bMaintenance Detail(s)?\b/gi, "Maint. Detail$1"],
  [/\bInspection Item(s)?\b/gi, "Insp. Item$1"],
  [/\bInspection Standard(s)?\b/gi, "Insp. Std.$1"],
  [/\bInspection Method(s)?\b/gi, "Insp. Method$1"],
  [/\bInspection Result(s)?\b/gi, "Insp. Result$1"],
  [/\bInspection Requirement(s)?\b/gi, "Insp. Req.$1"],
  [/\bMaintenance Requirement(s)?\b/gi, "Maint. Req.$1"],
  [/\bMaintenance Content(s)?\b/gi, "Maint. Content$1"],
  [/\bMaintenance Item(s)?\b/gi, "Maint. Item$1"],
  [/\bMaintenance Result(s)?\b/gi, "Maint. Result$1"],
  [/\bMaintenance Date\b/gi, "Maint. Date"],
  [/\bInspection Date\b/gi, "Insp. Date"],
  [/\bInspection Type\b/gi, "Insp. Type"],
  [/\bReviewed By\b/gi, "Rev. By"],
  [/\bApproved By\b/gi, "Appr. By"],
  [/\bDepartment\b/gi, "Dept."],
  [/\bResponsible\b/gi, "Resp."],
  [/\bRecorder\b/gi, "Rec."],
  [/\bLocation\b/gi, "Loc."],
  [/\bVersion\b/gi, "Ver."],
  [/\bQuantity\b/gi, "Qty"],
  [/\bNumber\b/gi, "No."],
  [/\bSelf-Inspection Report\b/gi, "Self-Insp. Rep."],
  [/\bDesign Verification Report\b/gi, "Design Verif. Rep."],
  [/\bDesign Validation Report\b/gi, "Design Val. Rep."],
  [/\bLaunch Assessment\b/gi, "Launch Assess."],
  [/\bPilot Task Order\b/gi, "Pilot Task"],
];

export function normalizeEnglishAbbreviations(text: string) {
  let next = String(text || "");
  ENGLISH_ABBREVIATIONS.forEach(([pattern, replacement]) => {
    next = next.replace(pattern, replacement);
  });
  return normalizePunctuation(next);
}

function translateSegment(source: string) {
  if (!source) return "";
  const exact = DICT.get(source.trim());
  if (exact) return exact;

  let i = 0;
  const out: string[] = [];

  while (i < source.length) {
    const ch = source[i];
    if (!isChineseChar(ch)) {
      out.push(ch);
      i += 1;
      continue;
    }

    let matched = false;
    for (const term of SORTED_TERMS) {
      if (source.startsWith(term, i)) {
        out.push(DICT.get(term) || term);
        i += term.length;
        matched = true;
        break;
      }
    }

    if (!matched) {
      let j = i + 1;
      while (j < source.length && isChineseChar(source[j])) j += 1;
      out.push(source.slice(i, j));
      i = j;
    }
  }

  return normalizeEnglishAbbreviations(out.join(" "));
}

function fallbackTranslate(text: string) {
  return normalizeEnglishAbbreviations(
    text
    .split(/\r?\n/)
    .map((line) => {
      const value = line.trim();
      if (!value) return "";
      if (DICT.has(value)) return DICT.get(value) || value;
      const labelMatch = value.match(/^(.+?)\s*[：:]\s*(.+)$/);
      if (labelMatch) {
        const [, left, right] = labelMatch;
        return `${translateSegment(left)}: ${translateSegment(right)}`.trim();
      }
      return translateSegment(value);
    })
    .join("\n")
    .trim()
  );
}

export async function translateTextToEnglish(
  text: string,
  options?: { aiTranslate?: ((text: string) => Promise<string>) | null }
) {
  const original = String(text || "");
  if (!original.trim() || !containsChinese(original)) return original;

  const translated = normalizeEnglishAbbreviations(
    TRANSLATION_CACHE.get(original) || fallbackTranslate(original)
  );
  TRANSLATION_CACHE.set(original, translated);

  if (!options?.aiTranslate || !shouldAttemptAi(original, translated)) {
    return translated;
  }

  try {
    const aiResult = normalizeEnglishAbbreviations(String(await options.aiTranslate(original) || "").trim());
    if (!aiResult) return translated;
    TRANSLATION_CACHE.set(original, aiResult);
    return aiResult;
  } catch {
    return translated;
  }
}

export async function translateHtmlContentToEnglish(
  html: string,
  options?: { aiTranslate?: ((text: string) => Promise<string>) | null }
) {
  const sourceHtml = String(html || "");
  if (!sourceHtml.trim() || !containsChinese(sourceHtml) || typeof DOMParser === "undefined") {
    return sourceHtml;
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div id="__runtime_translate_root__">${sourceHtml}</div>`, "text/html");
  const root = doc.getElementById("__runtime_translate_root__");
  if (!root) return sourceHtml;

  const textNodes: Text[] = [];
  const attrTargets: Array<{ element: HTMLElement; attr: string; value: string }> = [];
  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);

  let current: Node | null = walker.currentNode;
  while (current) {
    if (current.nodeType === Node.TEXT_NODE) {
      const textNode = current as Text;
      const parent = textNode.parentElement;
      if (
        parent &&
        !["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "CODE", "PRE"].includes(parent.tagName) &&
        !parent.closest("[data-no-runtime-translate='true']") &&
        !parent.closest("[contenteditable='true']")
      ) {
        textNodes.push(textNode);
      }
    } else if (current.nodeType === Node.ELEMENT_NODE) {
      const element = current as HTMLElement;
      if (
        !element.closest("[data-no-runtime-translate='true']") &&
        !element.closest("[contenteditable='true']")
      ) {
        ["placeholder", "title", "aria-label", "data-print-title"].forEach((attr) => {
          const value = element.getAttribute(attr);
          if (value && containsChinese(value)) {
            attrTargets.push({ element, attr, value });
          }
        });
      }
    }
    current = walker.nextNode();
  }

  for (const node of textNodes) {
    const value = node.textContent || "";
    if (!containsChinese(value)) continue;
    node.textContent = await translateTextToEnglish(value, options);
  }

  for (const target of attrTargets) {
    target.element.setAttribute(
      target.attr,
      await translateTextToEnglish(target.value, options)
    );
  }

  return root.innerHTML;
}

function shouldSkipNode(node: Text) {
  const parent = node.parentElement;
  if (!parent) return true;
  if (parent.closest("[data-no-runtime-translate='true']")) return true;
  if (parent.closest("[contenteditable='true']")) return true;
  const tag = parent.tagName;
  return ["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "CODE", "PRE"].includes(tag);
}

function shouldAttemptAi(original: string, translated: string) {
  if (!aiTranslate) return false;
  if (!containsChinese(original)) return false;
  if (!containsChinese(translated)) return false;
  if (original.length > 240) return false;
  return true;
}

async function translateWithAi(text: string) {
  if (!aiTranslate) return fallbackTranslate(text);
  const cached = TRANSLATION_CACHE.get(text);
  if (cached) return cached;
  const pending = PENDING_TRANSLATIONS.get(text);
  if (pending) return pending;
  const promise = aiTranslate(text)
    .then((result) => {
      const normalized = String(result || "").trim() || fallbackTranslate(text);
      TRANSLATION_CACHE.set(text, normalized);
      return normalized;
    })
    .catch(() => fallbackTranslate(text))
    .finally(() => {
      PENDING_TRANSLATIONS.delete(text);
    });
  PENDING_TRANSLATIONS.set(text, promise);
  return promise;
}

function applyTextNode(node: Text) {
  if (shouldSkipNode(node)) return;
  const current = node.textContent || "";
  const original = TEXT_ORIGINALS.get(node) ?? current;
  if (!TEXT_ORIGINALS.has(node)) {
    TEXT_ORIGINALS.set(node, original);
    TEXT_NODE_STORE.add(node);
  }
  if (!containsChinese(original)) return;

  const translated = TRANSLATION_CACHE.get(original) || fallbackTranslate(original);
  TRANSLATION_CACHE.set(original, translated);
  if (node.textContent !== translated) {
    node.textContent = translated;
  }

  if (shouldAttemptAi(original, translated)) {
    void translateWithAi(original).then((aiResult) => {
      if (!node.isConnected) return;
      if (TEXT_ORIGINALS.get(node) !== original) return;
      if (aiResult && node.textContent !== aiResult) {
        node.textContent = aiResult;
      }
    });
  }
}

function recordAttrOriginal(element: HTMLElement, attr: string, value: string | null) {
  if (!ATTR_ORIGINALS.has(element)) {
    ATTR_ORIGINALS.set(element, new Map());
    ELEMENT_STORE.add(element);
  }
  const map = ATTR_ORIGINALS.get(element)!;
  if (!map.has(attr)) map.set(attr, value);
}

function applyElementAttrs(element: HTMLElement) {
  if (element.closest("[data-no-runtime-translate='true']")) return;
  if (element.closest("[contenteditable='true']")) return;
  const attrNames = ["placeholder", "title", "aria-label", "data-print-title"];
  for (const attr of attrNames) {
    const value = element.getAttribute(attr);
    if (!value || !containsChinese(value)) continue;
    recordAttrOriginal(element, attr, value);
    const translated = TRANSLATION_CACHE.get(value) || fallbackTranslate(value);
    TRANSLATION_CACHE.set(value, translated);
    if (element.getAttribute(attr) !== translated) {
      element.setAttribute(attr, translated);
    }
    if (shouldAttemptAi(value, translated)) {
      void translateWithAi(value).then((aiResult) => {
        if (!element.isConnected) return;
        const original = ATTR_ORIGINALS.get(element)?.get(attr);
        if (original !== value) return;
        if (aiResult) {
          element.setAttribute(attr, aiResult);
        }
      });
    }
  }
}

function walk(root: Node) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  let current: Node | null = walker.currentNode;
  while (current) {
    if (current.nodeType === Node.TEXT_NODE) {
      applyTextNode(current as Text);
    } else if (current.nodeType === Node.ELEMENT_NODE) {
      applyElementAttrs(current as HTMLElement);
    }
    current = walker.nextNode();
  }
}

function observe() {
  if (!document.body || observer) return;
  observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === "characterData" && mutation.target.nodeType === Node.TEXT_NODE) {
        applyTextNode(mutation.target as Text);
      }
      mutation.addedNodes.forEach((node) => walk(node));
      if (mutation.type === "attributes" && mutation.target instanceof HTMLElement) {
        applyElementAttrs(mutation.target);
      }
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ["placeholder", "title", "aria-label"],
  });
}

function restore() {
  TEXT_NODE_STORE.forEach((node) => {
    if (!node.isConnected) return;
    const original = TEXT_ORIGINALS.get(node);
    if (original != null) node.textContent = original;
  });
  ELEMENT_STORE.forEach((element) => {
    if (!element.isConnected) return;
    const attrs = ATTR_ORIGINALS.get(element);
    if (!attrs) return;
    attrs.forEach((value, attr) => {
      if (value == null) {
        element.removeAttribute(attr);
      } else {
        element.setAttribute(attr, value);
      }
    });
  });
  document.title = document.title;
}

export function enableRuntimePageTranslator(options?: { aiTranslate?: (text: string) => Promise<string> }) {
  aiTranslate = options?.aiTranslate || null;
  if (enabled) {
    walk(document.body);
    return;
  }
  enabled = true;
  walk(document.body);
  observe();
}

export function disableRuntimePageTranslator() {
  enabled = false;
  aiTranslate = null;
  if (observer) {
    observer.disconnect();
    observer = null;
  }
  restore();
}
