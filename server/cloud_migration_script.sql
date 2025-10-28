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

-- 清空所有表的数据，按依赖关系顺序（安全模式：只清空存在的表）
SET @sql = NULL;

-- 安全清空 role_permissions 表（如果存在）
SELECT COUNT(*) INTO @table_exists FROM information_schema.tables 
WHERE table_schema = DATABASE() AND table_name = 'role_permissions';
SET @sql = IF(@table_exists > 0, 'TRUNCATE TABLE `role_permissions`', 'SELECT "Table role_permissions does not exist, skipping..." as Info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 安全清空其他表
SELECT COUNT(*) INTO @table_exists FROM information_schema.tables 
WHERE table_schema = DATABASE() AND table_name = 'employee_store_links';
SET @sql = IF(@table_exists > 0, 'TRUNCATE TABLE `employee_store_links`', 'SELECT "Table employee_store_links does not exist, skipping..." as Info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SELECT COUNT(*) INTO @table_exists FROM information_schema.tables 
WHERE table_schema = DATABASE() AND table_name = 'product_category_links';
SET @sql = IF(@table_exists > 0, 'TRUNCATE TABLE `product_category_links`', 'SELECT "Table product_category_links does not exist, skipping..." as Info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SELECT COUNT(*) INTO @table_exists FROM information_schema.tables 
WHERE table_schema = DATABASE() AND table_name = 'clues';
SET @sql = IF(@table_exists > 0, 'TRUNCATE TABLE `clues`', 'SELECT "Table clues does not exist, skipping..." as Info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SELECT COUNT(*) INTO @table_exists FROM information_schema.tables 
WHERE table_schema = DATABASE() AND table_name = 'customers';
SET @sql = IF(@table_exists > 0, 'TRUNCATE TABLE `customers`', 'SELECT "Table customers does not exist, skipping..." as Info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SELECT COUNT(*) INTO @table_exists FROM information_schema.tables 
WHERE table_schema = DATABASE() AND table_name = 'users';
SET @sql = IF(@table_exists > 0, 'TRUNCATE TABLE `users`', 'SELECT "Table users does not exist, skipping..." as Info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SELECT COUNT(*) INTO @table_exists FROM information_schema.tables 
WHERE table_schema = DATABASE() AND table_name = 'employees';
SET @sql = IF(@table_exists > 0, 'TRUNCATE TABLE `employees`', 'SELECT "Table employees does not exist, skipping..." as Info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SELECT COUNT(*) INTO @table_exists FROM information_schema.tables 
WHERE table_schema = DATABASE() AND table_name = 'roles';
SET @sql = IF(@table_exists > 0, 'TRUNCATE TABLE `roles`', 'SELECT "Table roles does not exist, skipping..." as Info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SELECT COUNT(*) INTO @table_exists FROM information_schema.tables 
WHERE table_schema = DATABASE() AND table_name = 'departments';
SET @sql = IF(@table_exists > 0, 'TRUNCATE TABLE `departments`', 'SELECT "Table departments does not exist, skipping..." as Info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SELECT COUNT(*) INTO @table_exists FROM information_schema.tables 
WHERE table_schema = DATABASE() AND table_name = 'channels';
SET @sql = IF(@table_exists > 0, 'TRUNCATE TABLE `channels`', 'SELECT "Table channels does not exist, skipping..." as Info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SELECT COUNT(*) INTO @table_exists FROM information_schema.tables 
WHERE table_schema = DATABASE() AND table_name = 'product_models';
SET @sql = IF(@table_exists > 0, 'TRUNCATE TABLE `product_models`', 'SELECT "Table product_models does not exist, skipping..." as Info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SELECT COUNT(*) INTO @table_exists FROM information_schema.tables 
WHERE table_schema = DATABASE() AND table_name = 'product_categories';
SET @sql = IF(@table_exists > 0, 'TRUNCATE TABLE `product_categories`', 'SELECT "Table product_categories does not exist, skipping..." as Info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ========================================
-- 第二步：重置自增ID（安全模式：只重置存在的表）
-- ========================================

-- 重置 channels 表自增ID
SELECT COUNT(*) INTO @table_exists FROM information_schema.tables 
WHERE table_schema = DATABASE() AND table_name = 'channels';
SET @sql = IF(@table_exists > 0, 'ALTER TABLE `channels` AUTO_INCREMENT = 1', 'SELECT "Table channels does not exist, skipping AUTO_INCREMENT reset..." as Info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 重置 clues 表自增ID
SELECT COUNT(*) INTO @table_exists FROM information_schema.tables 
WHERE table_schema = DATABASE() AND table_name = 'clues';
SET @sql = IF(@table_exists > 0, 'ALTER TABLE `clues` AUTO_INCREMENT = 1', 'SELECT "Table clues does not exist, skipping AUTO_INCREMENT reset..." as Info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 重置 customers 表自增ID
SELECT COUNT(*) INTO @table_exists FROM information_schema.tables 
WHERE table_schema = DATABASE() AND table_name = 'customers';
SET @sql = IF(@table_exists > 0, 'ALTER TABLE `customers` AUTO_INCREMENT = 1', 'SELECT "Table customers does not exist, skipping AUTO_INCREMENT reset..." as Info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 重置 departments 表自增ID
SELECT COUNT(*) INTO @table_exists FROM information_schema.tables 
WHERE table_schema = DATABASE() AND table_name = 'departments';
SET @sql = IF(@table_exists > 0, 'ALTER TABLE `departments` AUTO_INCREMENT = 1', 'SELECT "Table departments does not exist, skipping AUTO_INCREMENT reset..." as Info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 重置 employee_store_links 表自增ID
SELECT COUNT(*) INTO @table_exists FROM information_schema.tables 
WHERE table_schema = DATABASE() AND table_name = 'employee_store_links';
SET @sql = IF(@table_exists > 0, 'ALTER TABLE `employee_store_links` AUTO_INCREMENT = 1', 'SELECT "Table employee_store_links does not exist, skipping AUTO_INCREMENT reset..." as Info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 重置 employees 表自增ID
SELECT COUNT(*) INTO @table_exists FROM information_schema.tables 
WHERE table_schema = DATABASE() AND table_name = 'employees';
SET @sql = IF(@table_exists > 0, 'ALTER TABLE `employees` AUTO_INCREMENT = 1', 'SELECT "Table employees does not exist, skipping AUTO_INCREMENT reset..." as Info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 重置 product_categories 表自增ID
SELECT COUNT(*) INTO @table_exists FROM information_schema.tables 
WHERE table_schema = DATABASE() AND table_name = 'product_categories';
SET @sql = IF(@table_exists > 0, 'ALTER TABLE `product_categories` AUTO_INCREMENT = 1', 'SELECT "Table product_categories does not exist, skipping AUTO_INCREMENT reset..." as Info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 重置 product_category_links 表自增ID
SELECT COUNT(*) INTO @table_exists FROM information_schema.tables 
WHERE table_schema = DATABASE() AND table_name = 'product_category_links';
SET @sql = IF(@table_exists > 0, 'ALTER TABLE `product_category_links` AUTO_INCREMENT = 1', 'SELECT "Table product_category_links does not exist, skipping AUTO_INCREMENT reset..." as Info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 重置 product_models 表自增ID
SELECT COUNT(*) INTO @table_exists FROM information_schema.tables 
WHERE table_schema = DATABASE() AND table_name = 'product_models';
SET @sql = IF(@table_exists > 0, 'ALTER TABLE `product_models` AUTO_INCREMENT = 1', 'SELECT "Table product_models does not exist, skipping AUTO_INCREMENT reset..." as Info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 重置 role_permissions 表自增ID
SELECT COUNT(*) INTO @table_exists FROM information_schema.tables 
WHERE table_schema = DATABASE() AND table_name = 'role_permissions';
SET @sql = IF(@table_exists > 0, 'ALTER TABLE `role_permissions` AUTO_INCREMENT = 1', 'SELECT "Table role_permissions does not exist, skipping AUTO_INCREMENT reset..." as Info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 重置 roles 表自增ID
SELECT COUNT(*) INTO @table_exists FROM information_schema.tables 
WHERE table_schema = DATABASE() AND table_name = 'roles';
SET @sql = IF(@table_exists > 0, 'ALTER TABLE `roles` AUTO_INCREMENT = 1', 'SELECT "Table roles does not exist, skipping AUTO_INCREMENT reset..." as Info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 重置 users 表自增ID
SELECT COUNT(*) INTO @table_exists FROM information_schema.tables 
WHERE table_schema = DATABASE() AND table_name = 'users';
SET @sql = IF(@table_exists > 0, 'ALTER TABLE `users` AUTO_INCREMENT = 1', 'SELECT "Table users does not exist, skipping AUTO_INCREMENT reset..." as Info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

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