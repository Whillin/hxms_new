#!/bin/bash

# ========================================
# 云服务器数据库一键迁移脚本
# 使用方法：chmod +x quick_migration.sh && ./quick_migration.sh
# ========================================

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 配置变量（请根据实际情况修改）
DB_USER="root"
DB_NAME="hxms_dev"
BACKUP_FILE="hxms_dev_full_backup.sql"
CLEANUP_SCRIPT="cloud_migration_script.sql"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}云服务器数据库迁移脚本${NC}"
echo -e "${GREEN}========================================${NC}"

# 检查必要文件是否存在
echo -e "${YELLOW}检查必要文件...${NC}"
if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}错误: 找不到备份文件 $BACKUP_FILE${NC}"
    exit 1
fi

if [ ! -f "$CLEANUP_SCRIPT" ]; then
    echo -e "${RED}错误: 找不到清理脚本 $CLEANUP_SCRIPT${NC}"
    exit 1
fi

echo -e "${GREEN}✓ 所有必要文件已找到${NC}"

# 获取数据库密码
echo -e "${YELLOW}请输入MySQL密码:${NC}"
read -s DB_PASSWORD

# 测试数据库连接
echo -e "${YELLOW}测试数据库连接...${NC}"
mysql -u "$DB_USER" -p"$DB_PASSWORD" -e "USE $DB_NAME;" 2>/dev/null
if [ $? -ne 0 ]; then
    echo -e "${RED}错误: 无法连接到数据库${NC}"
    exit 1
fi
echo -e "${GREEN}✓ 数据库连接成功${NC}"

# 询问是否备份现有数据
echo -e "${YELLOW}是否要备份云服务器现有数据? (y/n):${NC}"
read -r backup_choice
if [[ $backup_choice =~ ^[Yy]$ ]]; then
    backup_filename="cloud_backup_$(date +%Y%m%d_%H%M%S).sql"
    echo -e "${YELLOW}正在备份现有数据到 $backup_filename...${NC}"
    mysqldump -u "$DB_USER" -p"$DB_PASSWORD" --single-transaction --routines --triggers "$DB_NAME" > "$backup_filename"
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ 备份完成: $backup_filename${NC}"
    else
        echo -e "${RED}错误: 备份失败${NC}"
        exit 1
    fi
fi

# 最终确认
echo -e "${RED}警告: 此操作将完全替换云服务器上的所有数据!${NC}"
echo -e "${YELLOW}确认继续? (输入 'YES' 继续):${NC}"
read -r confirm
if [ "$confirm" != "YES" ]; then
    echo -e "${YELLOW}操作已取消${NC}"
    exit 0
fi

# 执行数据清理
echo -e "${YELLOW}正在清理云服务器数据...${NC}"
mysql -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < "$CLEANUP_SCRIPT"
if [ $? -ne 0 ]; then
    echo -e "${RED}错误: 数据清理失败${NC}"
    exit 1
fi
echo -e "${GREEN}✓ 数据清理完成${NC}"

# 导入本地数据
echo -e "${YELLOW}正在导入本地数据...${NC}"
# 使用更安全的导入方式，跳过空行和注释
mysql -u "$DB_USER" -p"$DB_PASSWORD" --default-character-set=utf8mb4 --comments --force "$DB_NAME" < "$BACKUP_FILE"
if [ $? -ne 0 ]; then
    echo -e "${RED}错误: 数据导入失败${NC}"
    exit 1
fi
echo -e "${GREEN}✓ 数据导入完成${NC}"

# 验证数据
echo -e "${YELLOW}正在验证数据...${NC}"
result=$(mysql -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "
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
" 2>/dev/null)

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ 数据验证成功${NC}"
    echo "$result"
else
    echo -e "${RED}警告: 数据验证失败，请手动检查${NC}"
fi

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}数据迁移完成!${NC}"
echo -e "${GREEN}========================================${NC}"

# 清理提示
echo -e "${YELLOW}建议完成以下步骤:${NC}"
echo "1. 测试应用功能是否正常"
echo "2. 检查用户登录是否正常"
echo "3. 验证数据完整性"
if [[ $backup_choice =~ ^[Yy]$ ]]; then
    echo "4. 确认无误后可删除备份文件: $backup_filename"
fi