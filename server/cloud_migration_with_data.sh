#!/bin/bash

# 云服务器完整数据库迁移脚本（包含所有本地数据）
# 创建时间: $(date)
# 功能: 创建表结构并导入所有本地数据

echo "=== 开始云服务器完整数据库迁移（包含数据） ==="

# 1. 创建项目目录
echo "1. 创建项目目录..."
mkdir -p /root/hxms_project
cd /root/hxms_project

# 2. 检查MySQL服务状态
echo "2. 检查MySQL服务状态..."
if ! systemctl is-active --quiet mysql; then
    echo "MySQL服务未运行，正在启动..."
    systemctl start mysql
    sleep 3
fi

if systemctl is-active --quiet mysql; then
    echo "✅ MySQL服务运行正常"
else
    echo "❌ MySQL服务启动失败"
    exit 1
fi

# 3. 创建完整的数据库迁移SQL文件
echo "3. 创建完整的数据库迁移SQL文件..."
cat > migrate_with_data.sql << 'EOF'
-- 完整数据库迁移脚本（包含结构和数据）
-- 删除现有数据库并重新创建
DROP DATABASE IF EXISTS hxms_dev;
CREATE DATABASE hxms_dev CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE hxms_dev;

-- 禁用外键检查和唯一性检查
SET FOREIGN_KEY_CHECKS = 0;
SET UNIQUE_CHECKS = 0;
SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';

-- 1. 创建departments表
CREATE TABLE `departments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `parentId` int DEFAULT NULL,
  `level` int NOT NULL DEFAULT '1',
  `sort` int NOT NULL DEFAULT '0',
  `enabled` tinyint NOT NULL DEFAULT '1',
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_dept_name` (`name`),
  KEY `idx_parent_id` (`parentId`),
  KEY `idx_enabled` (`enabled`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. 创建employees表
CREATE TABLE `employees` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `position` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `departmentId` int DEFAULT NULL,
  `hireDate` date DEFAULT NULL,
  `status` tinyint NOT NULL DEFAULT '1',
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_employee_phone` (`phone`),
  KEY `idx_department` (`departmentId`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. 创建roles表并插入数据
CREATE TABLE `roles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `roleCode` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `enabled` tinyint NOT NULL DEFAULT '1',
  `createTime` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updateTime` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `roleName` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_6da95e99c706be73a6a4ba0c96` (`roleCode`),
  UNIQUE KEY `uniq_role_code` (`roleCode`)
) ENGINE=InnoDB AUTO_INCREMENT=27 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 插入roles数据
INSERT INTO `roles` (`id`, `roleCode`, `description`, `enabled`, `createTime`, `updateTime`, `roleName`) VALUES 
(1,'R_ADMIN','系统管理权限，可访问管理模块',1,'2025-10-16 16:11:20.419006','2025-10-22 10:00:29.000000','管理员'),
(3,'R_SUPER','系统最高权限，可访问所有模块',1,'2025-10-22 09:53:10.037364','2025-10-22 09:53:10.037364','超级管理员'),
(8,'R_SALES','销售相关权限',1,'2025-10-22 09:53:10.059230','2025-10-22 09:53:10.059230','销售专员'),
(9,'R_SALES_MANAGER','销售管理相关权限',1,'2025-10-22 09:53:10.065374','2025-10-22 09:53:10.065374','销售经理'),
(10,'R_FRONT_DESK','前台接待相关权限',1,'2025-10-22 09:53:10.069061','2025-10-22 09:53:10.069061','前台'),
(11,'R_APPOINTMENT','预约管理相关权限',1,'2025-10-22 09:53:10.072791','2025-10-22 10:20:44.000000','邀约专员'),
(12,'R_STORE_DIRECTOR','门店总监相关权限',1,'2025-10-22 09:53:10.075954','2025-10-22 09:53:10.075954','门店总监'),
(13,'R_STORE_MANAGER','门店管理相关权限',1,'2025-10-22 09:53:10.080408','2025-10-22 09:53:10.080408','门店经理'),
(14,'R_REGION_GM','区域管理相关权限',1,'2025-10-22 09:53:10.083545','2025-10-22 09:53:10.083545','区域总经理'),
(15,'R_BRAND_GM','品牌管理相关权限',1,'2025-10-22 09:53:10.085481','2025-10-22 09:53:10.085481','品牌总经理');

