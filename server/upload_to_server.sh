#!/bin/bash

# ========================================
# 云服务器文件上传脚本
# 使用方法：./upload_to_server.sh
# ========================================

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}云服务器文件上传脚本${NC}"
echo -e "${GREEN}========================================${NC}"

# 获取服务器信息
echo -e "${YELLOW}请输入云服务器信息:${NC}"
read -p "服务器IP地址: " SERVER_IP
read -p "用户名: " USERNAME
read -p "目标目录 (默认: /home/$USERNAME/migration): " TARGET_DIR

# 设置默认目标目录
if [ -z "$TARGET_DIR" ]; then
    TARGET_DIR="/home/$USERNAME/migration"
fi

echo -e "${YELLOW}将要上传到: $USERNAME@$SERVER_IP:$TARGET_DIR${NC}"

# 确认上传
echo -e "${YELLOW}确认上传所有迁移文件? (y/n):${NC}"
read -r confirm
if [[ ! $confirm =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}上传已取消${NC}"
    exit 0
fi

# 检查文件是否存在
files=("hxms_dev_full_backup.sql" "cloud_migration_script.sql" "complete_migration_guide.md" "quick_migration.sh")
missing_files=()

for file in "${files[@]}"; do
    if [ ! -f "$file" ]; then
        missing_files+=("$file")
    fi
done

if [ ${#missing_files[@]} -ne 0 ]; then
    echo -e "${RED}错误: 以下文件不存在:${NC}"
    for file in "${missing_files[@]}"; do
        echo -e "${RED}  - $file${NC}"
    done
    exit 1
fi

echo -e "${GREEN}✓ 所有文件检查完成${NC}"

# 创建目标目录
echo -e "${YELLOW}创建目标目录...${NC}"
ssh "$USERNAME@$SERVER_IP" "mkdir -p $TARGET_DIR"
if [ $? -ne 0 ]; then
    echo -e "${RED}错误: 无法创建目标目录${NC}"
    exit 1
fi

# 上传文件
echo -e "${YELLOW}开始上传文件...${NC}"
for file in "${files[@]}"; do
    echo -e "${YELLOW}上传 $file...${NC}"
    scp "$file" "$USERNAME@$SERVER_IP:$TARGET_DIR/"
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ $file 上传成功${NC}"
    else
        echo -e "${RED}✗ $file 上传失败${NC}"
        exit 1
    fi
done

# 设置脚本执行权限
echo -e "${YELLOW}设置脚本执行权限...${NC}"
ssh "$USERNAME@$SERVER_IP" "chmod +x $TARGET_DIR/quick_migration.sh"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}所有文件上传完成!${NC}"
echo -e "${GREEN}========================================${NC}"

echo -e "${YELLOW}接下来的步骤:${NC}"
echo "1. 登录云服务器: ssh $USERNAME@$SERVER_IP"
echo "2. 进入目录: cd $TARGET_DIR"
echo "3. 查看文件: ls -la"
echo "4. 执行迁移: ./quick_migration.sh"
echo ""
echo -e "${YELLOW}或者直接执行一键迁移:${NC}"
echo "ssh $USERNAME@$SERVER_IP 'cd $TARGET_DIR && ./quick_migration.sh'"