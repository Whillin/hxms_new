-- 目的：允许同门店下相同手机号被不同姓名客户使用
-- 变更：唯一约束从 (storeId, phone) 调整为 (storeId, phone, name)

-- 1) 删除旧唯一索引（如不存在会报错，请在执行前确认索引名）
ALTER TABLE customers DROP INDEX uniq_store_phone;

-- 2) 新增唯一索引：门店+手机号+姓名
ALTER TABLE customers ADD UNIQUE KEY uniq_store_phone_name (storeId, phone, name);

-- 3) 为查询性能添加非唯一索引（便于快速按门店+手机号定位历史）
CREATE INDEX idx_store_phone ON customers(storeId, phone);

-- 回滚方案（如需恢复为门店+手机号唯一）：
-- ALTER TABLE customers DROP INDEX uniq_store_phone_name;
-- DROP INDEX idx_store_phone ON customers;
-- ALTER TABLE customers ADD UNIQUE KEY uniq_store_phone (storeId, phone);