USE hxms_dev;
SET FOREIGN_KEY_CHECKS=0;
-- MySQL dump 10.13  Distrib 8.0.43, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: hxms_dev
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
-- Dumping data for table `product_categories`
--

LOCK TABLES `product_categories` WRITE;
/*!40000 ALTER TABLE `product_categories` DISABLE KEYS */;
INSERT INTO `product_categories` (`id`, `parentId`, `name`, `slug`, `path`, `level`, `sortOrder`, `status`, `createdAt`, `updatedAt`) VALUES (11,0,'灏忛箯','XPENG01','',0,1,'active','2025-10-23 14:22:26.215824','2025-10-23 14:22:26.215824');
INSERT INTO `product_categories` (`id`, `parentId`, `name`, `slug`, `path`, `level`, `sortOrder`, `status`, `createdAt`, `updatedAt`) VALUES (13,11,'NEV','XPENG01001','/11',1,1,'active','2025-10-23 14:35:26.885490','2025-10-23 14:35:26.885490');
/*!40000 ALTER TABLE `product_categories` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-10-28 14:48:18
-- MySQL dump 10.13  Distrib 8.0.43, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: hxms_dev
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
-- Dumping data for table `product_models`
--

LOCK TABLES `product_models` WRITE;
/*!40000 ALTER TABLE `product_models` DISABLE KEYS */;
INSERT INTO `product_models` (`id`, `name`, `brand`, `series`, `createdAt`, `updatedAt`, `price`, `status`, `sales`, `engineType`) VALUES (6,'p711','灏忛箯','NEV','2025-10-23 16:18:52.842740','2025-10-24 10:45:31.000000',0.00,0,0,'NEV');
INSERT INTO `product_models` (`id`, `name`, `brand`, `series`, `createdAt`, `updatedAt`, `price`, `status`, `sales`, `engineType`) VALUES (7,'p7+','灏忛箯','NEV','2025-10-23 17:52:53.796450','2025-10-24 10:34:59.000000',0.00,1,0,'NEV');
/*!40000 ALTER TABLE `product_models` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-10-28 14:48:18
-- MySQL dump 10.13  Distrib 8.0.43, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: hxms_dev
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
-- Dumping data for table `product_category_links`
--

LOCK TABLES `product_category_links` WRITE;
/*!40000 ALTER TABLE `product_category_links` DISABLE KEYS */;
INSERT INTO `product_category_links` (`id`, `productId`, `categoryId`, `createdAt`, `updatedAt`) VALUES (32,6,13,'2025-10-24 10:34:55.213670','2025-10-24 10:34:55.213670');
INSERT INTO `product_category_links` (`id`, `productId`, `categoryId`, `createdAt`, `updatedAt`) VALUES (33,7,13,'2025-10-24 10:34:59.285253','2025-10-24 10:34:59.285253');
/*!40000 ALTER TABLE `product_category_links` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-10-28 14:48:18
-- MySQL dump 10.13  Distrib 8.0.43, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: hxms_dev
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
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-10-28 14:48:17
-- MySQL dump 10.13  Distrib 8.0.43, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: hxms_dev
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
-- Dumping data for table `clues`
--

LOCK TABLES `clues` WRITE;
/*!40000 ALTER TABLE `clues` DISABLE KEYS */;
INSERT INTO `clues` (`id`, `visitDate`, `enterTime`, `leaveTime`, `receptionDuration`, `visitorCount`, `receptionStatus`, `salesConsultant`, `customerName`, `customerPhone`, `visitPurpose`, `isReserved`, `visitCategory`, `focusModelId`, `focusModelName`, `testDrive`, `bargaining`, `dealDone`, `dealModelId`, `dealModelName`, `businessSource`, `channelCategory`, `channelLevel1`, `channelLevel2`, `convertOrRetentionModel`, `referrer`, `contactTimes`, `opportunityLevel`, `userGender`, `userAge`, `buyExperience`, `userPhoneModel`, `currentBrand`, `currentModel`, `carAge`, `mileage`, `livingArea`, `brandId`, `regionId`, `storeId`, `departmentId`, `createdBy`, `createdAt`, `updatedAt`, `customerId`, `channelId`) VALUES (1,'2025-10-01','12:03','19:03',420,1,'none','','韪╄俯韪?,'11526037522','鐪嬭溅',0,'棣栨',NULL,'',0,0,0,NULL,'','鑷劧鍒板簵','绾夸笂','DCC/ADC鍒板簵','DCC/ADC(鎳傝溅甯濓級','','',1,'A','鐢?,15,'棣栬喘','鍏朵粬','','',0,0.00,'杈藉畞鐪?鎶氶『甯?鎶氶『鍘?,6,9,11,NULL,NULL,'2025-10-23 12:03:58.578387','2025-10-23 12:03:58.578387',1,3);
/*!40000 ALTER TABLE `clues` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-10-28 14:48:18
-- MySQL dump 10.13  Distrib 8.0.43, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: hxms_dev
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
-- Dumping data for table `customers`
--

LOCK TABLES `customers` WRITE;
/*!40000 ALTER TABLE `customers` DISABLE KEYS */;
INSERT INTO `customers` (`id`, `name`, `phone`, `gender`, `age`, `buyExperience`, `phoneModel`, `currentBrand`, `currentModel`, `carAge`, `mileage`, `livingArea`, `createdAt`, `updatedAt`) VALUES (1,'韪╄俯韪?,'11526037522','鐢?,15,'棣栬喘','鍏朵粬',NULL,NULL,0,0.00,'杈藉畞鐪?鎶氶『甯?鎶氶『鍘?,'2025-10-23 12:03:58.563999','2025-10-23 12:03:58.563999');
/*!40000 ALTER TABLE `customers` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-10-28 14:48:18
SET FOREIGN_KEY_CHECKS=1;
