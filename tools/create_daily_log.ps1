param(
    [string]$ProjectRoot = (Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path))
)

$script = Join-Path $ProjectRoot "tools\create_daily_log.py"
python $script
if ($LASTEXITCODE -ne 0) {
    throw "创建每日日志失败，退出码：$LASTEXITCODE"
}
