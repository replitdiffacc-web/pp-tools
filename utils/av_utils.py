import os, subprocess, shutil, tempfile

def which(name):
    return shutil.which(name)

def convert_audio(in_path, out_path, bitrate='192k'):
    if not which('ffmpeg'):
        raise RuntimeError('ffmpeg not found. brew install ffmpeg')
    cmd = ['ffmpeg','-y','-i',in_path,'-vn','-ab',bitrate,out_path]
    cp = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if cp.returncode != 0:
        raise RuntimeError(f"ffmpeg error:\nSTDOUT:\n{cp.stdout}\nSTDERR:\n{cp.stderr}")
    return out_path

def convert_video(in_path, out_path):
    if not which('ffmpeg'):
        raise RuntimeError('ffmpeg not found. brew install ffmpeg')
    cmd = ['ffmpeg','-y','-i',in_path,out_path]
    cp = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if cp.returncode != 0:
        raise RuntimeError(f"ffmpeg error:\nSTDOUT:\n{cp.stdout}\nSTDERR:\n{cp.stderr}")
    return out_path

def video_to_gif(in_path, out_path, fps=12, scale=None):
    if not which('ffmpeg'):
        raise RuntimeError('ffmpeg not found. brew install ffmpeg')
    filters = [f'fps={fps}']
    if scale:
        w,h = scale
        filters.append(f'scale={w}:{h}:flags=lanczos')
    vf = ','.join(filters)
    cmd = ['ffmpeg','-y','-i',in_path,'-vf',vf,'-loop','0',out_path]
    cp = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if cp.returncode != 0:
        raise RuntimeError(f"ffmpeg error:\nSTDOUT:\n{cp.stdout}\nSTDERR:\n{cp.stderr}")
    return out_path
