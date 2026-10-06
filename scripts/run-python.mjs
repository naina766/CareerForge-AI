import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const venvPythonWin = path.join('apps', 'ai-service', '.venv', 'Scripts', 'python.exe');
const venvPythonUnix = path.join('apps', 'ai-service', '.venv', 'bin', 'python');

let pythonCmd = 'python';
if (process.platform === 'win32' && fs.existsSync(venvPythonWin)) {
  pythonCmd = venvPythonWin;
} else if (fs.existsSync(venvPythonUnix)) {
  pythonCmd = venvPythonUnix;
}

const args = process.argv.slice(2);
const res = spawnSync(pythonCmd, args, { stdio: 'inherit', shell: false });
process.exit(res.status ?? 0);
