import fs from 'fs';
import path from 'path';

const file = './public/test.json';
if (fs.existsSync(file)) {
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  console.log('test.json total rows:', data.rows ? data.rows.length : 0);
  if (data.rows && data.rows.length > 0) {
    console.log('test.json row 0:', data.rows[0]);
    console.log('test.json row 1:', data.rows[1]);
  }
} else {
  console.log('test.json does not exist');
}
