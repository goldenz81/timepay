# Deploy script with Arabic text
$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$changelog = "إزالة السلفة من المستحقات - إضافة ساعات العمل في مودال تفاصيل الأجر الأسبوعي والشهري"
& ".\create-simple-deploy.ps1" -Changelog $changelog

