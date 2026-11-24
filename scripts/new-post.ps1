<#
.SYNOPSIS
    在 Holly Sunrise 站点里同时创建中文和英文两个版本的草稿。

.DESCRIPTION
    双语博客最容易出错的地方是「两篇文章的 translationKey 不一致」——
    不一致时 Hugo 不会把它们认成同一篇，页面上的中英切换会消失，
    hreflang 也不会互相指向。这个脚本保证两边写的是同一个 key。

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File scripts\new-post.ps1 `
        -Slug "hugo-multilingual-gotchas" `
        -TitleZh "Hugo 多语言配置里最容易踩的五个坑" `
        -TitleEn "Five Gotchas in Hugo Multilingual Setup" `
        -Tags "hugo","seo"

.EXAMPLE
    # 只写中文，之后补英文（英文文件会一并创建，留着慢慢填）
    scripts\new-post.ps1 -Slug "why-i-blog" -TitleZh "我为什么还在写博客" -TitleEn "Why I Still Blog"
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true, HelpMessage = "URL 用的短名，只能是字母数字和连字符，例如 hugo-seo-tips")]
    [ValidatePattern('^[a-z0-9]+(-[a-z0-9]+)*$')]
    [string]$Slug,

    [Parameter(Mandatory = $true)]
    [string]$TitleZh,

    [Parameter(Mandatory = $true)]
    [string]$TitleEn,

    [string[]]$Tags = @(),

    # 中文标签也允许单独指定，不填就跟 -Tags 一样
    [string[]]$TagsZh = @(),

    # 默认建草稿，确认要发时把 draft 改成 false
    [bool]$Draft = $true
)

$ErrorActionPreference = "Stop"

# 兼容两种传参：-Tags "a","b"（PowerShell 原生）
# 以及 powershell -File 调用时被合并成 "a,b" 一个字符串的情况
function Normalize-Tags([string[]]$raw) {
    if ($null -eq $raw) { return @() }
    return @($raw -split ',' | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne '' })
}

$Tags = Normalize-Tags $Tags
$TagsZh = Normalize-Tags $TagsZh

# 站点根目录 = 本脚本所在目录的上一级
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$date = Get-Date -Format "yyyy-MM-ddTHH:mm:sszzz"

if ($TagsZh.Count -eq 0) { $TagsZh = $Tags }

function Format-YamlList([string[]]$items) {
    if ($null -eq $items -or $items.Count -eq 0) { return "[]" }
    return "[" + (($items | ForEach-Object { '"' + $_ + '"' }) -join ", ") + "]"
}

function New-PostFile {
    param([string]$Lang, [string]$Title, [string[]]$TagList)

    $content = @"
---
title: "$Title"
date: $date
draft: $($Draft.ToString().ToLower())
# 双语对应关系：中英两版必须写同一个值，否则不会互相识别
translationKey: "$Slug"
slug: "$Slug"
summary: ""
tags: $(Format-YamlList $TagList)
categories: []
keywords: []
ShowToc: true
TocOpen: false
---

<!-- 开头 2-3 句直接回答标题里的问题，别铺垫。 -->

## 

"@

    $path = Join-Path $root "content/$Lang/posts/$Slug.md"
    $dir = Split-Path -Parent $path
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
    if (Test-Path $path) { throw "文件已存在：$path（换个 -Slug，别覆盖已有文章）" }

    # 必须用 UTF8 无 BOM，否则中文 front matter 会被 Hugo 当成 YAML 语法错误
    [System.IO.File]::WriteAllText($path, $content, (New-Object System.Text.UTF8Encoding($false)))
    Write-Host "  已创建  $path" -ForegroundColor Green
}

Write-Host "`n创建文章：$Slug" -ForegroundColor Cyan
New-PostFile -Lang "zh" -Title $TitleZh -TagList $TagsZh
New-PostFile -Lang "en" -Title $TitleEn -TagList $Tags

Write-Host "`n下一步：" -ForegroundColor Cyan
Write-Host "  1. 打开上面两个文件，把正文写进去（现在只有空的小节标题）"
Write-Host "  2. 本地预览：  hugo server -D"
Write-Host "  3. 满意后把 front matter 里的 draft: true 改成 false"
Write-Host "  4. 发布：      git add -A; git commit -m `"post: $Slug`"; git push`n"
