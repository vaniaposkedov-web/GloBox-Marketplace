import os
#!/usr/bin/env python3
"""Minimal SSH executor via paramiko."""
import sys, paramiko

HOST = "5.42.127.159"
USER = "root"
PASS = os.environ.get("SSH_PASSWORD", "")

def run(cmd):
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, username=USER, password=PASS, timeout=15)
    stdin, stdout, stderr = client.exec_command(cmd, timeout=120)
    out = stdout.read().decode()
    err = stderr.read().decode()
    code = stdout.channel.recv_exit_status()
    client.close()
    if out: print(out.rstrip())
    if err: print(err.rstrip(), file=sys.stderr)
    return code

if __name__ == "__main__":
    cmd = " ".join(sys.argv[1:]) if len(sys.argv) > 1 else "echo ok"
    sys.exit(run(cmd))
