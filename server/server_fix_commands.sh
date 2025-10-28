#!/bin/bash

# 云服务器一键修复脚本
# 解决Git冲突和数据导入问题

echo "=========================================="
echo "云服务器一键修复脚本"
echo "=========================================="

# 步骤1: 解决Git冲突
echo "步骤1: 解决Git冲突..."
echo "备份当前的quick_migration.sh..."
if [ -f "quick_migration.sh" ]; then
    cp quick_migration.sh quick_migration.sh.backup
    echo "✓ 已备份当前脚本"
fi

echo "重置Git状态..."
git reset --hard HEAD
git clean -fd
echo "✓ Git状态已重置"

echo "拉取最新代码..."
git pull origin main
if [ $? -eq 0 ]; then
    echo "✓ 代码拉取成功"
else
    echo "✗ 代码拉取失败"
    exit 1
fi

# 步骤2: 赋予脚本执行权限
echo "步骤2: 赋予脚本执行权限..."
chmod +x quick_migration.sh alternative_import.sh
echo "✓ 脚本权限已设置"

# 步骤3: 检查文件是否存在
echo "步骤3: 检查必要文件..."
if [ ! -f "alternative_import.sh" ]; then
    echo "✗ alternative_import.sh 文件不存在"
    echo "创建替代导入脚本..."
    
    cat > alternative_import.sh << 'EOF'
#!/bin/bash

# 替代数据导入脚本
# 使用多种方法尝试导入数据

DB_USER="root"
DB_NAME="hxms_dev"
BACKUP_FILE="hxms_dev_full_backup.sql"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=========================================="
echo "替代数据导入脚本"
echo "=========================================="

# 获取数据库密码
echo "请输入MySQL密码:"
read -s DB_PASSWORD

# 方法1: 使用sed清理文件后导入
echo -e "${YELLOW}方法1: 清理文件后导入...${NC}"
sed 's/\x0//g' "$BACKUP_FILE" > temp_clean_backup.sql
mysql -u "$DB_USER" -p"$DB_PASSWORD" --default-character-set=utf8mb4 "$DB_NAME" < temp_clean_backup.sql
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ 方法1成功${NC}"
    rm -f temp_clean_backup.sql
    exit 0
else
    echo -e "${RED}✗ 方法1失败${NC}"
fi

# 方法2: 使用source命令
echo -e "${YELLOW}方法2: 使用source命令...${NC}"
mysql -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "source $BACKUP_FILE;"
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ 方法2成功${NC}"
    rm -f temp_clean_backup.sql
    exit 0
else
    echo -e "${RED}✗ 方法2失败${NC}"
fi

# 方法3: 分块导入
echo -e "${YELLOW}方法3: 分块导入...${NC}"
# 分割文件为多个小文件
split -l 50 "$BACKUP_FILE" temp_part_
for part_file in temp_part_*; do
    echo "导入 $part_file..."
    mysql -u "$DB_USER" -p"$DB_PASSWORD" --default-character-set=utf8mb4 "$DB_NAME" < "$part_file"
    if [ $? -ne 0 ]; then
        echo -e "${RED}✗ 导入 $part_file 失败${NC}"
        # 清理临时文件
        rm -f temp_part_* temp_clean_backup.sql
        exit 1
    fi
done
echo -e "${GREEN}✓ 方法3成功${NC}"

# 清理临时文件
rm -f temp_part_* temp_clean_backup.sql

echo "=========================================="
echo "数据导入完成"
echo "=========================================="
EOF
    
    chmod +x alternative_import.sh
    echo "✓ 替代导入脚本已创建"
fi

echo "✓ 所有必要文件已准备就绪"

echo "=========================================="
echo "修复完成！现在可以运行以下命令："
echo "1. ./quick_migration.sh"
echo "2. 如果失败，运行: ./alternative_import.sh"
echo "=========================================="