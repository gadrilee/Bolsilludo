import type { NormalizedImportTransaction } from './types';

export function parseCSV(
    content: string, 
    mapping: { date: string, amount: string, payee: string, memo: string, skipRows?: number }
): NormalizedImportTransaction[] {
    const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);
    const results: NormalizedImportTransaction[] = [];
    
    // We assume the first line is header unless skipRows is set
    const skip = mapping.skipRows || 1;
    if (lines.length <= skip) return [];

    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    
    // Find indices
    const dateIdx = headers.indexOf(mapping.date);
    const amountIdx = headers.indexOf(mapping.amount);
    const payeeIdx = headers.indexOf(mapping.payee);
    const memoIdx = mapping.memo ? headers.indexOf(mapping.memo) : -1;

    if (dateIdx === -1 || amountIdx === -1) {
        throw new Error('Mapeo de CSV inválido: faltan columnas requeridas');
    }

    for (let i = skip; i < lines.length; i++) {
        const line = lines[i];
        // naive split for now, ignoring commas inside quotes
        // better regex for CSV split:
        const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.trim().replace(/^"|"$/g, ''));
        
        if (cols.length <= amountIdx) continue;

        const dateStr = cols[dateIdx];
        const amountStr = cols[amountIdx].replace(/,/g, ''); // basic cleanup
        let amountMinor = BigInt(0);
        try {
            amountMinor = BigInt(Math.round(parseFloat(amountStr) * 100));
        } catch {
            continue; // skip invalid rows
        }

        const rawDescription = payeeIdx !== -1 ? cols[payeeIdx] : '';
        const memo = memoIdx !== -1 ? cols[memoIdx] : '';
        const fullDesc = memo ? `${rawDescription} - ${memo}` : rawDescription;

        // BR-IMP-090: Text is data, not instruction. No parsing of `=, +, -` functions.
        results.push({
            rowIndex: i,
            rawDescription: fullDesc,
            normalizedPayee: rawDescription.substring(0, 50), // simple truncation
            amountMinor,
            currency: 'BOB', // Default, should be injected
            postedDate: new Date(dateStr).toISOString().split('T')[0],
            pending: false,
        });
    }

    return results;
}

export function parseOFX(content: string): NormalizedImportTransaction[] {
    const results: NormalizedImportTransaction[] = [];
    
    // OFX is an SGML-like format. We look for <STMTTRN> blocks.
    const trnRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/g;
    let match;
    let index = 0;

    while ((match = trnRegex.exec(content)) !== null) {
        const block = match[1];
        
        // Extract fields
        const trntype = (/<TRNTYPE>(.*?)(?:<|$)/.exec(block)?.[1] || '').trim();
        const dtpostedStr = (/<DTPOSTED>(.*?)(?:<|$)/.exec(block)?.[1] || '').trim();
        const trnamtStr = (/<TRNAMT>(.*?)(?:<|$)/.exec(block)?.[1] || '').trim();
        const fitid = (/<FITID>(.*?)(?:<|$)/.exec(block)?.[1] || '').trim();
        const name = (/<NAME>(.*?)(?:<|$)/.exec(block)?.[1] || '').trim();
        const memo = (/<MEMO>(.*?)(?:<|$)/.exec(block)?.[1] || '').trim();
        
        let amountMinor = BigInt(0);
        try {
            amountMinor = BigInt(Math.round(parseFloat(trnamtStr) * 100));
        } catch {
            continue;
        }
        
        // DTPOSTED format: YYYYMMDDHHMMSS
        let postedDate = '';
        if (dtpostedStr.length >= 8) {
            postedDate = `${dtpostedStr.substring(0,4)}-${dtpostedStr.substring(4,6)}-${dtpostedStr.substring(6,8)}`;
        }

        const rawDesc = memo ? `${name} ${memo}` : name;

        results.push({
            rowIndex: index++,
            externalId: fitid,
            rawDescription: rawDesc,
            normalizedPayee: name.substring(0, 50),
            amountMinor,
            currency: 'BOB', // usually from <CURDEF>, simplified for now
            postedDate,
            pending: false, // OFX standard STMTTRN is posted. <BANKTRANLIST> is posted.
        });
    }

    return results;
}