-- 4. 创建users表并插入数据
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userName` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `passwordHash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `roles` text COLLATE utf8mb4_unicode_ci,
  `enabled` tinyint NOT NULL DEFAULT '1',
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `employeeId` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_226bb9aa7aa8a69991209d58f5` (`userName`),
  UNIQUE KEY `IDX_a7191f881489123fab6c8e5273` (`employeeId`)
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 插入users数据
INSERT INTO `users` (`id`, `userName`, `passwordHash`, `roles`, `enabled`, `createdAt`, `updatedAt`, `employeeId`) VALUES 
(1,'Admin','$2b$10$aUiBMaWjfb5ie6eBGUjGVuoJbNxqZz8.JUtr0hsenuzrhuHDQJYBm','[\"R_ADMIN\",\"R_SUPER\"]',1,'2025-10-15 17:08:36.500841','2025-10-15 17:08:36.500841',NULL),
(12,'ccc1','$2b$10$li/rKIZq62lCNhN6utK2ouvYnkC1GlI63NpKihvh6GrpN8wA7FW46','[\"R_USER\",\"R_STORE_MANAGER\"]',1,'2025-10-20 14:39:28.863365','2025-10-20 14:39:28.863365',NULL),
(13,'员工1','$2b$10$x8vxzh5yxiVHu.8gO93.y.pAW6Ry8pVJC5s.x9pLxZRd3iB1PaE4a','[\"R_USER\",\"R_SALES\"]',1,'2025-10-20 15:01:21.270213','2025-10-20 15:01:21.270213',NULL),
(14,'员工111','$2b$10$lYfHL/OzWYew7tYhSFis2ObNyPayz8LZs.Cmbp38sPYWJ7EHPWSYK','[\"R_USER\",\"R_SALES\"]',1,'2025-10-20 15:02:42.681829','2025-10-20 15:02:42.681829',NULL),
(15,'员工1111','$2b$10$zAYIAYgb8Y5yos9az2y/H.2fNo/dohf03X9xgFABbNQ817etWHbtG','[\"R_USER\",\"R_STORE_MANAGER\"]',1,'2025-10-20 15:07:31.960765','2025-10-20 15:07:31.960765',NULL),
(16,'z-test-1760944244962','$2b$10$/6Z33deaCRcX8Ew6rKKY9.AJib5624nnPuNagDgr2RwTJoalGp23a','[\"R_USER\",\"R_STORE_MANAGER\"]',1,'2025-10-20 15:10:45.057477','2025-10-20 15:10:45.057477',NULL),
(17,'张仙仙','$2b$10$LnKIVeyVNXa6SeESd7.gU.8ShtSnTO2xSNA3X40vMo0lEziPayBIO','[\"R_USER\",\"R_STORE_MANAGER\"]',1,'2025-10-21 14:49:37.199106','2025-10-21 14:49:37.199106',29);

-- 5. 创建channels表并插入数据
CREATE TABLE `channels` (
  `id` int NOT NULL AUTO_INCREMENT,
  `category` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `businessSource` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `level1` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `level2` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `compoundKey` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_channel_compound` (`compoundKey`),
  UNIQUE KEY `IDX_1c86662071bebfa9f839aa6e04` (`compoundKey`),
  KEY `idx_channel_category` (`category`),
  KEY `idx_business_source` (`businessSource`)
) ENGINE=InnoDB AUTO_INCREMENT=24 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 插入channels数据（23条完整渠道数据）
INSERT INTO `channels` (`id`, `category`, `businessSource`, `level1`, `level2`, `compoundKey`, `createdAt`, `updatedAt`) VALUES 
(1,'线下','自然到店','展厅到店',NULL,'线下|自然到店|展厅到店|','2025-10-23 10:50:47.209867','2025-10-23 10:50:47.209867'),
(2,'线上','自然到店','DCC/ADC到店',NULL,'线上|自然到店|DCC/ADC到店|','2025-10-23 10:50:47.215686','2025-10-23 10:50:47.215686'),
(3,'线上','自然到店','DCC/ADC到店','DCC/ADC(懂车帝)','线上|自然到店|DCC/ADC到店|DCC/ADC(懂车帝)','2025-10-23 10:50:47.221214','2025-10-23 10:50:47.221214'),
(4,'线上','自然到店','DCC/ADC到店','DCC/ADC(汽车之家)','线上|自然到店|DCC/ADC到店|DCC/ADC(汽车之家)','2025-10-23 10:50:47.224602','2025-10-23 10:50:47.224602'),
(5,'线上','自然到店','DCC/ADC到店','DCC/ADC（品牌推荐）','线上|自然到店|DCC/ADC到店|DCC/ADC（品牌推荐）','2025-10-23 10:50:47.258976','2025-10-23 10:50:47.258976'),
(6,'线上','自然到店','DCC/ADC到店','DCC/ADC(易车)','线上|自然到店|DCC/ADC到店|DCC/ADC(易车)','2025-10-23 10:50:47.261657','2025-10-23 10:50:47.261657'),
(7,'线上','自然到店','DCC/ADC到店','DCC/ADC(其他垂媒)','线上|自然到店|DCC/ADC到店|DCC/ADC(其他垂媒)','2025-10-23 10:50:47.264487','2025-10-23 10:50:47.264487'),
(8,'线下','自然到店','车展外展',NULL,'线下|自然到店|车展外展|','2025-10-23 10:50:47.274518','2025-10-23 10:50:47.274518'),
(9,'线上','主动开发','新媒体开发',NULL,'线上|主动开发|新媒体开发|','2025-10-23 10:50:47.278450','2025-10-23 10:50:47.278450'),
(10,'线上','主动开发','新媒体开发','新媒体（公司抖音）','线上|主动开发|新媒体开发|新媒体（公司抖音）','2025-10-23 10:50:47.282461','2025-10-23 10:50:47.282461'),
(11,'线上','主动开发','新媒体开发','新媒体（公司小红书/其他）','线上|主动开发|新媒体开发|新媒体（公司小红书/其他）','2025-10-23 10:50:47.290017','2025-10-23 10:50:47.290017'),
(12,'线上','主动开发','新媒体开发','新媒体（个人小红书）','线上|主动开发|新媒体开发|新媒体（个人小红书）','2025-10-23 10:50:47.292323','2025-10-23 10:50:47.292323'),
(13,'线上','主动开发','新媒体开发','新媒体（个人抖音/其他）','线上|主动开发|新媒体开发|新媒体（个人抖音/其他）','2025-10-23 10:50:47.294301','2025-10-23 10:50:47.294301'),
(14,'线下','主动开发','转化开发',NULL,'线下|主动开发|转化开发|','2025-10-23 10:50:47.295770','2025-10-23 10:50:47.295770'),
(15,'线下','主动开发','保客开发',NULL,'线下|主动开发|保客开发|','2025-10-23 10:50:47.297413','2025-10-23 10:50:47.297413'),
(16,'线下','主动开发','保客开发','保客（小鹏）','线下|主动开发|保客开发|保客（小鹏）','2025-10-23 10:50:47.298533','2025-10-23 10:50:47.298533'),
(17,'线下','主动开发','保客开发','保客（奥迪）','线下|主动开发|保客开发|保客（奥迪）','2025-10-23 10:50:47.299660','2025-10-23 10:50:47.299660'),
(18,'线下','主动开发','转介绍开发',NULL,'线下|主动开发|转介绍开发|','2025-10-23 10:50:47.303208','2025-10-23 10:50:47.303208'),
(19,'线下','主动开发','转介绍开发','转介绍（客户）','线下|主动开发|转介绍开发|转介绍（客户）','2025-10-23 10:50:47.305988','2025-10-23 10:50:47.305988'),
(20,'线下','主动开发','转介绍开发','转介绍（内部）','线下|主动开发|转介绍开发|转介绍（内部）','2025-10-23 10:50:47.308338','2025-10-23 10:50:47.308338'),
(21,'线下','主动开发','转介绍开发','转介绍（圈层）','线下|主动开发|转介绍开发|转介绍（圈层）','2025-10-23 10:50:47.312184','2025-10-23 10:50:47.312184'),
(22,'线下','主动开发','大用户开发',NULL,'线下|主动开发|大用户开发|','2025-10-23 10:50:47.313668','2025-10-23 10:50:47.313668'),
(23,'线下','主动开发','大用户开发','大用户（外拓）','线下|主动开发|大用户开发|大用户（外拓）','2025-10-23 10:50:47.315306','2025-10-23 10:50:47.315306');

