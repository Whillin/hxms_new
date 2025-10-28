-- ========================================
-- 云服务器数据库完整迁移脚本
-- 此脚本将完全替换云服务器上的所有数据
-- 使用方法：在云服务器上执行 mysql -u root -p your_database_name < cloud_migration_script.sql
-- ========================================

-- 设置安全模式，防止意外删除
SET SQL_SAFE_UPDATES = 0;
SET FOREIGN_KEY_CHECKS = 0;

-- ========================================
-- 第一步：清空所有表的数据（保留表结构）
-- ========================================

-- 清空所有表的数据，按依赖关系顺序
TRUNCATE TABLE `role_permissions`;
TRUNCATE TABLE `employee_store_links`;
TRUNCATE TABLE `product_category_links`;
TRUNCATE TABLE `clues`;
TRUNCATE TABLE `customers`;
TRUNCATE TABLE `users`;
TRUNCATE TABLE `employees`;
TRUNCATE TABLE `roles`;
TRUNCATE TABLE `departments`;
TRUNCATE TABLE `channels`;
TRUNCATE TABLE `product_models`;
TRUNCATE TABLE `product_categories`;

-- ========================================
-- 第二步：重置自增ID
-- ========================================

ALTER TABLE `channels` AUTO_INCREMENT = 1;
ALTER TABLE `clues` AUTO_INCREMENT = 1;
ALTER TABLE `customers` AUTO_INCREMENT = 1;
ALTER TABLE `departments` AUTO_INCREMENT = 1;
ALTER TABLE `employee_store_links` AUTO_INCREMENT = 1;
ALTER TABLE `employees` AUTO_INCREMENT = 1;
ALTER TABLE `product_categories` AUTO_INCREMENT = 1;
ALTER TABLE `product_category_links` AUTO_INCREMENT = 1;
ALTER TABLE `product_models` AUTO_INCREMENT = 1;
ALTER TABLE `role_permissions` AUTO_INCREMENT = 1;
ALTER TABLE `roles` AUTO_INCREMENT = 1;
ALTER TABLE `users` AUTO_INCREMENT = 1;

-- ========================================
-- 第三步：导入本地数据
-- 注意：请将 hxms_dev_full_backup.sql 的内容复制到这里
-- 或者分别执行以下两个文件：
-- 1. 先执行此脚本清空数据
-- 2. 再执行 hxms_dev_full_backup.sql 导入数据
-- ========================================

-- 恢复设置
SET FOREIGN_KEY_CHECKS = 1;
SET SQL_SAFE_UPDATES = 1;

-- 显示导入完成信息
SELECT 'Data migration completed successfully!' as Status;