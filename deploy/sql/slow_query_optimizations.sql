-- 慢查询优化脚本：添加索引以加速常见查询

-- 为customers表添加复合索引（门店+姓名+手机号），加速列表过滤
CREATE INDEX idx_customers_store_name_phone ON customers (storeId, name, phone);

-- 为customers表添加索引于gender和buyExperience（如果频繁过滤）
CREATE INDEX idx_customers_gender ON customers (gender);
CREATE INDEX idx_customers_buy_experience ON customers (buyExperience);

-- 为clues表添加索引于visitDate（日期范围查询）
CREATE INDEX idx_clues_visit_date ON clues (visitDate);

-- 为clues表添加复合索引于storeId + opportunityLevel
CREATE INDEX idx_clues_store_opportunity ON clues (storeId, opportunityLevel);

-- 其他潜在索引，根据实际慢查询日志添加
-- 注意：执行前评估现有索引，避免冗余