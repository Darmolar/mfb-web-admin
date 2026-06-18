const fs = require('fs');
const path = require('path');

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  let original = content;

  // Replace new Date(X).toLocaleString() with moment(X).fromNow()
  // and new Date(X).toLocaleDateString() with moment(X).fromNow()
  content = content.replace(/new Date\(([^)]+)\)\.toLocaleString\(\)/g, 'moment($1).fromNow()');
  content = content.replace(/new Date\(([^)]+)\)\.toLocaleDateString\(\)/g, 'moment($1).fromNow()');

  // Replace String split('T')[0] pattern
  // E.g. d.lastUsed?.split('T')[0] -> moment(d.lastUsed).fromNow()
  content = content.replace(/([a-zA-Z0-9_?.]+)\.split\('T'\)\[0\]/g, (match, p1) => {
    // If p1 has a question mark, we might want to do: p1 ? moment(p1).fromNow() : ''
    // But moment(undefined) handles it or we can just keep it safe
    if (p1.endsWith('?')) {
      const v = p1.slice(0, -1);
      return `${v} ? moment(${v}).fromNow() : ''`;
    }
    return `moment(${p1}).fromNow()`;
  });

  if (content !== original) {
    if (!content.includes("import moment from 'moment'")) {
      // Find the last import statement
      const importRegex = /^import\s+.*?from\s+['"].*?['"];?$/gm;
      let lastImportIndex = 0;
      let match;
      while ((match = importRegex.exec(content)) !== null) {
        lastImportIndex = match.index + match[0].length;
      }
      
      if (lastImportIndex > 0) {
        content = content.slice(0, lastImportIndex) + "\nimport moment from 'moment'" + content.slice(lastImportIndex);
      } else {
        content = "import moment from 'moment'\n" + content;
      }
    }
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`Updated ${filePath}`);
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      processFile(fullPath);
    }
  }
}

walkDir('src/components');
