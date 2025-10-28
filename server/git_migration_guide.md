# 通过Git拉取数据库迁移文件指南

## 📋 已上传到Git的文件

✅ `cloud_migration_script.sql` - 数据清理脚本  
✅ `complete_migration_guide.md` - 完整迁移指南  
✅ `quick_migration.sh` - 一键迁移脚本  
✅ `upload_guide.md` - 文件上传指南  
✅ `upload_to_server.sh` - 自动上传脚本  
✅ `hxms_dev_full_backup.sql` - 数据库备份文件 (约134KB)

🎉 **所有文件都已上传到Git，可以直接通过Git拉取获得完整的迁移工具包！**

## 🚀 在云服务器上拉取文件

### 步骤1：登录云服务器

```bash
ssh username@your-server-ip
```

### 步骤2：克隆或拉取最新代码

```bash
# 如果还没有克隆仓库
git clone https://github.com/Whillin/hxms_new.git
cd hxms_new

# 如果已经有仓库，拉取最新更新
cd hxms_new
git pull origin main
```

### 步骤3：进入server目录

```bash
cd server
ls -la *.sql *.md *.sh
```

你应该能看到以下文件：

- `cloud_migration_script.sql`
- `complete_migration_guide.md`
- `quick_migration.sh`
- `upload_guide.md`
- `upload_to_server.sh`

### 步骤4：设置脚本执行权限

```bash
chmod +x quick_migration.sh
chmod +x upload_to_server.sh
```

## 📦 完整的一键迁移流程

现在所有文件都在Git中，你只需要在云服务器上执行以下命令即可完成整个迁移：

```bash
# 1. 克隆或拉取最新代码
git clone https://github.com/Whillin/hxms_new.git
cd hxms_new/server

# 2. 设置执行权限
chmod +x *.sh

# 3. 执行一键迁移
./quick_migration.sh
```

就这么简单！所有迁移文件都会自动从Git获取。

## ✅ 验证文件完整性

```bash
# 检查所有必需文件
ls -la hxms_dev_full_backup.sql cloud_migration_script.sql complete_migration_guide.md quick_migration.sh

# 检查文件大小 (backup文件应该是最大的)
du -h *.sql *.md *.sh
```

## 🎯 执行迁移

所有文件准备好后，执行迁移：

```bash
# 查看迁移指南
cat complete_migration_guide.md

# 执行一键迁移
./quick_migration.sh
```

## 📁 推荐的目录结构

```
/home/username/hxms_new/server/
├── hxms_dev_full_backup.sql          # 需要单独上传
├── cloud_migration_script.sql        # ✅ 已在Git中
├── complete_migration_guide.md       # ✅ 已在Git中
├── quick_migration.sh                 # ✅ 已在Git中
├── upload_guide.md                    # ✅ 已在Git中
└── upload_to_server.sh               # ✅ 已在Git中
```

## 🔄 更新流程

如果迁移脚本有更新，只需要：

```bash
cd /path/to/hxms_new
git pull origin main
cd server
chmod +x *.sh
```

## 💡 优势

- ✅ 版本控制，可以追踪脚本变更
- ✅ 多人协作，团队成员都能获取最新脚本
- ✅ 备份安全，脚本不会丢失
- ✅ 快速部署，一条命令获取所有脚本

## ⚠️ 注意事项

1. **数据库备份文件** (`hxms_dev_full_backup.sql`) 由于包含敏感数据且文件较大，未提交到Git
2. **安全考虑**: 确保Git仓库的访问权限设置正确
3. **网络要求**: 云服务器需要能够访问GitHub
4. **权限设置**: 拉取后记得设置shell脚本的执行权限
