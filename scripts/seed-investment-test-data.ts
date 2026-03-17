import "dotenv/config";
import mysql from "mysql2/promise";
import { createInvestmentHospital, getInvestmentHospitals } from "../server/investmentHospitals";
import {
  createMedicalPlatform,
  getMedicalPlatforms,
  saveMedicalPlatformListing,
  updateMedicalPlatform,
} from "../server/medicalPlatforms";

type DealerSeed = {
  code: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  province: string;
  city: string;
  address: string;
  paymentTerms: string;
  creditLimit: string;
  businessLicense: string;
  operatingLicense: string;
  territory: string;
  authorizationNo: string;
  authorizationExpiry: string;
  contractNo: string;
  contractExpiry: string;
  status: "pending" | "approved" | "expired" | "terminated";
};

const dealerSeeds: DealerSeed[] = [
  {
    code: "DLT-00001",
    name: "测试经销商一号",
    contactPerson: "张华",
    phone: "13800010001",
    email: "dealer01@test.local",
    province: "北京市",
    city: "北京市",
    address: "北京市朝阳区测试路1号",
    paymentTerms: "月结30天",
    creditLimit: "150000",
    businessLicense: "91110101MA000001A",
    operatingLicense: "京械经测2026001号",
    territory: "北京市",
    authorizationNo: "AUTH-001",
    authorizationExpiry: "2026-12-31",
    contractNo: "AGR-001",
    contractExpiry: "2026-12-31",
    status: "approved",
  },
  {
    code: "DLT-00002",
    name: "测试经销商二号",
    contactPerson: "李敏",
    phone: "13800010002",
    email: "dealer02@test.local",
    province: "上海市",
    city: "上海市",
    address: "上海市浦东新区测试路2号",
    paymentTerms: "月结45天",
    creditLimit: "180000",
    businessLicense: "91310115MA000002B",
    operatingLicense: "沪械经测2026002号",
    territory: "上海市",
    authorizationNo: "AUTH-002",
    authorizationExpiry: "2026-11-30",
    contractNo: "AGR-002",
    contractExpiry: "2026-11-30",
    status: "approved",
  },
  {
    code: "DLT-00003",
    name: "测试经销商三号",
    contactPerson: "王强",
    phone: "13800010003",
    email: "dealer03@test.local",
    province: "广东省",
    city: "广州市",
    address: "广州市天河区测试路3号",
    paymentTerms: "预付款",
    creditLimit: "120000",
    businessLicense: "91440101MA000003C",
    operatingLicense: "粤械经测2026003号",
    territory: "广东省/广州市",
    authorizationNo: "AUTH-003",
    authorizationExpiry: "2026-10-31",
    contractNo: "AGR-003",
    contractExpiry: "2026-10-31",
    status: "pending",
  },
  {
    code: "DLT-00004",
    name: "测试经销商四号",
    contactPerson: "赵倩",
    phone: "13800010004",
    email: "dealer04@test.local",
    province: "浙江省",
    city: "杭州市",
    address: "杭州市滨江区测试路4号",
    paymentTerms: "月结60天",
    creditLimit: "210000",
    businessLicense: "91330101MA000004D",
    operatingLicense: "浙械经测2026004号",
    territory: "浙江省/杭州市",
    authorizationNo: "AUTH-004",
    authorizationExpiry: "2026-09-30",
    contractNo: "AGR-004",
    contractExpiry: "2026-09-30",
    status: "expired",
  },
  {
    code: "DLT-00005",
    name: "测试经销商五号",
    contactPerson: "陈晨",
    phone: "13800010005",
    email: "dealer05@test.local",
    province: "四川省",
    city: "成都市",
    address: "成都市高新区测试路5号",
    paymentTerms: "货到付款",
    creditLimit: "160000",
    businessLicense: "91510101MA000005E",
    operatingLicense: "川械经测2026005号",
    territory: "四川省/成都市",
    authorizationNo: "AUTH-005",
    authorizationExpiry: "2026-08-31",
    contractNo: "AGR-005",
    contractExpiry: "2026-08-31",
    status: "terminated",
  },
];

