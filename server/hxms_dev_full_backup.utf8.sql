-- MySQL dump 10.13  Distrib 8.0.43, for Win64 (x86_64)
--
-- Host: localhost    Database: hxms_dev
-- ------------------------------------------------------
-- Server version	8.0.43

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `channels`
--

DROP TABLE IF EXISTS `channels`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `channels`
--

LOCK TABLES `channels` WRITE;
/*!40000 ALTER TABLE `channels` DISABLE KEYS */;
INSERT INTO `channels` (`id`, `category`, `businessSource`, `level1`, `level2`, `compoundKey`, `createdAt`, `updatedAt`) VALUES (1,'绾夸笅','鑷劧鍒板簵','灞曞巺鍒板簵',NULL,'绾夸笅|鑷劧鍒板簵|灞曞巺鍒板簵|','2025-10-23 10:50:47.209867','2025-10-23 10:50:47.209867');
INSERT INTO `channels` (`id`, `category`, `businessSource`, `level1`, `level2`, `compoundKey`, `createdAt`, `updatedAt`) VALUES (2,'绾夸笂','鑷劧鍒板簵','DCC/ADC鍒板簵',NULL,'绾夸笂|鑷劧鍒板簵|DCC/ADC鍒板簵|','2025-10-23 10:50:47.215686','2025-10-23 10:50:47.215686');
INSERT INTO `channels` (`id`, `category`, `businessSource`, `level1`, `level2`, `compoundKey`, `createdAt`, `updatedAt`) VALUES (3,'绾夸笂','鑷劧鍒板簵','DCC/ADC鍒板簵','DCC/ADC(鎳傝溅甯濓級','绾夸笂|鑷劧鍒板簵|DCC/ADC鍒板簵|DCC/ADC(鎳傝溅甯濓級','2025-10-23 10:50:47.221214','2025-10-23 10:50:47.221214');
INSERT INTO `channels` (`id`, `category`, `businessSource`, `level1`, `level2`, `compoundKey`, `createdAt`, `updatedAt`) VALUES (4,'绾夸笂','鑷劧鍒板簵','DCC/ADC鍒板簵','DCC/ADC(姹借溅涔嬪锛?,'绾夸笂|鑷劧鍒板簵|DCC/ADC鍒板簵|DCC/ADC(姹借溅涔嬪锛?,'2025-10-23 10:50:47.224602','2025-10-23 10:50:47.224602');
INSERT INTO `channels` (`id`, `category`, `businessSource`, `level1`, `level2`, `compoundKey`, `createdAt`, `updatedAt`) VALUES (5,'绾夸笂','鑷劧鍒板簵','DCC/ADC鍒板簵','DCC/ADC锛堝搧鐗屾帹鑽愶級','绾夸笂|鑷劧鍒板簵|DCC/ADC鍒板簵|DCC/ADC锛堝搧鐗屾帹鑽愶級','2025-10-23 10:50:47.258976','2025-10-23 10:50:47.258976');
INSERT INTO `channels` (`id`, `category`, `businessSource`, `level1`, `level2`, `compoundKey`, `createdAt`, `updatedAt`) VALUES (6,'绾夸笂','鑷劧鍒板簵','DCC/ADC鍒板簵','DCC/ADC(鏄撹溅锛?,'绾夸笂|鑷劧鍒板簵|DCC/ADC鍒板簵|DCC/ADC(鏄撹溅锛?,'2025-10-23 10:50:47.261657','2025-10-23 10:50:47.261657');
INSERT INTO `channels` (`id`, `category`, `businessSource`, `level1`, `level2`, `compoundKey`, `createdAt`, `updatedAt`) VALUES (7,'绾夸笂','鑷劧鍒板簵','DCC/ADC鍒板簵','DCC/ADC(鍏朵粬鍨傚獟锛?,'绾夸笂|鑷劧鍒板簵|DCC/ADC鍒板簵|DCC/ADC(鍏朵粬鍨傚獟锛?,'2025-10-23 10:50:47.264487','2025-10-23 10:50:47.264487');
INSERT INTO `channels` (`id`, `category`, `businessSource`, `level1`, `level2`, `compoundKey`, `createdAt`, `updatedAt`) VALUES (8,'绾夸笅','鑷劧鍒板簵','杞﹀睍澶栧睍',NULL,'绾夸笅|鑷劧鍒板簵|杞﹀睍澶栧睍|','2025-10-23 10:50:47.274518','2025-10-23 10:50:47.274518');
INSERT INTO `channels` (`id`, `category`, `businessSource`, `level1`, `level2`, `compoundKey`, `createdAt`, `updatedAt`) VALUES (9,'绾夸笂','涓诲姩寮€鍙?,'鏂板獟浣撳紑鍙?,NULL,'绾夸笂|涓诲姩寮€鍙憒鏂板獟浣撳紑鍙憒','2025-10-23 10:50:47.278450','2025-10-23 10:50:47.278450');
INSERT INTO `channels` (`id`, `category`, `businessSource`, `level1`, `level2`, `compoundKey`, `createdAt`, `updatedAt`) VALUES (10,'绾夸笂','涓诲姩寮€鍙?,'鏂板獟浣撳紑鍙?,'鏂板獟浣擄紙鍏徃鎶栭煶锛?,'绾夸笂|涓诲姩寮€鍙憒鏂板獟浣撳紑鍙憒鏂板獟浣擄紙鍏徃鎶栭煶锛?,'2025-10-23 10:50:47.282461','2025-10-23 10:50:47.282461');
INSERT INTO `channels` (`id`, `category`, `businessSource`, `level1`, `level2`, `compoundKey`, `createdAt`, `updatedAt`) VALUES (11,'绾夸笂','涓诲姩寮€鍙?,'鏂板獟浣撳紑鍙?,'鏂板獟浣擄紙鍏徃灏忕孩涔?鍏朵粬锛?,'绾夸笂|涓诲姩寮€鍙憒鏂板獟浣撳紑鍙憒鏂板獟浣擄紙鍏徃灏忕孩涔?鍏朵粬锛?,'2025-10-23 10:50:47.290017','2025-10-23 10:50:47.290017');
INSERT INTO `channels` (`id`, `category`, `businessSource`, `level1`, `level2`, `compoundKey`, `createdAt`, `updatedAt`) VALUES (12,'绾夸笂','涓诲姩寮€鍙?,'鏂板獟浣撳紑鍙?,'鏂板獟浣擄紙涓汉灏忕孩涔︼級','绾夸笂|涓诲姩寮€鍙憒鏂板獟浣撳紑鍙憒鏂板獟浣擄紙涓汉灏忕孩涔︼級','2025-10-23 10:50:47.292323','2025-10-23 10:50:47.292323');
INSERT INTO `channels` (`id`, `category`, `businessSource`, `level1`, `level2`, `compoundKey`, `createdAt`, `updatedAt`) VALUES (13,'绾夸笂','涓诲姩寮€鍙?,'鏂板獟浣撳紑鍙?,'鏂板獟浣擄紙涓汉鎶栭煶/鍏朵粬锛?,'绾夸笂|涓诲姩寮€鍙憒鏂板獟浣撳紑鍙憒鏂板獟浣擄紙涓汉鎶栭煶/鍏朵粬锛?,'2025-10-23 10:50:47.294301','2025-10-23 10:50:47.294301');
INSERT INTO `channels` (`id`, `category`, `businessSource`, `level1`, `level2`, `compoundKey`, `createdAt`, `updatedAt`) VALUES (14,'绾夸笅','涓诲姩寮€鍙?,'杞寲寮€鍙?,NULL,'绾夸笅|涓诲姩寮€鍙憒杞寲寮€鍙憒','2025-10-23 10:50:47.295770','2025-10-23 10:50:47.295770');
INSERT INTO `channels` (`id`, `category`, `businessSource`, `level1`, `level2`, `compoundKey`, `createdAt`, `updatedAt`) VALUES (15,'绾夸笅','涓诲姩寮€鍙?,'淇濆寮€鍙?,NULL,'绾夸笅|涓诲姩寮€鍙憒淇濆寮€鍙憒','2025-10-23 10:50:47.297413','2025-10-23 10:50:47.297413');
INSERT INTO `channels` (`id`, `category`, `businessSource`, `level1`, `level2`, `compoundKey`, `createdAt`, `updatedAt`) VALUES (16,'绾夸笅','涓诲姩寮€鍙?,'淇濆寮€鍙?,'淇濆锛堝皬楣?','绾夸笅|涓诲姩寮€鍙憒淇濆寮€鍙憒淇濆锛堝皬楣?','2025-10-23 10:50:47.298533','2025-10-23 10:50:47.298533');
INSERT INTO `channels` (`id`, `category`, `businessSource`, `level1`, `level2`, `compoundKey`, `createdAt`, `updatedAt`) VALUES (17,'绾夸笅','涓诲姩寮€鍙?,'淇濆寮€鍙?,'淇濆锛堝ゥ杩?','绾夸笅|涓诲姩寮€鍙憒淇濆寮€鍙憒淇濆锛堝ゥ杩?','2025-10-23 10:50:47.299660','2025-10-23 10:50:47.299660');
INSERT INTO `channels` (`id`, `category`, `businessSource`, `level1`, `level2`, `compoundKey`, `createdAt`, `updatedAt`) VALUES (18,'绾夸笅','涓诲姩寮€鍙?,'杞粙缁嶅紑鍙?,NULL,'绾夸笅|涓诲姩寮€鍙憒杞粙缁嶅紑鍙憒','2025-10-23 10:50:47.303208','2025-10-23 10:50:47.303208');
INSERT INTO `channels` (`id`, `category`, `businessSource`, `level1`, `level2`, `compoundKey`, `createdAt`, `updatedAt`) VALUES (19,'绾夸笅','涓诲姩寮€鍙?,'杞粙缁嶅紑鍙?,'杞粙缁嶏紙瀹㈡埛锛?,'绾夸笅|涓诲姩寮€鍙憒杞粙缁嶅紑鍙憒杞粙缁嶏紙瀹㈡埛锛?,'2025-10-23 10:50:47.305988','2025-10-23 10:50:47.305988');
INSERT INTO `channels` (`id`, `category`, `businessSource`, `level1`, `level2`, `compoundKey`, `createdAt`, `updatedAt`) VALUES (20,'绾夸笅','涓诲姩寮€鍙?,'杞粙缁嶅紑鍙?,'杞粙缁嶏紙鍐呴儴锛?,'绾夸笅|涓诲姩寮€鍙憒杞粙缁嶅紑鍙憒杞粙缁嶏紙鍐呴儴锛?,'2025-10-23 10:50:47.308338','2025-10-23 10:50:47.308338');
INSERT INTO `channels` (`id`, `category`, `businessSource`, `level1`, `level2`, `compoundKey`, `createdAt`, `updatedAt`) VALUES (21,'绾夸笅','涓诲姩寮€鍙?,'杞粙缁嶅紑鍙?,'杞粙缁嶏紙鍦堝眰锛?,'绾夸笅|涓诲姩寮€鍙憒杞粙缁嶅紑鍙憒杞粙缁嶏紙鍦堝眰锛?,'2025-10-23 10:50:47.312184','2025-10-23 10:50:47.312184');
INSERT INTO `channels` (`id`, `category`, `businessSource`, `level1`, `level2`, `compoundKey`, `createdAt`, `updatedAt`) VALUES (22,'绾夸笅','涓诲姩寮€鍙?,'澶х敤鎴峰紑鍙?,NULL,'绾夸笅|涓诲姩寮€鍙憒澶х敤鎴峰紑鍙憒','2025-10-23 10:50:47.313668','2025-10-23 10:50:47.313668');
INSERT INTO `channels` (`id`, `category`, `businessSource`, `level1`, `level2`, `compoundKey`, `createdAt`, `updatedAt`) VALUES (23,'绾夸笅','涓诲姩寮€鍙?,'澶х敤鎴峰紑鍙?,'澶х敤鎴凤紙澶栨嫇锛?,'绾夸笅|涓诲姩寮€鍙憒澶х敤鎴峰紑鍙憒澶х敤鎴凤紙澶栨嫇锛?,'2025-10-23 10:50:47.315306','2025-10-23 10:50:47.315306');
/*!40000 ALTER TABLE `channels` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `clues`
--

DROP TABLE IF EXISTS `clues`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
  `visitPurpose` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '鐪嬭溅',
  `isReserved` tinyint NOT NULL DEFAULT '0',
  `visitCategory` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '棣栨',
  `focusModelId` int DEFAULT NULL,
  `focusModelName` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `testDrive` tinyint NOT NULL DEFAULT '0',
  `bargaining` tinyint NOT NULL DEFAULT '0',
  `dealDone` tinyint NOT NULL DEFAULT '0',
  `dealModelId` int DEFAULT NULL,
  `dealModelName` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `businessSource` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '鑷劧鍒板簵',
  `channelCategory` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '绾夸笅',
  `channelLevel1` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `channelLevel2` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `convertOrRetentionModel` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `referrer` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `contactTimes` int NOT NULL DEFAULT '1',
  `opportunityLevel` varchar(5) COLLATE utf8mb4_unicode_ci NOT NULL,
  `userGender` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '鏈煡',
  `userAge` int NOT NULL DEFAULT '0',
  `buyExperience` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '棣栬喘',
  `userPhoneModel` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `currentBrand` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `currentModel` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `carAge` int NOT NULL DEFAULT '0',
  `mileage` decimal(8,2) NOT NULL DEFAULT '0.00',
  `livingArea` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `brandId` int DEFAULT NULL,
  `regionId` int DEFAULT NULL,
  `storeId` int NOT NULL,
  `departmentId` int DEFAULT NULL,
  `createdBy` int DEFAULT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `customerId` int DEFAULT NULL,
  `channelId` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_brand` (`brandId`),
  KEY `idx_region` (`regionId`),
  KEY `idx_store` (`storeId`),
  KEY `idx_created_by` (`createdBy`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `clues`
--

LOCK TABLES `clues` WRITE;
/*!40000 ALTER TABLE `clues` DISABLE KEYS */;
INSERT INTO `clues` (`id`, `visitDate`, `enterTime`, `leaveTime`, `receptionDuration`, `visitorCount`, `receptionStatus`, `salesConsultant`, `customerName`, `customerPhone`, `visitPurpose`, `isReserved`, `visitCategory`, `focusModelId`, `focusModelName`, `testDrive`, `bargaining`, `dealDone`, `dealModelId`, `dealModelName`, `businessSource`, `channelCategory`, `channelLevel1`, `channelLevel2`, `convertOrRetentionModel`, `referrer`, `contactTimes`, `opportunityLevel`, `userGender`, `userAge`, `buyExperience`, `userPhoneModel`, `currentBrand`, `currentModel`, `carAge`, `mileage`, `livingArea`, `brandId`, `regionId`, `storeId`, `departmentId`, `createdBy`, `createdAt`, `updatedAt`, `customerId`, `channelId`) VALUES (1,'2025-10-01','12:03','19:03',420,1,'none','','韪╄俯韪?,'11526037522','鐪嬭溅',0,'棣栨',NULL,'',0,0,0,NULL,'','鑷劧鍒板簵','绾夸笂','DCC/ADC鍒板簵','DCC/ADC(鎳傝溅甯濓級','','',1,'A','鐢?,15,'棣栬喘','鍏朵粬','','',0,0.00,'杈藉畞鐪?鎶氶『甯?鎶氶『鍘?,6,9,11,NULL,NULL,'2025-10-23 12:03:58.578387','2025-10-23 12:03:58.578387',1,3);
/*!40000 ALTER TABLE `clues` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `customers`
--

DROP TABLE IF EXISTS `customers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `gender` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '鏈煡',
  `age` int NOT NULL DEFAULT '0',
  `buyExperience` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '棣栬喘',
  `phoneModel` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `currentBrand` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `currentModel` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `carAge` int NOT NULL DEFAULT '0',
  `mileage` decimal(8,2) NOT NULL DEFAULT '0.00',
  `livingArea` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_customer_phone` (`phone`),
  UNIQUE KEY `IDX_88acd889fbe17d0e16cc4bc917` (`phone`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customers`
--

LOCK TABLES `customers` WRITE;
/*!40000 ALTER TABLE `customers` DISABLE KEYS */;
INSERT INTO `customers` (`id`, `name`, `phone`, `gender`, `age`, `buyExperience`, `phoneModel`, `currentBrand`, `currentModel`, `carAge`, `mileage`, `livingArea`, `createdAt`, `updatedAt`) VALUES (1,'韪╄俯韪?,'11526037522','鐢?,15,'棣栬喘','鍏朵粬',NULL,NULL,0,0.00,'杈藉畞鐪?鎶氶『甯?鎶氶『鍘?,'2025-10-23 12:03:58.563999','2025-10-23 12:03:58.563999');
/*!40000 ALTER TABLE `customers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `departments`
--

DROP TABLE IF EXISTS `departments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `departments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `parentId` int DEFAULT NULL,
  `enabled` tinyint NOT NULL DEFAULT '1',
  `createTime` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `departments`
--

LOCK TABLES `departments` WRITE;
/*!40000 ALTER TABLE `departments` DISABLE KEYS */;
INSERT INTO `departments` (`id`, `name`, `type`, `parentId`, `enabled`, `createTime`, `code`) VALUES (1,'鍗庢槦鍚嶄粫闆嗗洟','group',NULL,1,'2025-10-16 11:19:13.063572',NULL);
INSERT INTO `departments` (`id`, `name`, `type`, `parentId`, `enabled`, `createTime`, `code`) VALUES (3,'淇℃伅閮ㄩ棬','brand',1,1,'2025-10-16 11:20:25.661051','01');
INSERT INTO `departments` (`id`, `name`, `type`, `parentId`, `enabled`, `createTime`, `code`) VALUES (4,'涓€姹藉ゥ杩?,'brand',1,1,'2025-10-16 13:18:04.225393','02');
INSERT INTO `departments` (`id`, `name`, `type`, `parentId`, `enabled`, `createTime`, `code`) VALUES (5,'涓婃苯濂ヨ开','brand',1,1,'2025-10-16 13:20:56.296120','03');
INSERT INTO `departments` (`id`, `name`, `type`, `parentId`, `enabled`, `createTime`, `code`) VALUES (6,'灏忛箯','brand',1,1,'2025-10-16 13:21:54.554854','04');
INSERT INTO `departments` (`id`, `name`, `type`, `parentId`, `enabled`, `createTime`, `code`) VALUES (7,'涓€姹介攢鍞儴闂?,'department',4,1,'2025-10-16 15:31:36.262437','02');
INSERT INTO `departments` (`id`, `name`, `type`, `parentId`, `enabled`, `createTime`, `code`) VALUES (8,'灏忛箯閿€鍞儴闂?,'department',6,1,'2025-10-16 15:32:02.448677','04');
INSERT INTO `departments` (`id`, `name`, `type`, `parentId`, `enabled`, `createTime`, `code`) VALUES (9,'宸濊竟鍖哄煙','region',8,1,'2025-10-16 15:44:56.928426','0401');
INSERT INTO `departments` (`id`, `name`, `type`, `parentId`, `enabled`, `createTime`, `code`) VALUES (10,'娌冲寳鍖哄煙','region',8,1,'2025-10-16 15:45:11.968858','0402');
INSERT INTO `departments` (`id`, `name`, `type`, `parentId`, `enabled`, `createTime`, `code`) VALUES (11,'娉稿窞搴?,'store',9,1,'2025-10-16 15:45:30.191138','040101');
INSERT INTO `departments` (`id`, `name`, `type`, `parentId`, `enabled`, `createTime`, `code`) VALUES (12,'寤婂潑搴?,'store',10,1,'2025-10-16 15:45:45.807184','040201');
INSERT INTO `departments` (`id`, `name`, `type`, `parentId`, `enabled`, `createTime`, `code`) VALUES (15,'閿€鍞竴缁?,'department',11,1,'2025-10-21 13:33:42.264363','040101');
/*!40000 ALTER TABLE `departments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `employee_store_links`
--

DROP TABLE IF EXISTS `employee_store_links`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `employee_store_links` (
  `id` int NOT NULL AUTO_INCREMENT,
  `employeeId` int NOT NULL,
  `storeId` int NOT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_employee_store` (`employeeId`,`storeId`),
  KEY `idx_employee` (`employeeId`),
  KEY `idx_store` (`storeId`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `employee_store_links`
--

LOCK TABLES `employee_store_links` WRITE;
/*!40000 ALTER TABLE `employee_store_links` DISABLE KEYS */;
INSERT INTO `employee_store_links` (`id`, `employeeId`, `storeId`, `createdAt`) VALUES (2,10,12,'2025-10-21 11:49:55.282485');
INSERT INTO `employee_store_links` (`id`, `employeeId`, `storeId`, `createdAt`) VALUES (3,27,11,'2025-10-21 13:34:07.346774');
INSERT INTO `employee_store_links` (`id`, `employeeId`, `storeId`, `createdAt`) VALUES (4,22,11,'2025-10-21 13:34:31.785523');
INSERT INTO `employee_store_links` (`id`, `employeeId`, `storeId`, `createdAt`) VALUES (5,29,11,'2025-10-21 14:49:08.705688');
/*!40000 ALTER TABLE `employee_store_links` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `employees`
--

DROP TABLE IF EXISTS `employees`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `employees` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `gender` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `brandId` int DEFAULT NULL,
  `regionId` int DEFAULT NULL,
  `storeId` int DEFAULT NULL,
  `hireDate` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `departmentId` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_cbc362d1c574464a63d3acc3ea` (`phone`)
) ENGINE=InnoDB AUTO_INCREMENT=30 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `employees`
--

LOCK TABLES `employees` WRITE;
/*!40000 ALTER TABLE `employees` DISABLE KEYS */;
INSERT INTO `employees` (`id`, `name`, `phone`, `gender`, `status`, `role`, `brandId`, `regionId`, `storeId`, `hireDate`, `createdAt`, `updatedAt`, `departmentId`) VALUES (1,'鍛樺伐1','13800001001','female','1','R_SALES',NULL,NULL,1,'2025-10-19','2025-10-20 09:33:55.622571','2025-10-20 09:33:55.622571',NULL);
INSERT INTO `employees` (`id`, `name`, `phone`, `gender`, `status`, `role`, `brandId`, `regionId`, `storeId`, `hireDate`, `createdAt`, `updatedAt`, `departmentId`) VALUES (2,'鍛樺伐2','13800001002','other','1','R_TECH',NULL,NULL,2,'2025-10-18','2025-10-20 09:33:55.627385','2025-10-20 09:33:55.627385',NULL);
INSERT INTO `employees` (`id`, `name`, `phone`, `gender`, `status`, `role`, `brandId`, `regionId`, `storeId`, `hireDate`, `createdAt`, `updatedAt`, `departmentId`) VALUES (3,'鍛樺伐3','13800001003','male','1','R_FINANCE',NULL,NULL,3,'2025-10-17','2025-10-20 09:33:55.631303','2025-10-20 09:33:55.631303',NULL);
INSERT INTO `employees` (`id`, `name`, `phone`, `gender`, `status`, `role`, `brandId`, `regionId`, `storeId`, `hireDate`, `createdAt`, `updatedAt`, `departmentId`) VALUES (4,'鍛樺伐4','13800001004','female','1','R_HR',NULL,NULL,4,'2025-10-16','2025-10-20 09:33:55.633628','2025-10-20 09:33:55.633628',NULL);
INSERT INTO `employees` (`id`, `name`, `phone`, `gender`, `status`, `role`, `brandId`, `regionId`, `storeId`, `hireDate`, `createdAt`, `updatedAt`, `departmentId`) VALUES (5,'鍛樺伐5','13800001005','other','2','R_STORE_MANAGER',NULL,NULL,5,'2025-10-15','2025-10-20 09:33:55.635281','2025-10-20 09:33:55.635281',NULL);
INSERT INTO `employees` (`id`, `name`, `phone`, `gender`, `status`, `role`, `brandId`, `regionId`, `storeId`, `hireDate`, `createdAt`, `updatedAt`, `departmentId`) VALUES (6,'鍛樺伐6','13800001006','male','1','R_REGION_GM',NULL,2,NULL,'2025-10-14','2025-10-20 09:33:55.637012','2025-10-20 09:33:55.637012',NULL);
INSERT INTO `employees` (`id`, `name`, `phone`, `gender`, `status`, `role`, `brandId`, `regionId`, `storeId`, `hireDate`, `createdAt`, `updatedAt`, `departmentId`) VALUES (7,'鍛樺伐7','13800001007','female','1','R_BRAND_GM',1,NULL,NULL,'2025-10-13','2025-10-20 09:33:55.638284','2025-10-20 09:33:55.638284',NULL);
INSERT INTO `employees` (`id`, `name`, `phone`, `gender`, `status`, `role`, `brandId`, `regionId`, `storeId`, `hireDate`, `createdAt`, `updatedAt`, `departmentId`) VALUES (8,'鍛樺伐8','13800001008','other','1','R_SALES',NULL,NULL,3,'2025-10-12','2025-10-20 09:33:55.640237','2025-10-20 09:33:55.640237',NULL);
INSERT INTO `employees` (`id`, `name`, `phone`, `gender`, `status`, `role`, `brandId`, `regionId`, `storeId`, `hireDate`, `createdAt`, `updatedAt`, `departmentId`) VALUES (9,'鍛樺伐9','13800001009','male','1','R_TECH',NULL,NULL,4,'2025-10-11','2025-10-20 09:33:55.642219','2025-10-20 09:33:55.642219',NULL);
INSERT INTO `employees` (`id`, `name`, `phone`, `gender`, `status`, `role`, `brandId`, `regionId`, `storeId`, `hireDate`, `createdAt`, `updatedAt`, `departmentId`) VALUES (10,'鍛樺伐10','13800001010','female','2','R_FINANCE',6,10,12,'2025-10-10','2025-10-20 09:33:55.645376','2025-10-21 11:49:55.000000',NULL);
INSERT INTO `employees` (`id`, `name`, `phone`, `gender`, `status`, `role`, `brandId`, `regionId`, `storeId`, `hireDate`, `createdAt`, `updatedAt`, `departmentId`) VALUES (11,'鍛樺伐11','13800001011','other','1','R_HR',NULL,NULL,1,'2025-10-09','2025-10-20 09:33:55.647912','2025-10-20 09:33:55.647912',NULL);
INSERT INTO `employees` (`id`, `name`, `phone`, `gender`, `status`, `role`, `brandId`, `regionId`, `storeId`, `hireDate`, `createdAt`, `updatedAt`, `departmentId`) VALUES (12,'鍛樺伐12','13800001012','male','1','R_STORE_MANAGER',NULL,NULL,2,'2025-10-08','2025-10-20 09:33:55.649544','2025-10-20 09:33:55.649544',NULL);
INSERT INTO `employees` (`id`, `name`, `phone`, `gender`, `status`, `role`, `brandId`, `regionId`, `storeId`, `hireDate`, `createdAt`, `updatedAt`, `departmentId`) VALUES (13,'鍛樺伐13','13800001013','female','1','R_REGION_GM',NULL,1,NULL,'2025-10-07','2025-10-20 09:33:55.650631','2025-10-20 09:33:55.650631',NULL);
INSERT INTO `employees` (`id`, `name`, `phone`, `gender`, `status`, `role`, `brandId`, `regionId`, `storeId`, `hireDate`, `createdAt`, `updatedAt`, `departmentId`) VALUES (14,'鍛樺伐14','13800001014','other','1','R_BRAND_GM',2,NULL,NULL,'2025-10-06','2025-10-20 09:33:55.651656','2025-10-20 09:33:55.651656',NULL);
INSERT INTO `employees` (`id`, `name`, `phone`, `gender`, `status`, `role`, `brandId`, `regionId`, `storeId`, `hireDate`, `createdAt`, `updatedAt`, `departmentId`) VALUES (15,'鍛樺伐15','13800001015','male','2','R_SALES',NULL,NULL,5,'2025-10-05','2025-10-20 09:33:55.652738','2025-10-20 09:33:55.652738',NULL);
INSERT INTO `employees` (`id`, `name`, `phone`, `gender`, `status`, `role`, `brandId`, `regionId`, `storeId`, `hireDate`, `createdAt`, `updatedAt`, `departmentId`) VALUES (16,'鍛樺伐16','13800001016','female','1','R_TECH',NULL,NULL,1,'2025-10-04','2025-10-20 09:33:55.653812','2025-10-20 09:33:55.653812',NULL);
INSERT INTO `employees` (`id`, `name`, `phone`, `gender`, `status`, `role`, `brandId`, `regionId`, `storeId`, `hireDate`, `createdAt`, `updatedAt`, `departmentId`) VALUES (17,'鍛樺伐17','13800001017','other','1','R_FINANCE',NULL,NULL,2,'2025-10-03','2025-10-20 09:33:55.654797','2025-10-20 09:33:55.654797',NULL);
INSERT INTO `employees` (`id`, `name`, `phone`, `gender`, `status`, `role`, `brandId`, `regionId`, `storeId`, `hireDate`, `createdAt`, `updatedAt`, `departmentId`) VALUES (18,'鍛樺伐18','13800001018','male','1','R_HR',NULL,NULL,3,'2025-10-02','2025-10-20 09:33:55.655563','2025-10-20 09:33:55.655563',NULL);
INSERT INTO `employees` (`id`, `name`, `phone`, `gender`, `status`, `role`, `brandId`, `regionId`, `storeId`, `hireDate`, `createdAt`, `updatedAt`, `departmentId`) VALUES (19,'鍛樺伐19','13800001019','female','1','R_STORE_MANAGER',NULL,NULL,4,'2025-10-01','2025-10-20 09:33:55.656609','2025-10-20 09:33:55.656609',NULL);
INSERT INTO `employees` (`id`, `name`, `phone`, `gender`, `status`, `role`, `brandId`, `regionId`, `storeId`, `hireDate`, `createdAt`, `updatedAt`, `departmentId`) VALUES (20,'鍛樺伐20','13800001020','other','2','R_REGION_GM',NULL,4,NULL,'2025-09-30','2025-10-20 09:33:55.657612','2025-10-20 09:33:55.657612',NULL);
INSERT INTO `employees` (`id`, `name`, `phone`, `gender`, `status`, `role`, `brandId`, `regionId`, `storeId`, `hireDate`, `createdAt`, `updatedAt`, `departmentId`) VALUES (21,'鍛樺伐21','13800001021','male','1','R_BRAND_GM',3,NULL,NULL,'2025-09-29','2025-10-20 09:33:55.658507','2025-10-20 09:33:55.658507',NULL);
INSERT INTO `employees` (`id`, `name`, `phone`, `gender`, `status`, `role`, `brandId`, `regionId`, `storeId`, `hireDate`, `createdAt`, `updatedAt`, `departmentId`) VALUES (22,'鍛樺伐22','13800001022','female','1','R_SALES',6,9,11,'2025-09-28','2025-10-20 09:33:55.659527','2025-10-21 13:34:31.000000',15);
INSERT INTO `employees` (`id`, `name`, `phone`, `gender`, `status`, `role`, `brandId`, `regionId`, `storeId`, `hireDate`, `createdAt`, `updatedAt`, `departmentId`) VALUES (23,'鍛樺伐23','13800001023','other','1','R_TECH',NULL,NULL,3,'2025-09-27','2025-10-20 09:33:55.660575','2025-10-20 09:33:55.660575',NULL);
INSERT INTO `employees` (`id`, `name`, `phone`, `gender`, `status`, `role`, `brandId`, `regionId`, `storeId`, `hireDate`, `createdAt`, `updatedAt`, `departmentId`) VALUES (24,'鍛樺伐24','13800001024','male','1','R_FINANCE',NULL,NULL,4,'2025-09-26','2025-10-20 09:33:55.662168','2025-10-20 09:33:55.662168',NULL);
INSERT INTO `employees` (`id`, `name`, `phone`, `gender`, `status`, `role`, `brandId`, `regionId`, `storeId`, `hireDate`, `createdAt`, `updatedAt`, `departmentId`) VALUES (25,'鍛樺伐25','13800001025','female','2','R_HR',NULL,NULL,5,'2025-09-25','2025-10-20 09:33:55.663404','2025-10-20 09:33:55.663404',NULL);
INSERT INTO `employees` (`id`, `name`, `phone`, `gender`, `status`, `role`, `brandId`, `regionId`, `storeId`, `hireDate`, `createdAt`, `updatedAt`, `departmentId`) VALUES (26,'闄堣秴瓒?,'15260376762','male','1','R_ADMIN',3,NULL,NULL,'2025-08-18','2025-10-20 10:28:55.651500','2025-10-20 10:28:55.651500',NULL);
INSERT INTO `employees` (`id`, `name`, `phone`, `gender`, `status`, `role`, `brandId`, `regionId`, `storeId`, `hireDate`, `createdAt`, `updatedAt`, `departmentId`) VALUES (27,'韪╄俯韪?,'15260376761','male','1','R_SALES_MANAGER',6,9,11,'2025-10-17','2025-10-20 13:56:24.777565','2025-10-21 13:34:07.000000',15);
INSERT INTO `employees` (`id`, `name`, `phone`, `gender`, `status`, `role`, `brandId`, `regionId`, `storeId`, `hireDate`, `createdAt`, `updatedAt`, `departmentId`) VALUES (28,'鎿︽摝鎿?,'15260376760','male','2','R_BRAND_GM',6,NULL,NULL,'2025-10-14','2025-10-20 13:56:47.386300','2025-10-20 13:56:47.386300',NULL);
INSERT INTO `employees` (`id`, `name`, `phone`, `gender`, `status`, `role`, `brandId`, `regionId`, `storeId`, `hireDate`, `createdAt`, `updatedAt`, `departmentId`) VALUES (29,'寮犱粰浠?,'13340746764','female','1','R_STORE_MANAGER',6,9,11,'2024-09-01','2025-10-21 14:49:08.693192','2025-10-21 14:49:08.693192',NULL);
/*!40000 ALTER TABLE `employees` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `product_categories`
--

DROP TABLE IF EXISTS `product_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `product_categories` (
  `id` int NOT NULL AUTO_INCREMENT,
  `parentId` int DEFAULT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `slug` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `path` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `level` int NOT NULL DEFAULT '0',
  `sortOrder` int NOT NULL DEFAULT '0',
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `idx_parent` (`parentId`),
  KEY `idx_path` (`path`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `product_categories`
--

LOCK TABLES `product_categories` WRITE;
/*!40000 ALTER TABLE `product_categories` DISABLE KEYS */;
INSERT INTO `product_categories` (`id`, `parentId`, `name`, `slug`, `path`, `level`, `sortOrder`, `status`, `createdAt`, `updatedAt`) VALUES (11,0,'灏忛箯','XPENG01','',0,1,'active','2025-10-23 14:22:26.215824','2025-10-23 14:22:26.215824');
INSERT INTO `product_categories` (`id`, `parentId`, `name`, `slug`, `path`, `level`, `sortOrder`, `status`, `createdAt`, `updatedAt`) VALUES (13,11,'NEV','XPENG01001','/11',1,1,'active','2025-10-23 14:35:26.885490','2025-10-23 14:35:26.885490');
/*!40000 ALTER TABLE `product_categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `product_category_links`
--

DROP TABLE IF EXISTS `product_category_links`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `product_category_links` (
  `id` int NOT NULL AUTO_INCREMENT,
  `productId` int NOT NULL,
  `categoryId` int NOT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_product_category` (`productId`)
) ENGINE=InnoDB AUTO_INCREMENT=34 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `product_category_links`
--

LOCK TABLES `product_category_links` WRITE;
/*!40000 ALTER TABLE `product_category_links` DISABLE KEYS */;
INSERT INTO `product_category_links` (`id`, `productId`, `categoryId`, `createdAt`, `updatedAt`) VALUES (32,6,13,'2025-10-24 10:34:55.213670','2025-10-24 10:34:55.213670');
INSERT INTO `product_category_links` (`id`, `productId`, `categoryId`, `createdAt`, `updatedAt`) VALUES (33,7,13,'2025-10-24 10:34:59.285253','2025-10-24 10:34:59.285253');
/*!40000 ALTER TABLE `product_category_links` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `product_models`
--

DROP TABLE IF EXISTS `product_models`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `product_models` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `brand` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `series` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `product_models`
--

LOCK TABLES `product_models` WRITE;
/*!40000 ALTER TABLE `product_models` DISABLE KEYS */;
INSERT INTO `product_models` (`id`, `name`, `brand`, `series`, `createdAt`, `updatedAt`, `price`, `status`, `sales`, `engineType`) VALUES (6,'p711','灏忛箯','NEV','2025-10-23 16:18:52.842740','2025-10-24 10:45:31.000000',0.00,0,0,'NEV');
INSERT INTO `product_models` (`id`, `name`, `brand`, `series`, `createdAt`, `updatedAt`, `price`, `status`, `sales`, `engineType`) VALUES (7,'p7+','灏忛箯','NEV','2025-10-23 17:52:53.796450','2025-10-24 10:34:59.000000',0.00,1,0,'NEV');
/*!40000 ALTER TABLE `product_models` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `role_permissions`
--

DROP TABLE IF EXISTS `role_permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `role_permissions`
--

LOCK TABLES `role_permissions` WRITE;
/*!40000 ALTER TABLE `role_permissions` DISABLE KEYS */;
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (102,1,'2025-10-22 14:11:59.274858','Dashboard');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (103,1,'2025-10-22 14:11:59.278121','Console');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (104,1,'2025-10-22 14:11:59.279600','Analysis');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (105,1,'2025-10-22 14:11:59.281675','Customer');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (106,1,'2025-10-22 14:11:59.283639','CustomerList');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (107,1,'2025-10-22 14:11:59.285956','CustomerList_edit');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (108,1,'2025-10-22 14:11:59.290782','CustomerList_delete');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (109,1,'2025-10-22 14:11:59.293216','Opportunity');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (110,1,'2025-10-22 14:11:59.294738','OpportunityList');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (111,1,'2025-10-22 14:11:59.296084','OpportunityFollow');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (112,1,'2025-10-22 14:11:59.297150','Product');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (113,1,'2025-10-22 14:11:59.298658','ProductCategory');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (114,1,'2025-10-22 14:11:59.299706','ProductCategory_add');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (115,1,'2025-10-22 14:11:59.300601','ProductCategory_edit');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (116,1,'2025-10-22 14:11:59.303495','ProductCategory_delete');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (117,1,'2025-10-22 14:11:59.306802','ProductManagement');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (118,1,'2025-10-22 14:11:59.308169','ProductManagement_add');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (119,1,'2025-10-22 14:11:59.308889','ProductManagement_edit');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (120,1,'2025-10-22 14:11:59.309550','ProductManagement_delete');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (121,1,'2025-10-22 14:11:59.310208','Clue');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (122,1,'2025-10-22 14:11:59.310862','ClueLeads');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (123,1,'2025-10-22 14:11:59.311493','ClueLeads_add');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (124,1,'2025-10-22 14:11:59.312178','ClueLeads_import');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (125,1,'2025-10-22 14:11:59.313178','ClueLeads_export');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (126,1,'2025-10-22 14:11:59.314841','ClueLeads_view');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (127,1,'2025-10-22 14:11:59.316077','Template');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (128,1,'2025-10-22 14:11:59.316979','Cards');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (129,1,'2025-10-22 14:11:59.319950','Banners');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (130,1,'2025-10-22 14:11:59.324676','Charts');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (131,1,'2025-10-22 14:11:59.326605','Map');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (132,1,'2025-10-22 14:11:59.327927','Chat');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (133,1,'2025-10-22 14:11:59.329936','Calendar');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (134,1,'2025-10-22 14:11:59.331898','Pricing');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (135,1,'2025-10-22 14:11:59.333221','Widgets');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (136,1,'2025-10-22 14:11:59.334803','IconList');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (137,1,'2025-10-22 14:11:59.339249','IconSelector');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (138,1,'2025-10-22 14:11:59.341715','ImageCrop');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (139,1,'2025-10-22 14:11:59.343224','Excel');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (140,1,'2025-10-22 14:11:59.344554','Video');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (141,1,'2025-10-22 14:11:59.346077','CountTo');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (142,1,'2025-10-22 14:11:59.347362','WangEditor');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (143,1,'2025-10-22 14:11:59.348910','Watermark');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (144,1,'2025-10-22 14:11:59.350082','ContextMenu');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (145,1,'2025-10-22 14:11:59.352075','Qrcode');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (146,1,'2025-10-22 14:11:59.356731','Drag');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (147,1,'2025-10-22 14:11:59.359644','TextScroll');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (148,1,'2025-10-22 14:11:59.361770','Fireworks');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (149,1,'2025-10-22 14:11:59.363253','ElementUI');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (150,1,'2025-10-22 14:11:59.364442','Examples');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (151,1,'2025-10-22 14:11:59.365528','Permission');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (152,1,'2025-10-22 14:11:59.366525','PermissionSwitchRole');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (153,1,'2025-10-22 14:11:59.367540','PermissionButtonAuth');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (154,1,'2025-10-22 14:11:59.370408','PermissionButtonAuth_add');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (155,1,'2025-10-22 14:11:59.373618','PermissionButtonAuth_edit');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (156,1,'2025-10-22 14:11:59.375420','PermissionButtonAuth_delete');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (157,1,'2025-10-22 14:11:59.376487','PermissionButtonAuth_export');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (158,1,'2025-10-22 14:11:59.377234','PermissionButtonAuth_view');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (159,1,'2025-10-22 14:11:59.378062','PermissionButtonAuth_publish');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (160,1,'2025-10-22 14:11:59.378785','PermissionButtonAuth_config');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (161,1,'2025-10-22 14:11:59.379511','PermissionButtonAuth_manage');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (162,1,'2025-10-22 14:11:59.380220','PermissionPageVisibility');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (163,1,'2025-10-22 14:11:59.380881','Tabs');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (164,1,'2025-10-22 14:11:59.381678','TablesBasic');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (165,1,'2025-10-22 14:11:59.382252','Tables');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (166,1,'2025-10-22 14:11:59.382861','Forms');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (167,1,'2025-10-22 14:11:59.383430','SearchBar');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (168,1,'2025-10-22 14:11:59.384010','TablesTree');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (169,1,'2025-10-22 14:11:59.386854','System');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (170,1,'2025-10-22 14:11:59.390774','User');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (171,1,'2025-10-22 14:11:59.392527','Role');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (172,1,'2025-10-22 14:11:59.393944','UserCenter');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (173,1,'2025-10-22 14:11:59.394817','Menus');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (174,1,'2025-10-22 14:11:59.396199','Menus_add');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (175,1,'2025-10-22 14:11:59.397420','Menus_edit');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (176,1,'2025-10-22 14:11:59.398206','Menus_delete');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (177,1,'2025-10-22 14:11:59.399038','Department');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (178,1,'2025-10-22 14:11:59.399760','Employee');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (179,1,'2025-10-22 14:11:59.400920','Article');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (180,1,'2025-10-22 14:11:59.405906','ArticleList');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (181,1,'2025-10-22 14:11:59.408379','ArticleList_add');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (182,1,'2025-10-22 14:11:59.409514','ArticleList_edit');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (183,1,'2025-10-22 14:11:59.410854','ArticleDetail');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (184,1,'2025-10-22 14:11:59.411549','ArticleComment');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (185,1,'2025-10-22 14:11:59.412196','ArticlePublish');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (186,1,'2025-10-22 14:11:59.412781','ArticlePublish_add');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (187,1,'2025-10-22 14:11:59.413380','Result');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (188,1,'2025-10-22 14:11:59.414914','ResultSuccess');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (189,1,'2025-10-22 14:11:59.415769','ResultFail');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (190,1,'2025-10-22 14:11:59.416553','Exception');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (191,1,'2025-10-22 14:11:59.417813','403');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (192,1,'2025-10-22 14:11:59.424235','404');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (193,1,'2025-10-22 14:11:59.426493','500');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (194,1,'2025-10-22 14:11:59.428627','Safeguard');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (195,1,'2025-10-22 14:11:59.431132','SafeguardServer');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (196,3,'2025-10-22 14:12:10.199522','Dashboard');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (197,3,'2025-10-22 14:12:10.205734','Console');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (198,3,'2025-10-22 14:12:10.208062','Analysis');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (199,3,'2025-10-22 14:12:10.209702','Customer');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (200,3,'2025-10-22 14:12:10.211031','CustomerList');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (201,3,'2025-10-22 14:12:10.211944','CustomerList_edit');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (202,3,'2025-10-22 14:12:10.212956','CustomerList_delete');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (203,3,'2025-10-22 14:12:10.213898','Opportunity');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (204,3,'2025-10-22 14:12:10.214904','OpportunityList');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (205,3,'2025-10-22 14:12:10.215812','OpportunityFollow');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (206,3,'2025-10-22 14:12:10.217239','Product');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (207,3,'2025-10-22 14:12:10.222100','ProductCategory');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (208,3,'2025-10-22 14:12:10.225015','ProductCategory_add');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (209,3,'2025-10-22 14:12:10.226470','ProductCategory_edit');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (210,3,'2025-10-22 14:12:10.227854','ProductCategory_delete');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (211,3,'2025-10-22 14:12:10.229677','ProductManagement');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (212,3,'2025-10-22 14:12:10.230841','ProductManagement_add');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (213,3,'2025-10-22 14:12:10.231703','ProductManagement_edit');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (214,3,'2025-10-22 14:12:10.232448','ProductManagement_delete');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (215,3,'2025-10-22 14:12:10.233529','Clue');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (216,3,'2025-10-22 14:12:10.235209','ClueLeads');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (217,3,'2025-10-22 14:12:10.239534','ClueLeads_add');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (218,3,'2025-10-22 14:12:10.241437','ClueLeads_import');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (219,3,'2025-10-22 14:12:10.242647','ClueLeads_export');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (220,3,'2025-10-22 14:12:10.243306','ClueLeads_view');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (221,3,'2025-10-22 14:12:10.243863','Template');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (222,3,'2025-10-22 14:12:10.244530','Cards');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (223,3,'2025-10-22 14:12:10.245105','Banners');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (224,3,'2025-10-22 14:12:10.245735','Charts');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (225,3,'2025-10-22 14:12:10.246336','Map');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (226,3,'2025-10-22 14:12:10.246975','Chat');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (227,3,'2025-10-22 14:12:10.247503','Calendar');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (228,3,'2025-10-22 14:12:10.248153','Pricing');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (229,3,'2025-10-22 14:12:10.248697','Widgets');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (230,3,'2025-10-22 14:12:10.249254','IconList');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (231,3,'2025-10-22 14:12:10.249827','IconSelector');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (232,3,'2025-10-22 14:12:10.250370','ImageCrop');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (233,3,'2025-10-22 14:12:10.253122','Excel');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (234,3,'2025-10-22 14:12:10.256725','Video');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (235,3,'2025-10-22 14:12:10.259396','CountTo');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (236,3,'2025-10-22 14:12:10.261046','WangEditor');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (237,3,'2025-10-22 14:12:10.262360','Watermark');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (238,3,'2025-10-22 14:12:10.263629','ContextMenu');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (239,3,'2025-10-22 14:12:10.264960','Qrcode');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (240,3,'2025-10-22 14:12:10.266094','Drag');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (241,3,'2025-10-22 14:12:10.268909','TextScroll');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (242,3,'2025-10-22 14:12:10.273108','Fireworks');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (243,3,'2025-10-22 14:12:10.274766','ElementUI');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (244,3,'2025-10-22 14:12:10.275970','Examples');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (245,3,'2025-10-22 14:12:10.277068','Permission');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (246,3,'2025-10-22 14:12:10.278516','PermissionSwitchRole');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (247,3,'2025-10-22 14:12:10.279961','PermissionButtonAuth');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (248,3,'2025-10-22 14:12:10.281321','PermissionButtonAuth_add');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (249,3,'2025-10-22 14:12:10.282768','PermissionButtonAuth_edit');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (250,3,'2025-10-22 14:12:10.283655','PermissionButtonAuth_delete');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (251,3,'2025-10-22 14:12:10.286568','PermissionButtonAuth_export');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (252,3,'2025-10-22 14:12:10.292235','PermissionButtonAuth_view');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (253,3,'2025-10-22 14:12:10.293466','PermissionButtonAuth_publish');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (254,3,'2025-10-22 14:12:10.294581','PermissionButtonAuth_config');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (255,3,'2025-10-22 14:12:10.295457','PermissionButtonAuth_manage');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (256,3,'2025-10-22 14:12:10.296081','PermissionPageVisibility');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (257,3,'2025-10-22 14:12:10.296668','Tabs');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (258,3,'2025-10-22 14:12:10.297234','TablesBasic');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (259,3,'2025-10-22 14:12:10.298915','Tables');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (260,3,'2025-10-22 14:12:10.299966','Forms');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (261,3,'2025-10-22 14:12:10.300743','SearchBar');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (262,3,'2025-10-22 14:12:10.304534','TablesTree');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (263,3,'2025-10-22 14:12:10.306876','System');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (264,3,'2025-10-22 14:12:10.308637','User');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (265,3,'2025-10-22 14:12:10.309668','Role');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (266,3,'2025-10-22 14:12:10.310496','UserCenter');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (267,3,'2025-10-22 14:12:10.311313','Menus');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (268,3,'2025-10-22 14:12:10.312559','Menus_add');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (269,3,'2025-10-22 14:12:10.313756','Menus_edit');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (270,3,'2025-10-22 14:12:10.314866','Menus_delete');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (271,3,'2025-10-22 14:12:10.315977','Department');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (272,3,'2025-10-22 14:12:10.316964','Employee');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (273,3,'2025-10-22 14:12:10.320886','Article');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (274,3,'2025-10-22 14:12:10.324499','ArticleList');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (275,3,'2025-10-22 14:12:10.326577','ArticleList_add');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (276,3,'2025-10-22 14:12:10.328159','ArticleList_edit');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (277,3,'2025-10-22 14:12:10.329824','ArticleDetail');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (278,3,'2025-10-22 14:12:10.331855','ArticleComment');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (279,3,'2025-10-22 14:12:10.332836','ArticlePublish');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (280,3,'2025-10-22 14:12:10.333764','ArticlePublish_add');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (281,3,'2025-10-22 14:12:10.336802','Result');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (282,3,'2025-10-22 14:12:10.339862','ResultSuccess');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (283,3,'2025-10-22 14:12:10.340724','ResultFail');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (284,3,'2025-10-22 14:12:10.341633','Exception');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (285,3,'2025-10-22 14:12:10.342519','403');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (286,3,'2025-10-22 14:12:10.343475','404');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (287,3,'2025-10-22 14:12:10.344467','500');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (288,3,'2025-10-22 14:12:10.345761','Safeguard');
INSERT INTO `role_permissions` (`id`, `roleId`, `createdAt`, `permissionKey`) VALUES (289,3,'2025-10-22 14:12:10.346938','SafeguardServer');
/*!40000 ALTER TABLE `role_permissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `roles`
--

DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `roles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `roleCode` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `enabled` tinyint NOT NULL DEFAULT '1',
  `createTime` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updateTime` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `roleName` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_6da95e99c706be73a6a4ba0c96` (`roleCode`),
  UNIQUE KEY `uniq_role_code` (`roleCode`)
) ENGINE=InnoDB AUTO_INCREMENT=27 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `roles`
--

LOCK TABLES `roles` WRITE;
/*!40000 ALTER TABLE `roles` DISABLE KEYS */;
INSERT INTO `roles` (`id`, `roleCode`, `description`, `enabled`, `createTime`, `updateTime`, `roleName`) VALUES (1,'R_ADMIN','绯荤粺绠＄悊鏉冮檺锛屽彲璁块棶绠＄悊妯″潡',1,'2025-10-16 16:11:20.419006','2025-10-22 10:00:29.000000','绠＄悊鍛?);
INSERT INTO `roles` (`id`, `roleCode`, `description`, `enabled`, `createTime`, `updateTime`, `roleName`) VALUES (3,'R_SUPER','绯荤粺鏈€楂樻潈闄愶紝鍙闂墍鏈夋ā鍧?,1,'2025-10-22 09:53:10.037364','2025-10-22 09:53:10.037364','瓒呯骇绠＄悊鍛?);
INSERT INTO `roles` (`id`, `roleCode`, `description`, `enabled`, `createTime`, `updateTime`, `roleName`) VALUES (8,'R_SALES','閿€鍞浉鍏虫潈闄?,1,'2025-10-22 09:53:10.059230','2025-10-22 09:53:10.059230','閿€鍞笓鍛?);
INSERT INTO `roles` (`id`, `roleCode`, `description`, `enabled`, `createTime`, `updateTime`, `roleName`) VALUES (9,'R_SALES_MANAGER','閿€鍞鐞嗙浉鍏虫潈闄?,1,'2025-10-22 09:53:10.065374','2025-10-22 09:53:10.065374','閿€鍞粡鐞?);
INSERT INTO `roles` (`id`, `roleCode`, `description`, `enabled`, `createTime`, `updateTime`, `roleName`) VALUES (10,'R_FRONT_DESK','鍓嶅彴鎺ュ緟鐩稿叧鏉冮檺',1,'2025-10-22 09:53:10.069061','2025-10-22 09:53:10.069061','鍓嶅彴');
INSERT INTO `roles` (`id`, `roleCode`, `description`, `enabled`, `createTime`, `updateTime`, `roleName`) VALUES (11,'R_APPOINTMENT','棰勭害绠＄悊鐩稿叧鏉冮檺',1,'2025-10-22 09:53:10.072791','2025-10-22 10:20:44.000000','閭€绾︿笓鍛?);
INSERT INTO `roles` (`id`, `roleCode`, `description`, `enabled`, `createTime`, `updateTime`, `roleName`) VALUES (12,'R_STORE_DIRECTOR','闂ㄥ簵鎬荤洃鐩稿叧鏉冮檺',1,'2025-10-22 09:53:10.075954','2025-10-22 09:53:10.075954','闂ㄥ簵鎬荤洃');
INSERT INTO `roles` (`id`, `roleCode`, `description`, `enabled`, `createTime`, `updateTime`, `roleName`) VALUES (13,'R_STORE_MANAGER','闂ㄥ簵绠＄悊鐩稿叧鏉冮檺',1,'2025-10-22 09:53:10.080408','2025-10-22 09:53:10.080408','闂ㄥ簵缁忕悊');
INSERT INTO `roles` (`id`, `roleCode`, `description`, `enabled`, `createTime`, `updateTime`, `roleName`) VALUES (14,'R_REGION_GM','鍖哄煙绠＄悊鐩稿叧鏉冮檺',1,'2025-10-22 09:53:10.083545','2025-10-22 09:53:10.083545','鍖哄煙鎬荤粡鐞?);
INSERT INTO `roles` (`id`, `roleCode`, `description`, `enabled`, `createTime`, `updateTime`, `roleName`) VALUES (15,'R_BRAND_GM','鍝佺墝绠＄悊鐩稿叧鏉冮檺',1,'2025-10-22 09:53:10.085481','2025-10-22 09:53:10.085481','鍝佺墝鎬荤粡鐞?);
/*!40000 ALTER TABLE `roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` (`id`, `userName`, `passwordHash`, `roles`, `enabled`, `createdAt`, `updatedAt`, `employeeId`) VALUES (1,'Admin','$2b$10$aUiBMaWjfb5ie6eBGUjGVuoJbNxqZz8.JUtr0hsenuzrhuHDQJYBm','[\"R_ADMIN\",\"R_SUPER\"]',1,'2025-10-15 17:08:36.500841','2025-10-15 17:08:36.500841',NULL);
INSERT INTO `users` (`id`, `userName`, `passwordHash`, `roles`, `enabled`, `createdAt`, `updatedAt`, `employeeId`) VALUES (12,'ccc1','$2b$10$li/rKIZq62lCNhN6utK2ouvYnkC1GlI63NpKihvh6GrpN8wA7FW46','[\"R_USER\",\"R_STORE_MANAGER\"]',1,'2025-10-20 14:39:28.863365','2025-10-20 14:39:28.863365',NULL);
INSERT INTO `users` (`id`, `userName`, `passwordHash`, `roles`, `enabled`, `createdAt`, `updatedAt`, `employeeId`) VALUES (13,'鍛樺伐1','$2b$10$x8vxzh5yxiVHu.8gO93.y.pAW6Ry8pVJC5s.x9pLxZRd3iB1PaE4a','[\"R_USER\",\"R_SALES\"]',1,'2025-10-20 15:01:21.270213','2025-10-20 15:01:21.270213',NULL);
INSERT INTO `users` (`id`, `userName`, `passwordHash`, `roles`, `enabled`, `createdAt`, `updatedAt`, `employeeId`) VALUES (14,'鍛樺伐111','$2b$10$lYfHL/OzWYew7tYhSFis2ObNyPayz8LZs.Cmbp38sPYWJ7EHPWSYK','[\"R_USER\",\"R_SALES\"]',1,'2025-10-20 15:02:42.681829','2025-10-20 15:02:42.681829',NULL);
INSERT INTO `users` (`id`, `userName`, `passwordHash`, `roles`, `enabled`, `createdAt`, `updatedAt`, `employeeId`) VALUES (15,'鍛樺伐1111','$2b$10$zAYIAYgb8Y5yos9az2y/H.2fNo/dohf03X9xgFABbNQ817etWHbtG','[\"R_USER\",\"R_STORE_MANAGER\"]',1,'2025-10-20 15:07:31.960765','2025-10-20 15:07:31.960765',NULL);
INSERT INTO `users` (`id`, `userName`, `passwordHash`, `roles`, `enabled`, `createdAt`, `updatedAt`, `employeeId`) VALUES (16,'z-test-1760944244962','$2b$10$/6Z33deaCRcX8Ew6rKKY9.AJib5624nnPuNagDgr2RwTJoalGp23a','[\"R_USER\",\"R_STORE_MANAGER\"]',1,'2025-10-20 15:10:45.057477','2025-10-20 15:10:45.057477',NULL);
INSERT INTO `users` (`id`, `userName`, `passwordHash`, `roles`, `enabled`, `createdAt`, `updatedAt`, `employeeId`) VALUES (17,'寮犱粰浠?,'$2b$10$LnKIVeyVNXa6SeESd7.gU.8ShtSnTO2xSNA3X40vMo0lEziPayBIO','[\"R_USER\",\"R_STORE_MANAGER\"]',1,'2025-10-21 14:49:37.199106','2025-10-21 14:49:37.199106',29);
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping routines for database 'hxms_dev'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-10-28 10:16:38

