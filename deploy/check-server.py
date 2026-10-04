import os
#!/usr/bin/env python3
import paramiko, sys

HOST = "185.238.168.123"
USER = "root"
PASSWORD = os.environ.get("SSH_PASSWORD", "")

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, 22, USER, PASSWORD, timeout=15)
print("Connected\n")

def run(cmd):
    _, stdout, stderr = client.exec_command(cmd, timeout=30)
    out = stdout.read().decode("utf-8", errors="replace").strip()
    err = stderr.read().decode("utf-8", errors="replace").strip()
    if out: print(out)
    if err: print("ERR:", err, file=sys.stderr)

print("=== /root contents ===")
run("ls /root/")
print("\n=== PM2 processes ===")
run("pm2 list --no-color 2>/dev/null")
print("\n=== Find mediator app ===")
run("find /root -name 'next.config*' 2>/dev/null | head -10")
print("\n=== Nginx sites ===")
run("ls /etc/nginx/sites-enabled/ 2>/dev/null")
print("\n=== Nginx posred config ===")
run("cat /etc/nginx/sites-enabled/posred-globox.ru 2>/dev/null || cat /etc/nginx/sites-enabled/default 2>/dev/null | head -50")

client.close()
