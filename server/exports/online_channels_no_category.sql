-- 线上渠道字典（不含 category 字段）初始化脚本
-- 在你的 MySQL 数据库中执行本文件即可创建并插入示例数据

-- 1) 创建表结构（不含 category）
CREATE TABLE IF NOT EXISTS `online_channels` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `businessSource` VARCHAR(50) NOT NULL DEFAULT '邀约',
  `level1` VARCHAR(50) NOT NULL,
  `level2` VARCHAR(50) NOT NULL DEFAULT '',
  `compoundKey` VARCHAR(255) NOT NULL,
  `enabled` TINYINT NOT NULL DEFAULT 1,
  `sort` INT NOT NULL DEFAULT 0,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_online_compound` (`compoundKey`),
  KEY `idx_online_business_source` (`businessSource`),
  KEY `idx_online_level1` (`level1`),
  KEY `idx_online_level2` (`level2`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2) 插入你提供的来源/渠道数据
-- compoundKey = businessSource|level1|level2
INSERT INTO `online_channels` (`businessSource`, `level1`, `level2`, `compoundKey`, `enabled`, `sort`) VALUES
  ('邀约', '新媒体', '抖音', '邀约|新媒体|抖音', 1, 1),
  ('邀约', '新媒体', '微视', '邀约|新媒体|微视', 1, 2),
  ('邀约', '新媒体', '小红书', '邀约|新媒体|小红书', 1, 3),
  ('邀约', '新媒体', '快手', '邀约|新媒体|快手', 1, 4),
  ('邀约', '新媒体', '其他', '邀约|新媒体|其他', 1, 5),
  ('邀约', '垂媒', '懂车帝', '邀约|垂媒|懂车帝', 1, 6),
  ('邀约', '垂媒', '汽车之家', '邀约|垂媒|汽车之家', 1, 7),
  ('邀约', '垂媒', '易车', '邀约|垂媒|易车', 1, 8),
  ('邀约', '垂媒', '其他', '邀约|垂媒|其他', 1, 9),
  ('邀约', '品牌', '品牌推荐', '邀约|品牌|品牌推荐', 1, 10)
ON DUPLICATE KEY UPDATE `enabled` = VALUES(`enabled`), `sort` = VALUES(`sort`), `updatedAt` = CURRENT_TIMESTAMP;

-- 3) 查看数据
-- SELECT level1, level2, businessSource FROM online_channels ORDER BY sort, id;