const hospitalSeeds = [
  {
    hospitalName: "测试医院一号",
    hospitalCode: "H-001",
    level: "三甲",
    type: "综合医院",
    province: "北京市",
    city: "北京市",
    address: "北京市海淀区医学路1号",
    contactDept: "设备科",
    contactPerson: "周主任",
    contactPhone: "010-60000001",
    contactEmail: "hospital01@test.local",
    products: "一次性使用无菌注射器、输液器",
    productCount: 2,
    status: "approved" as const,
    applyDate: "2026-03-01",
    approveDate: "2026-03-05",
    remarks: "测试入院数据-已入院",
  },
  {
    hospitalName: "测试医院二号",
    hospitalCode: "H-002",
    level: "三乙",
    type: "专科医院",
    province: "上海市",
    city: "上海市",
    address: "上海市徐汇区健康路2号",
    contactDept: "采购部",
    contactPerson: "吴老师",
    contactPhone: "021-60000002",
    contactEmail: "hospital02@test.local",
    products: "医用外科口罩",
    productCount: 1,
    status: "reviewing" as const,
    applyDate: "2026-03-02",
    approveDate: "",
    remarks: "测试入院数据-评审中",
  },
  {
    hospitalName: "测试医院三号",
    hospitalCode: "H-003",
    level: "二甲",
    type: "中医医院",
    province: "广东省",
    city: "深圳市",
    address: "深圳市南山区医疗路3号",
    contactDept: "供应室",
    contactPerson: "孙老师",
    contactPhone: "0755-60000003",
    contactEmail: "hospital03@test.local",
    products: "无菌手术手套、采血针",
    productCount: 2,
    status: "applying" as const,
    applyDate: "2026-03-03",
    approveDate: "",
    remarks: "测试入院数据-申请中",
  },
  {
    hospitalName: "测试医院四号",
    hospitalCode: "H-004",
    level: "二乙",
    type: "妇幼保健院",
    province: "浙江省",
    city: "杭州市",
    address: "杭州市西湖区康健路4号",
    contactDept: "药剂科",
    contactPerson: "钱主任",
    contactPhone: "0571-60000004",
    contactEmail: "hospital04@test.local",
    products: "医用棉签、纱布块",
    productCount: 2,
    status: "approved" as const,
    applyDate: "2026-03-04",
    approveDate: "2026-03-07",
    remarks: "测试入院数据-已入院",
  },
  {
    hospitalName: "测试医院五号",
    hospitalCode: "H-005",
    level: "社区医院",
    type: "社区卫生服务中心",
    province: "四川省",
    city: "成都市",
    address: "成都市武侯区民生路5号",
    contactDept: "后勤科",
    contactPerson: "郑老师",
    contactPhone: "028-60000005",
    contactEmail: "hospital05@test.local",
    products: "一次性使用采血针",
    productCount: 1,
    status: "rejected" as const,
    applyDate: "2026-03-05",
    approveDate: "2026-03-08",
    remarks: "测试入院数据-已拒绝",
  },
];

const platformSeeds = [
  {
    province: "北京市",
    platformName: "测试挂网平台一号",
    platformType: "医药招采平台" as const,
    coverageLevel: "province" as const,
    platformUrl: "https://test-platform-01.example.com",
    officialSourceUrl: "https://source-platform-01.example.com",
    verificationStatus: "verified" as const,
    remarks: "招商测试平台数据1",
  },
  {
    province: "上海市",
    platformName: "测试挂网平台二号",
    platformType: "医保服务平台" as const,
    coverageLevel: "province" as const,
    platformUrl: "https://test-platform-02.example.com",
    officialSourceUrl: "https://source-platform-02.example.com",
    verificationStatus: "pending" as const,
    remarks: "招商测试平台数据2",
  },
  {
    province: "广东省",
    platformName: "测试挂网平台三号",
    platformType: "医药招采平台" as const,
    coverageLevel: "province" as const,
    platformUrl: "https://test-platform-03.example.com",
    officialSourceUrl: "https://source-platform-03.example.com",
    verificationStatus: "verified" as const,
    remarks: "招商测试平台数据3",
  },
  {
    province: "浙江省",
    platformName: "测试挂网平台四号",
    platformType: "医保服务平台" as const,
    coverageLevel: "province" as const,
    platformUrl: "https://test-platform-04.example.com",
    officialSourceUrl: "https://source-platform-04.example.com",
    verificationStatus: "pending" as const,
    remarks: "招商测试平台数据4",
  },
  {
    province: "四川省",
    platformName: "测试挂网平台五号",
    platformType: "医药招采平台" as const,
    coverageLevel: "province" as const,
    platformUrl: "https://test-platform-05.example.com",
    officialSourceUrl: "https://source-platform-05.example.com",
    verificationStatus: "verified" as const,
    remarks: "招商测试平台数据5",
  },
];

