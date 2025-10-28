# 云服务器文件上传指南

## 📋 需要上传的文件

- `hxms_dev_full_backup.sql` - 数据库备份文件 (约几MB)
- `cloud_migration_script.sql` - 数据清理脚本 (约2KB)
- `complete_migration_guide.md` - 迁移指南 (约10KB)
- `quick_migration.sh` - 一键迁移脚本 (约5KB)

## 🚀 上传方法

### 方法一：使用SCP命令 (推荐)

#### Windows用户 (使用PowerShell或Git Bash)

```bash
# 单个文件上传
scp hxms_dev_full_backup.sql username@your-server-ip:/path/to/destination/

# 批量上传所有文件
scp *.sql *.md *.sh username@your-server-ip:/home/username/migration/
```

#### Linux/Mac用户

```bash
# 创建目标目录
ssh username@your-server-ip "mkdir -p /home/username/migration"

# 上传所有文件
scp hxms_dev_full_backup.sql cloud_migration_script.sql complete_migration_guide.md quick_migration.sh username@your-server-ip:/home/username/migration/

# 设置脚本执行权限
ssh username@your-server-ip "chmod +x /home/username/migration/quick_migration.sh"
```

### 方法二：使用自动化脚本

```bash
# 给脚本执行权限 (Linux/Mac)
chmod +x upload_to_server.sh

# 运行上传脚本
./upload_to_server.sh
```

### 方法三：使用SFTP

```bash
# 连接到服务器
sftp username@your-server-ip

# 创建目录
mkdir migration
cd migration

# 上传文件
put hxms_dev_full_backup.sql
put cloud_migration_script.sql
put complete_migration_guide.md
put quick_migration.sh

# 退出
quit
```

### 方法四：使用rsync (推荐大文件)

```bash
# 同步所有文件
rsync -avz --progress *.sql *.md *.sh username@your-server-ip:/home/username/migration/
```

### 方法五：使用FTP客户端 (图形界面)

#### 推荐的FTP客户端：

- **FileZilla** (免费，跨平台)
- **WinSCP** (Windows)
- **Cyberduck** (Mac)

#### 连接信息：

- 协议：SFTP
- 主机：你的云服务器IP
- 端口：22 (默认SSH端口)
- 用户名：你的服务器用户名
- 密码：你的服务器密码

## 🔧 Windows用户特别说明

### 使用PowerShell

```powershell
# 如果没有scp命令，可以使用以下方法安装OpenSSH
# 1. 通过Windows功能安装
# 设置 -> 应用 -> 可选功能 -> 添加功能 -> OpenSSH客户端

# 2. 或使用Chocolatey安装
# choco install openssh

# 上传文件
scp .\hxms_dev_full_backup.sql username@your-server-ip:/home/username/migration/
```

### 使用Git Bash (推荐)

```bash
# Git Bash自带SSH工具，可以直接使用scp命令
scp hxms_dev_full_backup.sql username@your-server-ip:/home/username/migration/
```

## 📁 推荐的服务器目录结构

```
/home/username/
└── migration/
    ├── hxms_dev_full_backup.sql
    ├── cloud_migration_script.sql
    ├── complete_migration_guide.md
    └── quick_migration.sh
```

## 🔐 SSH密钥认证 (可选但推荐)

### 生成SSH密钥

```bash
# 生成密钥对
ssh-keygen -t rsa -b 4096 -C "your_email@example.com"

# 复制公钥到服务器
ssh-copy-id username@your-server-ip
```

### 使用密钥上传 (无需输入密码)

```bash
scp -i ~/.ssh/id_rsa *.sql *.md *.sh username@your-server-ip:/home/username/migration/
```

## ⚡ 快速上传命令 (复制即用)

### 一键上传所有文件

```bash
# 替换 username 和 your-server-ip
SERVER_USER="username"
SERVER_IP="your-server-ip"
TARGET_DIR="/home/$SERVER_USER/migration"

# 创建目录并上传文件
ssh $SERVER_USER@$SERVER_IP "mkdir -p $TARGET_DIR"
scp hxms_dev_full_backup.sql cloud_migration_script.sql complete_migration_guide.md quick_migration.sh $SERVER_USER@$SERVER_IP:$TARGET_DIR/
ssh $SERVER_USER@$SERVER_IP "chmod +x $TARGET_DIR/quick_migration.sh"

echo "上传完成！可以登录服务器执行迁移了："
echo "ssh $SERVER_USER@$SERVER_IP 'cd $TARGET_DIR && ./quick_migration.sh'"
```

## 🚨 常见问题解决

### 1. 权限被拒绝

```bash
# 确保有正确的SSH访问权限
ssh username@your-server-ip

# 检查目标目录权限
ls -la /home/username/
```

### 2. 文件太大上传慢

```bash
# 使用压缩上传
tar -czf migration_files.tar.gz *.sql *.md *.sh
scp migration_files.tar.gz username@your-server-ip:/home/username/
ssh username@your-server-ip "cd /home/username && tar -xzf migration_files.tar.gz"
```

### 3. 网络不稳定

```bash
# 使用rsync断点续传
rsync -avz --partial --progress *.sql *.md *.sh username@your-server-ip:/home/username/migration/
```

### 4. Windows没有scp命令

- 安装Git for Windows (推荐)
- 使用WinSCP图形界面工具
- 启用Windows的OpenSSH功能

## ✅ 上传完成检查清单

- [ ] 所有4个文件都已上传
- [ ] quick_migration.sh有执行权限
- [ ] 可以SSH登录到服务器
- [ ] 文件在正确的目录中
- [ ] 文件大小正确 (hxms_dev_full_backup.sql应该是最大的)

## 🎯 下一步操作

上传完成后，登录云服务器执行迁移：

```bash
ssh username@your-server-ip
cd /home/username/migration
ls -la  # 确认文件存在
./quick_migration.sh  # 执行一键迁移
```
