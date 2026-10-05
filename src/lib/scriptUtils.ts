/**
 * Utility functions for parsing and rendering script cells (Google Docs links, formulas, etc.)
 */

export interface ParsedScript {
  url: string;
  text: string;
  isLink: boolean;
}

export const parseScriptValue = (val: any): ParsedScript | null => {
  if (!val) return null;
  const s = String(val).trim();
  if (!s) return null;
  
  // 1. Check if it is a hyperlink formula (highly resilient to spacing and quotes)
  const hyperlinkRegex = /=HYPERLINK\s*\(\s*(['"])(.*?)\1\s*,\s*(['"])(.*?)\3\s*\)/i;
  const formulaMatch = s.match(hyperlinkRegex);
  if (formulaMatch) {
    return {
      url: formulaMatch[2].trim(),
      text: formulaMatch[4].trim(),
      isLink: true
    };
  }
  
  // 2. Check if it contains a google docs URL, truncated Doc path, or raw Google Doc ID
  const docMatch = s.match(/(?:docs\.google\.com\/document\/d\/|[a-zA-Z0-9_\/'\.-]*document\/d\/|[a-zA-Z0-9_\/'\.-]*cument\/d\/)(1[a-zA-Z0-9_-]+)/i);
  if (docMatch && docMatch[1]) {
    const docId = docMatch[1];
    return {
      url: `https://docs.google.com/document/d/${docId}/edit`,
      text: `Doc: ${docId.substring(0, 16)}...`,
      isLink: true
    };
  }

  if (/^1[a-zA-Z0-9_-]{25,}$/.test(s)) {
    return {
      url: `https://docs.google.com/document/d/${s}/edit`,
      text: `Doc: ${s.substring(0, 16)}...`,
      isLink: true
    };
  }

  if (s.includes('spreadsheets/d/') || s.includes('drive.google.com') || s.includes('docs.google.com') || s.startsWith('http://') || s.startsWith('https://')) {
    let url = s;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      if (url.startsWith('docs.google.com') || url.startsWith('drive.google.com')) {
        url = 'https://' + url;
      } else if (url.includes('document/d/')) {
        const idx = url.indexOf('document/d/');
        url = 'https://docs.google.com/' + url.substring(idx);
      } else {
        url = 'https://' + url;
      }
    }
    
    // Clean display text to preserve document ID path, but omit domain to keep chips beautifully compact
    let text = s;
    if (text.startsWith('https://')) text = text.substring(8);
    if (text.startsWith('http://')) text = text.substring(7);
    if (text.startsWith('www.')) text = text.substring(4);
    if (text.startsWith('docs.google.com/')) text = text.substring(16);
    
    // Limit length to keep the chip layout beautiful and prevent wrapping
    if (text.length > 32) {
      text = text.substring(0, 30) + '...';
    }
    
    return {
      url,
      text,
      isLink: true
    };
  }
  
  return {
    url: '',
    text: s,
    isLink: false
  };
};
