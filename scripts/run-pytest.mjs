import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const venvPytestWin = path.join('apps', 'ai-service', '.venv', 'Scripts', 'pytest.exe');
const venvPytestUnix = path.join('apps', 'ai-service', '.venv', 'bin', 'pytest');

let pytestCmd = 'pytest';
if (process.platform === 'win32' && fs.existsSync(venvPytestWin)) {
  pytestCmd = venvPytestWin;
} else if (fs.existsSync(venvPytestUnix)) {
  pytestCmd = venvPytestUnix;
}

const args = process.argv.slice(2);
const res = spawnSync(pytestCmd, args, { stdio: 'inherit', shell: false });
process.exit(res.status ?? 0);
