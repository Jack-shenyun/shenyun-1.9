import { promises as fs } from "node:fs";
import path from "node:path";

export interface InvestmentHospitalRecord {
  id: number;
  hospitalName: string;
  hospitalCode: string;
  level: string;
  type: string;
  province: string;
  city: string;
  address: string;
  contactDept: string;
  contactPerson: string;
  contactPhone: string;
  contactEmail: string;
  products: string;
  productCount: number;
  status: "applying" | "reviewing" | "approved" | "rejected";
  applyDate: string;
  approveDate: string;
  remarks: string;
}

interface InvestmentHospitalQuery {
  search?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

const HOSPITAL_STORE_PATH = path.resolve(process.cwd(), ".local-db", "investment-hospitals.json");

async function readHospitalStore(): Promise<InvestmentHospitalRecord[]> {
  try {
    const raw = await fs.readFile(HOSPITAL_STORE_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeHospitalStore(records: InvestmentHospitalRecord[]) {
  await fs.mkdir(path.dirname(HOSPITAL_STORE_PATH), { recursive: true });
  await fs.writeFile(HOSPITAL_STORE_PATH, JSON.stringify(records, null, 2), "utf-8");
}

export async function getInvestmentHospitals(params?: InvestmentHospitalQuery) {
  const keyword = String(params?.search || "").trim().toLowerCase();
  const offset = params?.offset || 0;
  const records = await readHospitalStore();
  const filtered = records.filter((record) => {
    const matchesSearch =
      !keyword ||
      [
        record.hospitalName,
        record.hospitalCode,
        record.province,
        record.city,
        record.contactDept,
        record.contactPerson,
      ].some((value) => String(value || "").toLowerCase().includes(keyword));
    const matchesStatus = !params?.status || params.status === "all" || record.status === params.status;
    return matchesSearch && matchesStatus;
  });
  const limit = params?.limit || filtered.length;
  return filtered.slice(offset, offset + limit);
}

export async function getInvestmentHospitalById(id: number) {
  const records = await readHospitalStore();
  return records.find((record) => record.id === id);
}

export async function createInvestmentHospital(
  data: Omit<InvestmentHospitalRecord, "id">
) {
  const records = await readHospitalStore();
  const nextId = records.length > 0 ? Math.max(...records.map((record) => record.id)) + 1 : 1;
  const nextRecord: InvestmentHospitalRecord = {
    id: nextId,
    ...data,
  };
  records.unshift(nextRecord);
  await writeHospitalStore(records);
  return nextRecord;
}

export async function updateInvestmentHospital(
  id: number,
  data: Partial<Omit<InvestmentHospitalRecord, "id">>
) {
  const records = await readHospitalStore();
  const index = records.findIndex((record) => record.id === id);
  if (index < 0) return undefined;
  records[index] = {
    ...records[index],
    ...data,
  };
  await writeHospitalStore(records);
  return records[index];
}

export async function deleteInvestmentHospital(id: number) {
  const records = await readHospitalStore();
  const filtered = records.filter((record) => record.id !== id);
  await writeHospitalStore(filtered);
  return { success: true };
}
