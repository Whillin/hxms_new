# 云服务器数据库完整迁移指南

## 概述

此指南将帮助你将本地数据库的所有数据完全迁移到云服务器，替换云服务器上的现有数据。

## 文件说明

- `hxms_dev_full_backup.sql` - 本地数据库的完整备份文件
- `cloud_migration_script.sql` - 云服务器数据清理脚本
- `complete_migration_guide.md` - 本指南文档

## 迁移步骤

### 步骤1：准备文件

1. 将以下文件上传到云服务器：
   - `hxms_dev_full_backup.sql`
   - `cloud_migration_script.sql`

### 步骤2：备份云服务器现有数据（可选但推荐）

```bash
# 在云服务器上执行
mysqldump -u root -p --single-transaction --routines --triggers hxms_dev > cloud_backup_$(date +%Y%m%d_%H%M%S).sql
```

### 步骤3：执行数据迁移

#### 方法一：分步执行（推荐）

```bash
# 1. 先清空云服务器数据
mysql -u root -p hxms_dev < cloud_migration_script.sql

# 2. 导入本地数据
mysql -u root -p hxms_dev < hxms_dev_full_backup.sql
```

#### 方法二：合并执行

```bash
# 将两个文件合并后执行
cat cloud_migration_script.sql hxms_dev_full_backup.sql | mysql -u root -p hxms_dev
```

### 步骤4：验证数据迁移

```sql
-- 连接到数据库
mysql -u root -p hxms_dev

-- 检查各表的数据量
SELECT
    'departments' as table_name, COUNT(*) as count FROM departments
UNION ALL SELECT 'employees', COUNT(*) FROM employees
UNION ALL SELECT 'users', COUNT(*) FROM users
UNION ALL SELECT 'roles', COUNT(*) FROM roles
UNION ALL SELECT 'clues', COUNT(*) FROM clues
UNION ALL SELECT 'customers', COUNT(*) FROM customers
UNION ALL SELECT 'channels', COUNT(*) FROM channels
UNION ALL SELECT 'product_models', COUNT(*) FROM product_models
UNION ALL SELECT 'product_categories', COUNT(*) FROM product_categories;

-- 检查关键数据
SELECT * FROM roles ORDER BY id;
SELECT * FROM users ORDER BY id;
```

## 预期结果

迁移完成后，云服务器数据库应该包含以下数据：

- departments: 12条记录
- employees: 29条记录
- users: 7条记录
- roles: 10条记录
- clues: 1条记录
- customers: 1条记录
- channels: 23条记录
- product_models: 2条记录
- product_categories: 2条记录

## 注意事项

1. **数据备份**：执行迁移前请务必备份云服务器现有数据
2. **权限检查**：确保MySQL用户有足够的权限执行TRUNCATE和INSERT操作
3. **应用停机**：建议在应用停机期间执行迁移，避免数据不一致
4. **网络稳定**：确保网络连接稳定，避免迁移过程中断

## 故障排除

### 常见错误及解决方案

1. **权限不足错误**

   ```
   ERROR 1142 (42000): DROP command denied
   ```

   解决：使用具有足够权限的MySQL用户，或联系数据库管理员

2. **外键约束错误**

   ```
   ERROR 1217 (23000): Cannot delete or update a parent row
   ```

   解决：脚本已包含 `SET FOREIGN_KEY_CHECKS = 0;` 来临时禁用外键检查

3. **表不存在错误**
   ```
   ERROR 1146 (42S02): Table doesn't exist
   ```
   解决：确保云服务器数据库已创建所有必要的表结构

## 完成后的验证清单

- [ ] 所有表的数据量与本地数据库一致
- [ ] 用户可以正常登录系统
- [ ] 角色权限配置正确
- [ ] 应用功能正常运行
- [ ] 删除临时迁移文件（可选）

## 联系支持

如果在迁移过程中遇到问题，请保存错误信息并联系技术支持。
