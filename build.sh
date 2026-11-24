#!/usr/bin/env bash
# Cloudflare Pages 构建脚本
#
# 为什么需要它：Pages 的构建镜像自带一个默认 Hugo（当前是 0.147.7），
# 而 PaperMod 要求 >= 0.158。官方建议用 HUGO_VERSION 环境变量覆盖，
# 但那个变量的生效与否取决于构建镜像的实现，出问题时构建日志里只会
# 留下一句 "not compatible with this Hugo version"，很难定位。
#
# 这个脚本把版本控制放回仓库里：自己下载指定版本的 Hugo Extended，
# 用它构建。Cloudflare 上的默认版本是多少都不影响结果。
#
# 用法（Cloudflare Pages 的 Build command 里填）：
#   bash build.sh
#
# 本地正常构建不需要它，直接用 hugo --gc --minify 即可。

set -euo pipefail

# 想换 Hugo 版本只改这一行；也可以用 HUGO_VERSION 环境变量覆盖。
# 允许写成 "0.170.1"、"extended_0.170.1" 或 "v0.170.1"。
HUGO_VERSION="${HUGO_VERSION:-0.170.1}"
HUGO_VERSION="${HUGO_VERSION#extended_}"
HUGO_VERSION="${HUGO_VERSION#v}"

BIN_DIR="$PWD/.hugo-bin"
HUGO_BIN="$BIN_DIR/hugo"

if [ ! -x "$HUGO_BIN" ]; then
  URL="https://github.com/gohugoio/hugo/releases/download/v${HUGO_VERSION}/hugo_extended_${HUGO_VERSION}_linux-amd64.tar.gz"
  echo "==> 下载 Hugo Extended ${HUGO_VERSION}"
  echo "    ${URL}"
  mkdir -p "$BIN_DIR"
  curl -fsSL --retry 3 --retry-delay 2 --connect-timeout 20 "$URL" -o /tmp/hugo.tar.gz
  tar -xzf /tmp/hugo.tar.gz -C "$BIN_DIR" hugo
  chmod +x "$HUGO_BIN"
else
  echo "==> 复用已下载的 Hugo（${BIN_DIR}）"
fi

echo "==> 实际使用的版本："
"$HUGO_BIN" version

echo "==> 开始构建"
exec "$HUGO_BIN" --gc --minify "$@"
