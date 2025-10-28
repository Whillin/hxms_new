-- 云服务器角色修复 SQL 脚本
-- 用于修复缺失的 R_SUPER 和 R_ADMIN 角色记录

-- 检查当前角色表状态
SELECT '=== 当前角色表记录 ===' as info;
SELECT id, roleCode, roleName, description, enabled, createTime 
FROM roles 
ORDER BY id ASC;

-- 检查是否缺少关键角色
SELECT '=== 缺失角色检查 ===' as info;
SELECT 
  CASE 
    WHEN NOT EXISTS (SELECT 1 FROM roles WHERE roleCode = 'R_SUPER') THEN 'R_SUPER 缺失'
    ELSE 'R_SUPER 存在'
  END as super_status,
  CASE 
    WHEN NOT EXISTS (SELECT 1 FROM roles WHERE roleCode = 'R_ADMIN') THEN 'R_ADMIN 缺失'
    ELSE 'R_ADMIN 存在'
  END as admin_status,
  CASE 
    WHEN NOT EXISTS (SELECT 1 FROM roles WHERE roleCode = 'R_FRONT_DESK') THEN 'R_FRONT_DESK 缺失'
    ELSE 'R_FRONT_DESK 存在'
  END as front_desk_status;

-- 插入缺失的角色（如果不存在）
INSERT IGNORE INTO roles (roleCode, roleName, description, enabled, createTime, updateTime)
VALUES 
  ('R_SUPER', '超级管理员', '系统的超级管理员，可访问所有功能', 1, NOW(), NOW()),
  ('R_ADMIN', '系统管理员', '系统基础管理角色，可访问大部分功能', 1, NOW(), NOW()),
  ('R_FRONT_DESK', '前台', '前台岗位权限，可访问线索与个人中心的基础功能', 1, NOW(), NOW());

-- 确保关键角色处于启用状态
UPDATE roles 
SET enabled = 1, updateTime = NOW() 
WHERE roleCode IN ('R_SUPER', 'R_ADMIN', 'R_FRONT_DESK') AND enabled = 0;

-- 验证修复结果
SELECT '=== 修复后角色表记录 ===' as info;
SELECT id, roleCode, roleName, description, enabled, createTime 
FROM roles 
WHERE roleCode IN ('R_SUPER', 'R_ADMIN', 'R_FRONT_DESK')
ORDER BY id ASC;

-- 显示总记录数
SELECT '=== 角色表统计 ===' as info;
SELECT 
  COUNT(*) as total_roles,
  COUNT(CASE WHEN enabled = 1 THEN 1 END) as enabled_roles,
  COUNT(CASE WHEN enabled = 0 THEN 1 END) as disabled_roles
FROM roles;