#!/usr/bin/env python3
"""Deploy all changed files (API + Web + Mediator) to production."""

import paramiko
import os
import sys

HOST     = "5.42.127.159"
PORT     = 22
USER     = "root"
PASSWORD = os.environ.get("SSH_PASSWORD", "")

REMOTE_MARKET  = "/root/marketplace"
REMOTE_POSRED  = "/root/marketplace_posrednik"
LOCAL          = r"d:\project_work_frilans\marketplizzzz"

# Files that go to /root/marketplace
MARKET_FILES = []

# Migration SQL files (uploaded separately, then migrated)
MIGRATION_FILES = []

# Files that go to /root/marketplace_posrednik
POSRED_FILES = [
    "apps/mediator/src/app/orders/[id]/page.tsx",
]

def safe_print(text, file=None):
    try:
        if file:
            print(text, file=file)
        else:
            print(text)
    except UnicodeEncodeError:
        encoded = text.encode(sys.stdout.encoding or "utf-8", errors="replace").decode(sys.stdout.encoding or "utf-8", errors="replace")
        if file:
            print(encoded, file=file)
        else:
            print(encoded)

def run(client, cmd, check=True, timeout=600):
    safe_print(f"  $ {cmd[:100]}")
    _, stdout, stderr = client.exec_command(cmd, get_pty=True, timeout=timeout)
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    if out.strip():
        safe_print(out.rstrip())
    if err.strip():
        safe_print(err.rstrip(), file=sys.stderr)
    return out

def upload(sftp, local_rel, remote_base):
    local_path  = os.path.join(LOCAL, local_rel.replace("/", os.sep))
    remote_path = f"{remote_base}/{local_rel}"
    print(f"  ^ {local_rel}")
    sftp.put(local_path, remote_path)

def main():
    print()
    print("========================================")
    print("  Deploy API + Web + Mediator")
    print(f"  -> {HOST}")
    print("========================================")
    print()

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, PORT, USER, PASSWORD, timeout=15)
    print("OK SSH connected\n")

    sftp = client.open_sftp()

    # ── Upload marketplace (API + Web) files ──
    print("[1/6] Uploading marketplace files (API + Web)...")
    for f in MARKET_FILES:
        upload(sftp, f, REMOTE_MARKET)
    print("OK Marketplace files uploaded\n")

    # ── Upload migration SQL files ──
    if MIGRATION_FILES:
        print("[1b/6] Uploading migration files...")
        for f in MIGRATION_FILES:
            remote_dir = f"{REMOTE_MARKET}/{'/'.join(f.split('/')[:-1])}"
            run(client, f"mkdir -p {remote_dir}")
            upload(sftp, f, REMOTE_MARKET)
        print("OK Migration files uploaded\n")

    # ── Upload posrednik (Mediator) files ──
    print("[2/6] Uploading mediator files...")
    # Create directories that might not exist on the remote (e.g. [id])
    mediator_dirs = set()
    for f in POSRED_FILES:
        parts = f.split("/")[:-1]
        if parts:
            mediator_dirs.add("/".join(parts))
    for d in sorted(mediator_dirs):
        run(client, f"mkdir -p '{REMOTE_POSRED}/{d}'")
    for f in POSRED_FILES:
        upload(sftp, f, REMOTE_POSRED)
    print("OK Mediator files uploaded\n")

    sftp.close()

    build_api      = any(f.startswith("apps/api/")      for f in MARKET_FILES)
    build_web      = any(f.startswith("apps/web/")      for f in MARKET_FILES)
    build_mediator = bool(POSRED_FILES)

    restart_list = []

    # ── Run DB migrations ──
    if MIGRATION_FILES:
        print("[2b/6] Running Prisma migrations...")
        run(client, f"cd {REMOTE_MARKET}/apps/api && npx prisma migrate deploy 2>&1 | tail -20")
        print("OK Migrations done\n")

    # ── Build API ──
    if build_api:
        print("[3/6] Building API (nest build)...")
        run(client, f"cd {REMOTE_MARKET}/apps/api && npx nest build 2>&1 | tail -20")
        print("OK API build done\n")
        restart_list.append("marketplace-api")
    else:
        print("[3/6] API unchanged — skip build\n")

    # ── Build Web ──
    if build_web:
        print("[4/6] Building Web (next build)...")
        run(client, f"cd {REMOTE_MARKET}/apps/web && npx next build 2>&1 | tail -30")
        print("OK Web build done\n")
        restart_list.append("marketplace-web")
    else:
        print("[4/6] Web unchanged — skip build\n")

    # ── Build Mediator ──
    if build_mediator:
        print("[5/6] Building Mediator (next build)...")
        run(client, f"cd {REMOTE_POSRED}/apps/mediator && npx next build 2>&1 | tail -30")
        print("OK Mediator build done\n")
        restart_list.append("marketplace-mediator")
    else:
        print("[5/6] Mediator unchanged — skip build\n")

    # ── Restart only changed PM2 processes ──
    print("[6/6] Restarting PM2 processes...")
    if restart_list:
        run(client, f"pm2 restart {' '.join(restart_list)} 2>&1")
    run(client, "pm2 save")
    print("OK PM2 restarted\n")

    # ── Status ──
    run(client, "pm2 list --no-color 2>/dev/null | grep -E 'marketplace|name'")

    client.close()

    print()
    print("========================================")
    print("  DEPLOY COMPLETE!")
    print("  -> https://glo-box.ru")
    print("  -> https://posred-globox.ru/dashboard")
    print("  -> https://glo-box.ru/api")
    print("========================================")
    print()

if __name__ == "__main__":
    main()
