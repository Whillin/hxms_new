-- 本地初始化线上渠道字典表与示例数据
-- 执行方式：在你的 MySQL 客户端运行本文件（注意数据库名）

-- 1) 创建表结构（若不存在）
CREATE TABLE IF NOT EXISTS `online_channels` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `category` VARCHAR(20) NOT NULL DEFAULT '线上',
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
  KEY `idx_online_category` (`category`),
  KEY `idx_online_business_source` (`businessSource`),
  KEY `idx_online_level1` (`level1`),
  KEY `idx_online_level2` (`level2`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2) 插入示例数据（避免重复插入）
-- 注意：如需重复执行，可先清空表或依赖唯一键忽略

INSERT INTO `online_channels` (`category`, `businessSource`, `level1`, `level2`, `compoundKey`, `enabled`, `sort`)
VALUES
  -- 新媒体（空二级 + 具体渠道）
  ('线上', '邀约', '新媒体', '', '线上|邀约|新媒体|', 1, 1),
  ('线上', '邀约', '新媒体', '抖音', '线上|邀约|新媒体|抖音', 1, 2),
  ('线上', '邀约', '新媒体', '微视', '线上|邀约|新媒体|微视', 1, 3),
  ('线上', '邀约', '新媒体', '小红书', '线上|邀约|新媒体|小红书', 1, 4),
  ('线上', '邀约', '新媒体', '快手', '线上|邀约|新媒体|快手', 1, 5),
  ('线上', '邀约', '新媒体', '其他', '线上|邀约|新媒体|其他', 1, 6),

  -- 垂媒（空二级 + 具体渠道）
  ('线上', '邀约', '垂媒', '', '线上|邀约|垂媒|', 1, 7),
  ('线上', '邀约', '垂媒', '懂车帝', '线上|邀约|垂媒|懂车帝', 1, 8),
  ('线上', '邀约', '垂媒', '汽车之家', '线上|邀约|垂媒|汽车之家', 1, 9),
  ('线上', '邀约', '垂媒', '易车', '线上|邀约|垂媒|易车', 1, 10),
  ('线上', '邀约', '垂媒', '其他', '线上|邀约|垂媒|其他', 1, 11),

  -- 品牌（空二级 + 品牌推荐）
  ('线上', '邀约', '品牌', '', '线上|邀约|品牌|', 1, 12),
  ('线上', '邀约', '品牌', '品牌推荐', '线上|邀约|品牌|品牌推荐', 1, 13)
ON DUPLICATE KEY UPDATE
  `enabled` = VALUES(`enabled`),
  `sort` = VALUES(`sort`),
  `updatedAt` = CURRENT_TIMESTAMP;

-- 3) 快速查看
-- SELECT * FROM `online_channels` ORDER BY `sort` ASC, `id` ASC;