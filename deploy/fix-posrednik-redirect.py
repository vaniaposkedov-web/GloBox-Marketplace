import re, sys

conf_path = '/etc/nginx/sites-available/glo-box.ru'
with open(conf_path, 'r') as f:
    content = f.read()

old_block = re.search(r'(\s*location /posrednik \{[^}]*\})', content)
if old_block:
    new_block = """
    location /posrednik {
        return 301 https://posred-globox.ru;
    }"""
    content = content.replace(old_block.group(1), new_block)
    with open(conf_path, 'w') as f:
        f.write(content)
    print('REDIRECT_UPDATED_OK')
else:
    print('BLOCK_NOT_FOUND')
