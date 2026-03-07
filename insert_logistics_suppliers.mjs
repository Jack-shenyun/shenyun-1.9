import mysql from 'mysql2/promise';

const logistics = [
  {
    code: 'SUP-LOG-001',
    name: '顺丰速运有限公司',
    shortName: '顺丰速运',
    type: 'service',
    contactPerson: '张经理',
    phone: '400-811-1111',
    email: 'business@sf-express.com',
    address: '广东省深圳市龙华区民治街道民旺路顺丰科技园',
    qualificationLevel: 'A',
    paymentTerms: '月结30天',
    status: 'qualified',
    evaluationScore: '95.00',
  },
  {
    code: 'SUP-LOG-002',
    name: '中通快递股份有限公司',
    shortName: '中通快递',
    type: 'service',
    contactPerson: '李经理',
    phone: '400-188-5678',
    email: 'business@zto.com',
    address: '上海市青浦区华徐公路1685号',
    qualificationLevel: 'A',
    paymentTerms: '月结30天',
    status: 'qualified',
    evaluationScore: '88.00',
  },
  {
    code: 'SUP-LOG-003',
    name: '圆通速递有限公司',
    shortName: '圆通速递',
    type: 'service',
    contactPerson: '王经理',
    phone: '400-821-6789',
    email: 'business@yto.net.cn',
    address: '上海市青浦区外青松公路7888号',
    qualificationLevel: 'B',
    paymentTerms: '月结30天',
    status: 'qualified',
    evaluationScore: '82.00',
  },
  {
    code: 'SUP-LOG-004',
    name: '德邦物流股份有限公司',
    shortName: '德邦物流',
    type: 'service',
    contactPerson: '陈经理',
    phone: '400-830-6666',
    email: 'business@deppon.com',
    address: '上海市闵行区申长路688号',
    qualificationLevel: 'A',
    paymentTerms: '月结15天',
    status: 'qualified',
    evaluationScore: '91.00',
  },
  {
    code: 'SUP-LOG-005',
    name: '京东物流股份有限公司',
    shortName: '京东物流',
    type: 'service',
    contactPerson: '赵经理',
    phone: '400-606-5500',
    email: 'business@jdl.com',
    address: '北京市大兴区亦庄经济开发区科创十四街99号',
    qualificationLevel: 'A',
    paymentTerms: '月结30天',
    status: 'qualified',
    evaluationScore: '93.00',
  },
  {
    code: 'SUP-LOG-006',
    name: '苏州申通快递有限公司',
    shortName: '申通快递',
    type: 'service',
    contactPerson: '孙经理',
    phone: '400-185-5543',
    email: 'sto@sto.cn',
    address: '苏州市工业园区唯亭镇阳澄湖大道88号',
    qualificationLevel: 'B',
    paymentTerms: '月结30天',
    status: 'qualified',
    evaluationScore: '80.00',
  },
];

const conn = await mysql.createConnection({
  host: 'gateway01.ap-southeast-1.prod.aws.tidbcloud.com',
  port: 4000,
  user: 'paZkiNgy2nHQcsT.root',
  password: 'mB5jFs2uVaZjEegW',
  database: 'test',
  ssl: { rejectUnauthorized: true }
});

let inserted = 0;
let skipped = 0;

for (const s of logistics) {
  const [existing] = await conn.query('SELECT id FROM suppliers WHERE code = ?', [s.code]);
  if (existing.length > 0) {
    console.log(`跳过已存在: ${s.code} ${s.name}`);
    skipped++;
    continue;
  }

  await conn.query(
    `INSERT INTO suppliers (code, name, shortName, type, contactPerson, phone, email, address, qualificationLevel, paymentTerms, status, evaluationScore, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    [s.code, s.name, s.shortName, s.type, s.contactPerson, s.phone, s.email, s.address, s.qualificationLevel, s.paymentTerms, s.status, s.evaluationScore]
  );
  console.log(`✅ 已插入: ${s.code} ${s.name}`);
  inserted++;
}

console.log(`\n完成！共插入 ${inserted} 条，跳过 ${skipped} 条`);
await conn.end();
