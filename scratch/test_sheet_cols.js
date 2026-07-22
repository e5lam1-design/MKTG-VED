import { google } from 'googleapis';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const auth = new google.auth.GoogleAuth({
  keyFile: path.resolve(__dirname, '../sapient-flight-495410-s3-7ebddbbb3300.json'),
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
});

const spreadsheetId = '1Hm7noXxv8ITMU3dNXQmqFEzfZY1mZlBJ4bQ9_ZIR0-M'; // Operations sheet id from App.tsx

async function main() {
  const sheets = google.sheets({ version: 'v4', auth });
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const sheet = meta.data.sheets.find(s => String(s.properties.sheetId) === '1476192399');
  if (!sheet) {
    console.error('Sheet not found');
    return;
  }
  const sheetName = sheet.properties.title;
  console.log('Sheet name:', sheetName);

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!A1:Z5`,
  });

  const rows = response.data.values || [];
  console.log('Total rows fetched:', rows.length);
  rows.forEach((row, i) => {
    console.log(`Row ${i}:`, row);
  });
}

main().catch(console.error);
