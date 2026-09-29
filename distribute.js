const fs = require('fs');
const path = require('path');

const content = fs.readFileSync('Bolsilludo_Fase1_mayorEspecificacion.md', 'utf-8');
const lines = content.split('\n');

const specs = [
  { id: '00', title: '# 0. CÓMO USAR ESTE DOCUMENTO', folder: null },
  { id: 'A', title: '# PARTE A', folder: '00b-design-system' },
  { id: '01', title: '# SPEC 01', folder: '01-identity' },
  { id: '02', title: '# SPEC 02', folder: '02-workspaces-budgets' },
  { id: '03', title: '# SPEC 03', folder: '03-accounts' },
  { id: '04', title: '# SPEC 04', folder: '04-transactions' },
  { id: 'B', title: '# PARTE B', folder: null },
  { id: '05', title: '# SPEC 05', folder: '05-budget-engine' },
  { id: '06', title: '# SPEC 06', folder: '06-goals' },
  { id: '07', title: '# SPEC 07', folder: '07-credit-cards' },
  { id: '08', title: '# SPEC 08', folder: '08-reconciliation' },
  { id: '09', title: '# SPEC 09', folder: '09-imports' },
  { id: '10', title: '# SPEC 10', folder: '10-scheduled-transactions' },
  { id: '11', title: '# SPEC 11', folder: '11-reports' },
  { id: '12', title: '# SPEC 12', folder: '12-collaboration' },
  { id: 'C', title: '# PARTE C', folder: null } // end marker
];

let currentSpecIndex = -1;
let currentBlock = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  // Check if we hit a new section
  const nextSpecIndex = specs.findIndex(s => line.startsWith(s.title));
  
  if (nextSpecIndex !== -1) {
    // Flush current block
    if (currentSpecIndex !== -1 && specs[currentSpecIndex].folder) {
      const folderPath = path.join('specs', specs[currentSpecIndex].folder);
      if (fs.existsSync(folderPath)) {
        // Find tasks section to split
        let specLines = [];
        let taskLines = [];
        let inTasks = false;
        
        for (const bl of currentBlock) {
          if (bl.match(/^## \d+\.11 Tasks atómicas/)) {
            inTasks = true;
          } else if (inTasks && bl.match(/^## \d+\.12/)) {
            inTasks = false;
          }
          
          if (inTasks) {
            taskLines.push(bl);
          } else {
            specLines.push(bl);
          }
        }
        
        fs.writeFileSync(path.join(folderPath, 'spec.md'), specLines.join('\n'));
        if (taskLines.length > 0) {
          // Wrap tasks in a title if needed or just write them
          fs.writeFileSync(path.join(folderPath, 'tasks.md'), '# TASKS\n\n' + taskLines.join('\n'));
        }
        console.log('Written to ' + folderPath);
      }
    }
    currentSpecIndex = nextSpecIndex;
    currentBlock = [line];
  } else {
    if (currentSpecIndex !== -1) {
      currentBlock.push(line);
    }
  }
}

// Flush last block if applicable
if (currentSpecIndex !== -1 && specs[currentSpecIndex].folder && currentSpecIndex !== specs.length - 1) {
  const folderPath = path.join('specs', specs[currentSpecIndex].folder);
  if (fs.existsSync(folderPath)) {
    fs.writeFileSync(path.join(folderPath, 'spec.md'), currentBlock.join('\n'));
    console.log('Written to ' + folderPath);
  }
}
