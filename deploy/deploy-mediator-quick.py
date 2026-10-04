#!/usr/bin/env python3
"""Quick deploy of changed mediator files to server via paramiko."""

import paramiko
import os
import sys

HOST     = "5.42.127.159"
PORT     = 22
USER     = "root"
PASSWORD = os.environ.get("SSH_PASSWORD", "")
REMOTE   = "/root/marketplace_posrednik"
LOCAL    = r"d:\project_work_frilans\marketplizzzz"

CHANGED_FILES = [
    ("apps/mediator/src/app/orders/page.tsx",     f"{REMOTE}/apps/mediator/src/app/orders/page.tsx"),
    ("apps/mediator/src/app/dashboard/page.tsx",  f"{REMOTE}/apps/mediator/src/app/dashboard/page.tsx"),
    ("apps/mediator/src/components/BottomNav.tsx", f"{REMOTE}/apps/mediator/src/components/BottomNav.tsx"),
]

def run(client, cmd, check=True):
    print(f"  $ {cmd}")
    stdin, stdout, stderr = client.exec_command(cmd, get_pty=True, timeout=300)
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    if out.strip():
        print(out.rstrip())
    if err.strip():
        print(err.rstrip(), file=sys.stderr)
    return out

def main():
    print("\n========================================")
    print("  Quick Mediator Deploy")
    print(f"  -> {HOST}")
    print("========================================\n")

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, PORT, USER, PASSWORD, timeout=15)
    print("OK SSH connected\n")

    sftp = client.open_sftp()

    # Upload changed files
    print("[1/3] Uploading changed files...")
    for local_rel, remote_path in CHANGED_FILES:
        local_path = os.path.join(LOCAL, local_rel.replace("/", os.sep))
        print(f"  ^ {local_rel}")
        sftp.put(local_path, remote_path)
    sftp.close()
    print("OK Files uploaded\n")

    # Build
    print("[2/3] Building mediator (next build)...")
    build_cmd = f"cd {REMOTE}/apps/mediator && npx next build 2>&1 | tail -30"
    run(client, build_cmd)
    print("OK Build done\n")

    # Restart PM2
    print("[3/3] Restarting PM2...")
    run(client, "pm2 restart marketplace-mediator && pm2 save")
    print("OK PM2 restarted\n")

    # PM2 status
    run(client, "pm2 list --no-color 2>/dev/null | grep mediator")

    client.close()
    print("\n========================================")
    print("  DEPLOY COMPLETE!")
    print("  -> https://posred-globox.ru/dashboard")
    print("========================================\n")

if __name__ == "__main__":
    main()
