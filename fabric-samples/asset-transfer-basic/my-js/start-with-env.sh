#!/bin/bash

# RiceTrace 质检报告系统启动脚本
# 设置环境变量并启动服务器

echo "🚀 正在启动 RiceTrace 质检报告系统..."

# 设置环境变量
export SUPABASE_URL="https://pqfhwvalppordzhwhqrl.supabase.co"
export SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxZmh3dmFscHBvcmR6aHdocXJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3MTU4MjgsImV4cCI6MjA2OTI5MTgyOH0.wvx3B1GmFcc3WUsWUEpr8-BIkb69mAvxMk1WD7qrCFE"
export CLOUDFLARE_ACCOUNT_ID="7322b43f6e418f636bbc3fb6cfdfc11a"
export CLOUDFLARE_ACCESS_KEY_ID="f3c667623db7e6826f5dd221b93d09fe"
export CLOUDFLARE_SECRET_ACCESS_KEY="bce324e9e394a1229f86e819915e69191e0b544d570ad7341f97fdfdb3e6536f"
export CLOUDFLARE_BUCKET_NAME="ricetrace"
export NODE_ENV="development"
export PORT="3000"

echo "✅ 环境变量已设置"
echo "📡 Supabase URL: $SUPABASE_URL"
echo "🪣 R2 存储桶: $CLOUDFLARE_BUCKET_NAME"
echo "🌐 端口: $PORT"
echo ""

# 启动服务器
echo "🔥 启动服务器..."
npm start 