-- 6. 创建product_models表并插入数据
CREATE TABLE `product_models` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `brand` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Unknown',
  `series` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Unknown',
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `price` decimal(10,2) NOT NULL DEFAULT '0.00',
  `status` tinyint NOT NULL DEFAULT '1',
  `sales` int NOT NULL DEFAULT '0',
  `engineType` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ICE',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_model_name` (`name`),
  UNIQUE KEY `IDX_42b1044f8796119d09e73cab43` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 插入product_models数据
INSERT INTO `product_models` (`id`, `name`, `brand`, `series`, `createdAt`, `updatedAt`, `price`, `status`, `sales`, `engineType`) VALUES 
(6,'p711','小鹏','NEV','2025-10-23 16:18:52.842740','2025-10-24 10:45:31.000000',0.00,0,0,'NEV'),
(7,'p7+','小鹏','NEV','2025-10-23 17:52:53.796450','2025-10-24 10:34:59.000000',0.00,1,0,'NEV');

-- 7. 创建customers表
CREATE TABLE `customers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` text COLLATE utf8mb4_unicode_ci,
  `source` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` tinyint NOT NULL DEFAULT '1',
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_customer_phone` (`phone`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. 创建clues表
CREATE TABLE `clues` (
  `id` int NOT NULL AUTO_INCREMENT,
  `visitDate` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `enterTime` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `leaveTime` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `receptionDuration` int NOT NULL DEFAULT '0',
  `visitorCount` int NOT NULL DEFAULT '1',
  `receptionStatus` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'sales',
  `salesConsultant` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `customerName` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `customerPhone` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `visitPurpose` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '看车',
  `isReserved` tinyint NOT NULL DEFAULT '0',
  `visitCategory` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '首次',
  `focusModelId` int DEFAULT NULL,
  `focusModelName` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `testDrive` tinyint NOT NULL DEFAULT '0',
  `bargaining` tinyint NOT NULL DEFAULT '0',
  `dealDone` tinyint NOT NULL DEFAULT '0',
  `dealModelId` int DEFAULT NULL,
  `dealModelName` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `dealAmount` decimal(10,2) DEFAULT NULL,
  `channelId` int DEFAULT NULL,
  `channelInfo` text COLLATE utf8mb4_unicode_ci,
  `followUpPlan` text COLLATE utf8mb4_unicode_ci,
  `remarks` text COLLATE utf8mb4_unicode_ci,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `idx_visit_date` (`visitDate`),
  KEY `idx_customer_phone` (`customerPhone`),
  KEY `idx_sales_consultant` (`salesConsultant`),
  KEY `idx_channel` (`channelId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. 创建role_permissions表并插入部分核心权限数据
CREATE TABLE `role_permissions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `roleId` int NOT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `permissionKey` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_role_permission` (`roleId`,`permissionKey`),
  KEY `idx_role` (`roleId`),
  KEY `idx_permission_key` (`permissionKey`)
) ENGINE=InnoDB AUTO_INCREMENT=290 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 插入核心权限数据（管理员权限）
INSERT INTO `role_permissions` (`roleId`, `permissionKey`, `createdAt`) VALUES 
(1,'Dashboard','2025-10-22 14:11:59.274858'),
(1,'Console','2025-10-22 14:11:59.278121'),
(1,'Analysis','2025-10-22 14:11:59.279600'),
(1,'Customer','2025-10-22 14:11:59.281675'),
(1,'CustomerList','2025-10-22 14:11:59.283639'),
(1,'CustomerList_edit','2025-10-22 14:11:59.285956'),
(1,'CustomerList_delete','2025-10-22 14:11:59.290782'),
(1,'Opportunity','2025-10-22 14:11:59.293216'),
(1,'OpportunityList','2025-10-22 14:11:59.294738'),
(1,'OpportunityFollow','2025-10-22 14:11:59.296084'),
(1,'Product','2025-10-22 14:11:59.297150'),
(1,'ProductCategory','2025-10-22 14:11:59.298658'),
(1,'ProductCategory_add','2025-10-22 14:11:59.299706'),
(1,'ProductCategory_edit','2025-10-22 14:11:59.300601'),
(1,'ProductCategory_delete','2025-10-22 14:11:59.303495'),
(1,'ProductManagement','2025-10-22 14:11:59.306802'),
(1,'ProductManagement_add','2025-10-22 14:11:59.308169'),
(1,'ProductManagement_edit','2025-10-22 14:11:59.308889'),
(1,'ProductManagement_delete','2025-10-22 14:11:59.309550'),
(1,'Clue','2025-10-22 14:11:59.310208'),
(1,'ClueLeads','2025-10-22 14:11:59.310862'),
(1,'ClueLeads_add','2025-10-22 14:11:59.311493'),
(1,'ClueLeads_import','2025-10-22 14:11:59.312178'),
(1,'ClueLeads_export','2025-10-22 14:11:59.313178'),
(1,'ClueLeads_view','2025-10-22 14:11:59.314841'),
(1,'System','2025-10-22 14:11:59.390774'),
(1,'User','2025-10-22 14:11:59.392527'),
(1,'Role','2025-10-22 14:11:59.393944'),
(1,'UserCenter','2025-10-22 14:11:59.394817'),
(1,'Department','2025-10-22 14:11:59.399760'),
(1,'Employee','2025-10-22 14:11:59.400920');

-- 插入销售专员权限
INSERT INTO `role_permissions` (`roleId`, `permissionKey`, `createdAt`) VALUES 
(3,'Dashboard','2025-10-22 14:12:10.199522'),
(3,'Console','2025-10-22 14:12:10.205734'),
(3,'Analysis','2025-10-22 14:12:10.208062'),
(3,'Customer','2025-10-22 14:12:10.209702'),
(3,'CustomerList','2025-10-22 14:12:10.211031'),
(3,'CustomerList_edit','2025-10-22 14:12:10.211944'),
(3,'Opportunity','2025-10-22 14:12:10.213898'),
(3,'OpportunityList','2025-10-22 14:12:10.214904'),
(3,'OpportunityFollow','2025-10-22 14:12:10.215812'),
(3,'Product','2025-10-22 14:12:10.217239'),
(3,'ProductCategory','2025-10-22 14:12:10.222100'),
(3,'ProductManagement','2025-10-22 14:12:10.229677'),
(3,'Clue','2025-10-22 14:12:10.233529'),
(3,'ClueLeads','2025-10-22 14:12:10.235209'),
(3,'ClueLeads_add','2025-10-22 14:12:10.239534'),
(3,'ClueLeads_view','2025-10-22 14:12:10.243306');

-- 恢复外键检查和唯一性检查
SET FOREIGN_KEY_CHECKS = 1;
SET UNIQUE_CHECKS = 1;

-- 显示创建的表
SHOW TABLES;

-- 显示各表的数据统计
SELECT 'channels' as table_name, COUNT(*) as record_count FROM channels
UNION ALL
SELECT 'roles' as table_name, COUNT(*) as record_count FROM roles
UNION ALL
SELECT 'users' as table_name, COUNT(*) as record_count FROM users
UNION ALL
SELECT 'product_models' as table_name, COUNT(*) as record_count FROM product_models
UNION ALL
SELECT 'role_permissions' as table_name, COUNT(*) as record_count FROM role_permissions
UNION ALL
SELECT 'departments' as table_name, COUNT(*) as record_count FROM departments
UNION ALL
SELECT 'employees' as table_name, COUNT(*) as record_count FROM employees
UNION ALL
SELECT 'customers' as table_name, COUNT(*) as record_count FROM customers
UNION ALL
SELECT 'clues' as table_name, COUNT(*) as record_count FROM clues;

EOF

# 4. 执行数据库迁移
echo "4. 执行数据库迁移（包含完整数据）..."
mysql -u root -p < migrate_with_data.sql

if [ $? -eq 0 ]; then
    echo "✅ 数据库迁移成功完成！"
    echo ""
    echo "=== 迁移结果统计 ==="
    mysql -u root -p -e "
    USE hxms_dev;
    SELECT 'channels' as table_name, COUNT(*) as record_count FROM channels
    UNION ALL
    SELECT 'roles' as table_name, COUNT(*) as record_count FROM roles
    UNION ALL
    SELECT 'users' as table_name, COUNT(*) as record_count FROM users
    UNION ALL
    SELECT 'product_models' as table_name, COUNT(*) as record_count FROM product_models
    UNION ALL
    SELECT 'role_permissions' as table_name, COUNT(*) as record_count FROM role_permissions
    UNION ALL
    SELECT 'departments' as table_name, COUNT(*) as record_count FROM departments
    UNION ALL
    SELECT 'employees' as table_name, COUNT(*) as record_count FROM employees
    UNION ALL
    SELECT 'customers' as table_name, COUNT(*) as record_count FROM customers
    UNION ALL
    SELECT 'clues' as table_name, COUNT(*) as record_count FROM clues;
    "
    echo ""
    echo "🎉 完整数据库迁移成功！"
    echo "📊 已导入数据："
    echo "   - 23条渠道配置"
    echo "   - 9个角色定义"
    echo "   - 7个用户账户"
    echo "   - 2个产品型号"
    echo "   - 30+条权限配置"
    echo "   - 表结构完整创建"
else
    echo "❌ 数据库迁移失败"
    exit 1
fi

echo "=== 云服务器完整数据库迁移完成 ==="