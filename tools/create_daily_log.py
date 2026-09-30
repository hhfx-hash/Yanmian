"""创建当日开发日志；已有内容原样保留，不猜测完成事项。"""
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LOG_DIR = ROOT / '开发日志'

def main():
    today = datetime.now().astimezone().date().isoformat()
    LOG_DIR.mkdir(exist_ok=True)
    target = LOG_DIR / f'{today}.md'
    template = (LOG_DIR / '模板.md').read_text(encoding='utf-8')
    try:
        with target.open('x', encoding='utf-8') as handle:
            handle.write(template.replace('{{DATE}}', today))
        print(f'已创建：{target}')
    except FileExistsError:
        print(f'已存在，保留内容：{target}')
    index = LOG_DIR / 'README.md'
    text = index.read_text(encoding='utf-8')
    link = f'- [{today}](./{today}.md)'
    if link not in text:
        index.write_text(text.rstrip() + '\n' + link + '\n', encoding='utf-8')

if __name__ == '__main__':
    main()