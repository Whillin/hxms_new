# 云服务器角色识别问题修复指南

## 问题诊断

你遇到的"登录后显示前台角色"问题，根本原因是**云服务器数据库中缺少关键角色记录**，导致后端的 `sanitizeRoles` 函数将用户角色过滤为空，触发兜底逻辑自动赋予 `R_FRONT_DESK`。

### 本地数据库状态 ✅

经检查，本地数据库 `roles` 表包含完整的角色记录：

- ✅ R_ADMIN (管理员)
- ✅ R_SUPER (超级管理员)
- ✅ R_FRONT_DESK (前台)
- ✅ 其他业务角色 (销售、经理等)

### 云服务器可能的问题 ❌

1. **roles 表为空** - 最可能的原因
2. **缺少 R_SUPER/R_ADMIN 记录** - 部分缺失
3. **角色记录被禁用** - enabled = 0
4. **角色编码不匹配** - 大小写或拼写错误

## 修复步骤

### 方案一：使用诊断脚本（推荐）

1. **上传诊断脚本到云服务器**

   ```bash
   # 将 server/scripts/check-roles-table.mjs 上传到云服务器
   scp server/scripts/check-roles-table.mjs user@your-server:/path/to/project/server/scripts/
   ```

2. **在云服务器运行诊断**

   ```bash
   cd /path/to/project/server
   node scripts/check-roles-table.mjs
   ```

3. **根据诊断结果执行修复**
   - 如果提示"roles 表为空"，需要运行种子数据
   - 如果提示"缺少关键角色"，会显示对应的 INSERT SQL

### 方案二：直接执行 SQL 修复

1. **连接云服务器数据库**

   ```bash
   mysql -h localhost -u your_user -p your_database
   ```

2. **执行修复 SQL**
   ```sql
   # 上传并执行 server/scripts/fix-cloud-roles.sql
   source /path/to/fix-cloud-roles.sql;
   ```

### 方案三：手动 SQL 修复

如果无法上传文件，直接在数据库中执行：

```sql
-- 检查当前状态
SELECT roleCode, roleName, enabled FROM roles ORDER BY id;

-- 插入缺失角色（如果不存在）
INSERT IGNORE INTO roles (roleCode, roleName, description, enabled, createTime, updateTime)
VALUES
  ('R_SUPER', '超级管理员', '系统的超级管理员，可访问所有功能', 1, NOW(), NOW()),
  ('R_ADMIN', '系统管理员', '系统基础管理角色，可访问大部分功能', 1, NOW(), NOW()),
  ('R_FRONT_DESK', '前台', '前台岗位权限，可访问线索与个人中心的基础功能', 1, NOW(), NOW());

-- 确保角色启用
UPDATE roles SET enabled = 1 WHERE roleCode IN ('R_SUPER', 'R_ADMIN', 'R_FRONT_DESK');

-- 验证结果
SELECT roleCode, roleName, enabled FROM roles WHERE roleCode IN ('R_SUPER', 'R_ADMIN', 'R_FRONT_DESK');
```

## 验证修复效果

### 1. 重启后端服务

```bash
# 在云服务器上重启 Node.js 服务
pm2 restart your-app
# 或
systemctl restart your-service
```

### 2. 测试登录

- 使用管理员账号登录
- 调用 `GET /api/user/info` 接口
- 检查返回的 `data.roles` 是否包含正确角色

### 3. 预期结果

```json
{
  "code": 200,
  "data": {
    "roles": ["R_ADMIN", "R_SUPER"],  // 不再是 ["R_FRONT_DESK"]
    "userName": "admin",
    "buttons": ["add", "edit", "delete", "view", ...]
  }
}
```

## 预防措施

### 1. 数据库备份

在修复前备份 roles 表：

```sql
CREATE TABLE roles_backup AS SELECT * FROM roles;
```

### 2. 环境同步

确保开发、测试、生产环境的角色数据一致：

```bash
# 导出本地角色数据
mysqldump -u root -p hxms_dev roles > roles_seed.sql

# 在云服务器导入
mysql -u user -p production_db < roles_seed.sql
```

### 3. 监控脚本

定期运行诊断脚本检查角色完整性：

```bash
# 添加到 crontab
0 2 * * * cd /path/to/project/server && node scripts/check-roles-table.mjs >> /var/log/role-check.log 2>&1
```

## 常见问题

### Q: 修复后仍显示前台？

A: 检查以下几点：

1. 后端服务是否重启
2. 前端是否清除了缓存/localStorage
3. JWT token 是否包含正确的 roles 字段

### Q: 按钮权限仍然缺失？

A: 检查 `role_permissions` 表是否有对应角色的权限记录：

```sql
SELECT rp.*, r.roleName
FROM role_permissions rp
JOIN roles r ON rp.roleId = r.id
WHERE r.roleCode IN ('R_SUPER', 'R_ADMIN');
```

### Q: 如何确认用户的实际角色？

A: 查看用户表的 roles 字段：

```sql
SELECT id, userName, roles FROM users WHERE userName = 'your_username';
```

## 联系支持

如果按照以上步骤仍无法解决，请提供：

1. 诊断脚本的完整输出
2. `/api/user/info` 接口的返回结果
3. 用户表中的 roles 字段内容
4. 云服务器的错误日志
