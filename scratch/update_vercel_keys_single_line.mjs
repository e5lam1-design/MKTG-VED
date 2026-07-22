import { spawn } from 'child_process';
import fs from 'fs';

const credentialsPath = './sapient-flight-495410-s3-7ebddbbb3300.json';

if (!fs.existsSync(credentialsPath)) {
  console.error('Credentials file not found');
  process.exit(1);
}

const creds = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));

// Convert actual newlines to literal \n characters on a single line
const singleLineKey = creds.private_key.replace(/\n/g, '\\n');

function runVercelEnvAdd(keyName, keyValue) {
  return new Promise((resolve, reject) => {
    console.log(`Setting Vercel env variable: ${keyName} (single line)...`);
    const proc = spawn('npx', ['vercel', 'env', 'add', keyName, 'production', '--force'], {
      shell: true
    });

    proc.stdin.write(keyValue + '\n');
    proc.stdin.end();

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      if (code === 0) {
        console.log(`Successfully set ${keyName} for production`);
        
        const previewProc = spawn('npx', ['vercel', 'env', 'add', keyName, 'preview', '--force'], {
          shell: true
        });
        previewProc.stdin.write(keyValue + '\n');
        previewProc.stdin.end();
        previewProc.on('close', (pCode) => {
          if (pCode === 0) {
            console.log(`Successfully set ${keyName} for preview`);
            resolve();
          } else {
            reject(new Error(`Failed to set ${keyName} for preview`));
          }
        });
      } else {
        console.error(`Error setting ${keyName}:`, stderr);
        reject(new Error(`Failed to set ${keyName}`));
      }
    });
  });
}

async function main() {
  try {
    await runVercelEnvAdd('GOOGLE_PRIVATE_KEY', singleLineKey);
    console.log('Single-line environment variable updated successfully!');
  } catch (err) {
    console.error('Main execution error:', err);
  }
}

main();
