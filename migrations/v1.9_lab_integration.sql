-- ============================================================
-- 迁移：实验室检验集成功能
-- 版本：v1.9
-- 日期：2026-03-17
-- 说明：
--   1. inspection_requirement_items 增加 labTestType 列
--   2. iqc_inspection_items 增加 labTestType、labRecordId 列
--   3. lab_records 增加 sourceType、sourceId、sourceItemId 列
-- ============================================================

-- 1. 检验要求项目：增加实验室检验类型字段
ALTER TABLE inspection_requirement_items
  ADD COLUMN IF NOT EXISTS labTestType VARCHAR(50) NULL COMMENT '实验室检验类型：bioburden=初始污染菌, sterility=无菌检验';

-- 2. IQC 检验项目：增加实验室检验类型和关联实验室记录 ID
ALTER TABLE iqc_inspection_items
  ADD COLUMN IF NOT EXISTS labTestType VARCHAR(50) NULL COMMENT '实验室检验类型：bioburden=初始污染菌, sterility=无菌检验',
  ADD COLUMN IF NOT EXISTS labRecordId INT NULL COMMENT '关联实验室记录 ID';

-- 3. 实验室记录：增加来源关联字段
ALTER TABLE lab_records
  ADD COLUMN IF NOT EXISTS sourceType VARCHAR(50) NULL COMMENT '来源类型：iqc=进货检验, oqc=出货检验',
  ADD COLUMN IF NOT EXISTS sourceId INT NULL COMMENT '来源单据 ID',
  ADD COLUMN IF NOT EXISTS sourceItemId INT NULL COMMENT '来源检验项目 ID';

-- 索引（可选，提升查询性能）
CREATE INDEX IF NOT EXISTS idx_lab_records_source
  ON lab_records (sourceType, sourceId, sourceItemId);
