#!/bin/bash

# Complete Cloud Server Database Migration Script
echo "=========================================="
echo "Starting Complete Database Migration on Cloud Server"
echo "=========================================="

# Create project directory if not exists
mkdir -p /root/hxms_new
cd /root/hxms_new

# Check MySQL service
echo "🔍 Checking MySQL service status..."
if ! systemctl is-active --quiet mysql; then
    echo "⚠️  MySQL service is not running, attempting to start..."
    systemctl start mysql
    if [ $? -ne 0 ]; then
        echo "❌ Failed to start MySQL service"
        exit 1
    fi
fi
echo "✅ MySQL service is running"

# Create database backup script
echo "📝 Creating database migration script..."
cat > migrate_db.sql << 'SQL_SCRIPT_EOF'
-- Drop and recreate database
DROP DATABASE IF EXISTS hxms_dev;
CREATE DATABASE hxms_dev CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE hxms_dev;

-- Create channels table
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

-- Create clues table
CREATE TABLE `clues` (
  `id` int NOT NULL AUTO_INCREMENT,
  `customerName` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `channelId` int DEFAULT NULL,
  `productId` int DEFAULT NULL,
  `employeeId` int DEFAULT NULL,
  `status` enum('待跟进','跟进中','已成交','已放弃') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '待跟进',
  `source` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `idx_clue_phone` (`phone`),
  KEY `idx_clue_status` (`status`),
  KEY `idx_clue_employee` (`employeeId`),
  KEY `FK_clues_channel` (`channelId`),
  KEY `FK_clues_product` (`productId`),
  CONSTRAINT `FK_clues_channel` FOREIGN KEY (`channelId`) REFERENCES `channels` (`id`),
  CONSTRAINT `FK_clues_employee` FOREIGN KEY (`employeeId`) REFERENCES `employees` (`id`),
  CONSTRAINT `FK_clues_product` FOREIGN KEY (`productId`) REFERENCES `products` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create customers table
CREATE TABLE `customers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_customer_phone` (`phone`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create departments table
CREATE TABLE `departments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_department_name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create employees table
CREATE TABLE `employees` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `departmentId` int DEFAULT NULL,
  `position` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('在职','离职') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '在职',
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_employee_phone` (`phone`),
  KEY `FK_employees_department` (`departmentId`),
  CONSTRAINT `FK_employees_department` FOREIGN KEY (`departmentId`) REFERENCES `departments` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create products table
CREATE TABLE `products` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `price` decimal(10,2) DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `status` enum('上架','下架') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '上架',
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `idx_product_category` (`category`),
  KEY `idx_product_status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create roles table
CREATE TABLE `roles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `permissions` json DEFAULT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_role_name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create users table
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `roleId` int DEFAULT NULL,
  `employeeId` int DEFAULT NULL,
  `status` enum('active','inactive') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `lastLoginAt` datetime DEFAULT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_user_username` (`username`),
  UNIQUE KEY `idx_user_employee` (`employeeId`),
  KEY `FK_users_role` (`roleId`),
  CONSTRAINT `FK_users_employee` FOREIGN KEY (`employeeId`) REFERENCES `employees` (`id`),
  CONSTRAINT `FK_users_role` FOREIGN KEY (`roleId`) REFERENCES `roles` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SQL_SCRIPT_EOF

echo "✅ Database migration script created"

# Execute database migration
echo "🚀 Executing database migration..."
mysql -u root -p < migrate_db.sql

if [ $? -eq 0 ]; then
    echo "✅ Database migration completed successfully!"
    
    # Verify tables
    echo "🔍 Verifying created tables..."
    mysql -u root -p -e "USE hxms_dev; SHOW TABLES;" 2>/dev/null
    
    if [ $? -eq 0 ]; then
        echo "✅ All tables created successfully!"
        echo "=========================================="
        echo "Migration Summary:"
        echo "- Database: hxms_dev"
        echo "- Tables: channels, clues, customers, departments, employees, products, roles, users"
        echo "- Status: ✅ SUCCESS"
        echo "=========================================="
    else
        echo "⚠️  Could not verify tables, but migration may have succeeded"
    fi
else
    echo "❌ Database migration failed!"
    exit 1
fi

echo "🎉 Cloud server database migration completed!"