async function ensureDealerSeeds(connection: mysql.Connection) {
  for (const item of dealerSeeds) {
    const [customerRows] = await connection.execute(
      "SELECT id FROM customers WHERE code = ? LIMIT 1",
      [item.code]
    );
    let customerId = Number((customerRows as any[])[0]?.id || 0);

    if (!customerId) {
      const [insertResult] = await connection.execute(
        `INSERT INTO customers
        (code, name, shortName, type, contactPerson, phone, email, address, province, city, paymentTerms, currency, creditLimit, status, needInvoice, createdBy)
        VALUES (?, ?, ?, 'dealer', ?, ?, ?, ?, ?, ?, ?, 'CNY', ?, 'active', 1, 1)`,
        [
          item.code,
          item.name,
          item.name,
          item.contactPerson,
          item.phone,
          item.email,
          item.address,
          item.province,
          item.city,
          item.paymentTerms,
          item.creditLimit,
        ]
      );
      customerId = Number((insertResult as mysql.ResultSetHeader).insertId || 0);
      console.log(`已创建经销商客户：${item.name}`);
    } else {
      await connection.execute(
        `UPDATE customers
         SET name = ?, shortName = ?, type = 'dealer', contactPerson = ?, phone = ?, email = ?, address = ?, province = ?, city = ?, paymentTerms = ?, currency = 'CNY', creditLimit = ?, status = 'active', needInvoice = 1
         WHERE id = ?`,
        [
          item.name,
          item.name,
          item.contactPerson,
          item.phone,
          item.email,
          item.address,
          item.province,
          item.city,
          item.paymentTerms,
          item.creditLimit,
          customerId,
        ]
      );
      console.log(`已更新经销商客户：${item.name}`);
    }

    const [qualificationRows] = await connection.execute(
      "SELECT id FROM dealer_qualifications WHERE customerId = ? LIMIT 1",
      [customerId]
    );
    const qualificationId = Number((qualificationRows as any[])[0]?.id || 0);
    if (!qualificationId) {
      await connection.execute(
        `INSERT INTO dealer_qualifications
        (customerId, businessLicense, operatingLicense, licenseExpiry, authorizationNo, authorizationExpiry, territory, contractNo, contractExpiry, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          customerId,
          item.businessLicense,
          item.operatingLicense,
          item.authorizationExpiry,
          item.authorizationNo,
          item.authorizationExpiry,
          item.territory,
          item.contractNo,
          item.contractExpiry,
          item.status,
        ]
      );
      console.log(`已创建首营资质：${item.name}`);
    } else {
      await connection.execute(
        `UPDATE dealer_qualifications
         SET businessLicense = ?, operatingLicense = ?, licenseExpiry = ?, authorizationNo = ?, authorizationExpiry = ?, territory = ?, contractNo = ?, contractExpiry = ?, status = ?
         WHERE id = ?`,
        [
          item.businessLicense,
          item.operatingLicense,
          item.authorizationExpiry,
          item.authorizationNo,
          item.authorizationExpiry,
          item.territory,
          item.contractNo,
          item.contractExpiry,
          item.status,
          qualificationId,
        ]
      );
      console.log(`已更新首营资质：${item.name}`);
    }
  }
}

async function ensureHospitalSeeds() {
  const existing = await getInvestmentHospitals();
  for (const item of hospitalSeeds) {
    if (existing.some((row) => row.hospitalCode === item.hospitalCode)) continue;
    await createInvestmentHospital(item);
    console.log(`已创建医院测试数据：${item.hospitalName}`);
  }
}

async function ensurePlatformSeeds() {
  const existing = await getMedicalPlatforms();
  for (const [index, item] of platformSeeds.entries()) {
    const existed = existing.find((row) => row.platformName === item.platformName);
    const platform = existed
      ? await updateMedicalPlatform(existed.id, item)
      : await createMedicalPlatform(item);
    if (!platform) continue;
    await saveMedicalPlatformListing(platform.id, {
      lastUpdate: `2026-03-${String(index + 9).padStart(2, "0")}`,
      productDetails: [
        {
          productId: index * 10 + 1,
          code: `MD-T${index + 1}01`,
          name: `测试挂网产品${index + 1}-A`,
          specification: "标准型",
          unit: "盒",
          description: `招商测试挂网产品${index + 1}A`,
          listedPrice: 88 + index,
        },
        {
          productId: index * 10 + 2,
          code: `MD-T${index + 1}02`,
          name: `测试挂网产品${index + 1}-B`,
          specification: "加强型",
          unit: "盒",
          description: `招商测试挂网产品${index + 1}B`,
          listedPrice: 108 + index,
        },
      ],
    });
    console.log(`已写入平台及挂网测试数据：${item.platformName}`);
  }
}

async function main() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL!);
  try {
    await ensureDealerSeeds(connection);
    await ensureHospitalSeeds();
    await ensurePlatformSeeds();
    console.log("招商测试数据写入完成");
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
