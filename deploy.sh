#!/bin/bash
# 1. 创建带时间戳的备份文件夹
BACKUP_DIR="./backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p $BACKUP_DIR

# 2. 备份所有数据库文件
echo "📦 正在备份数据库到 $BACKUP_DIR..."
cp server/*.db $BACKUP_DIR/

# 3. 拉取新代码
echo "🚚 正在拉取代码..."
git pull

# 4. 检查是否需要更新依赖
# npm install

echo "✅ 部署完成。如果出现问题，备份位于 $BACKUP_DIR"
