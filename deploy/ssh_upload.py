#!/usr/bin/env python3
"""Upload files via SFTP using paramiko."""
import sys, os, paramiko

HOST = "5.42.127.159"
USER = "root"
PASS = os.environ.get("SSH_PASSWORD", "")

def upload_files(file_pairs):
    """file_pairs: list of (local_path, remote_path)"""
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, username=USER, password=PASS, timeout=15)
    sftp = client.open_sftp()
    for local, remote in file_pairs:
        # ensure remote dir exists
        remote_dir = os.path.dirname(remote)
        try:
            sftp.stat(remote_dir)
        except FileNotFoundError:
            # create dirs recursively
            parts = remote_dir.split("/")
            for i in range(2, len(parts) + 1):
                d = "/".join(parts[:i])
                try:
                    sftp.stat(d)
                except:
                    sftp.mkdir(d)
        sftp.put(local, remote)
        print(f"  {local} -> {remote}")
    sftp.close()
    client.close()

if __name__ == "__main__":
    # Usage: python ssh_upload.py local1:remote1 local2:remote2 ...
    pairs = []
    for arg in sys.argv[1:]:
        local, remote = arg.split(":", 1)
        pairs.append((local, remote))
    upload_files(pairs)
    print("Done!")
