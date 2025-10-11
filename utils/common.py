import shutil, subprocess, tempfile, os, pathlib

def which_or_raise(name):
    path = shutil.which(name)
    if not path:
        raise RuntimeError(f"Required binary '{name}' not found on PATH.")
    return path

def run(cmd, check=True):
    # Simple subprocess wrapper with useful error messages
    try:
        completed = subprocess.run(cmd, check=check, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        return completed.stdout
    except subprocess.CalledProcessError as e:
        raise RuntimeError(f"Command failed: {' '.join(cmd)}\nSTDOUT:\n{e.stdout}\nSTDERR:\n{e.stderr}") from e

def ensure_dir(path):
    os.makedirs(path, exist_ok=True)
    return path

def temp_file(suffix):
    fd, p = tempfile.mkstemp(suffix=suffix)
    os.close(fd)
    return p
