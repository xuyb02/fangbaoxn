class FileParser {
    static async parseFile(file, samplingRate = 1e6) {
        const filename = file.name.toLowerCase();
        
        if (filename.endsWith('.pdf')) {
            return await this.parsePdfFile(file);
        } else if (filename.endsWith('.xlsx') || filename.endsWith('.xls')) {
            return await this.parseExcelFile(file);
        } else if (filename.endsWith('.csv') || filename.endsWith('.txt')) {
            return await this.parseCsvFile(file);
        } else {
            throw new Error(`不支持的文件格式: ${file.name}`);
        }
    }

    static async parseCsvFile(file) {
        const content = await this.readFileAsText(file);
        const lines = content.trim().split('\n').filter(line => line.trim() && !line.startsWith('#'));
        
        if (lines.length < 2) {
            throw new Error('CSV文件数据不足');
        }
        
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        
        const findColumn = (names) => {
            for (const name of names) {
                const idx = headers.indexOf(name);
                if (idx >= 0) return idx;
            }
            return -1;
        };
        
        const timeCol = findColumn(['time', 't']) >= 0 ? findColumn(['time', 't']) : 0;
        const incidentCol = findColumn(['incident', 'voltage1', 'v1', 'i', 'channel1']) >= 0 ? 
                            findColumn(['incident', 'voltage1', 'v1', 'i', 'channel1']) : 1;
        const reflectedCol = findColumn(['reflected', 'voltage2', 'v2', 'r', 'channel2']) >= 0 ? 
                             findColumn(['reflected', 'voltage2', 'v2', 'r', 'channel2']) : 2;
        const transmittedCol = findColumn(['transmitted', 'voltage3', 'v3', 'channel3']) >= 0 ? 
                               findColumn(['transmitted', 'voltage3', 'v3', 'channel3']) : -1;
        
        const data = [];
        const maxCol = Math.max(timeCol, incidentCol, reflectedCol) + 1;
        
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',');
            if (values.length >= maxCol) {
                const row = [
                    parseFloat(values[timeCol].trim()),
                    parseFloat(values[incidentCol].trim()),
                    parseFloat(values[reflectedCol].trim())
                ];
                if (transmittedCol >= 0 && values.length > transmittedCol) {
                    row.push(parseFloat(values[transmittedCol].trim()));
                } else {
                    row.push(0.0);
                }
                data.push(row);
            }
        }
        
        return {
            time: data.map(row => row[0]),
            incident: data.map(row => row[1]),
            reflected: data.map(row => row[2]),
            transmitted: data.map(row => row[3]),
            data_points: data.length
        };
    }

    static async parseExcelFile(file) {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
        
        if (jsonData.length < 2) {
            throw new Error('Excel文件数据不足');
        }
        
        const headers = jsonData[0].map(h => String(h).toLowerCase().trim());
        
        const findColumn = (names) => {
            for (const name of names) {
                const idx = headers.indexOf(name);
                if (idx >= 0) return idx;
            }
            return -1;
        };
        
        const timeCol = findColumn(['time', 't']) >= 0 ? findColumn(['time', 't']) : 0;
        const incidentCol = findColumn(['incident', 'voltage1', 'v1', 'i', 'channel1']) >= 0 ? 
                            findColumn(['incident', 'voltage1', 'v1', 'i', 'channel1']) : 1;
        const reflectedCol = findColumn(['reflected', 'voltage2', 'v2', 'r', 'channel2']) >= 0 ? 
                             findColumn(['reflected', 'voltage2', 'v2', 'r', 'channel2']) : 2;
        const transmittedCol = findColumn(['transmitted', 'voltage3', 'v3', 'channel3']) >= 0 ? 
                               findColumn(['transmitted', 'voltage3', 'v3', 'channel3']) : 3;
        
        const time = [];
        const incident = [];
        const reflected = [];
        const transmitted = [];
        
        for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (row.length > Math.max(timeCol, incidentCol, reflectedCol)) {
                time.push(parseFloat(row[timeCol]));
                incident.push(parseFloat(row[incidentCol]));
                reflected.push(parseFloat(row[reflectedCol]));
                transmitted.push(transmittedCol < row.length ? parseFloat(row[transmittedCol]) : 0);
            }
        }
        
        return { time, incident, reflected, transmitted, data_points: time.length };
    }

    static async parsePdfFile(file) {
        const text = await this.extractTextFromPdf(file);
        const lines = text.trim().split('\n');
        const dataLines = [];
        
        for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine) continue;
            
            const parts = trimmedLine.split(/\s+/);
            if (parts.length >= 4) {
                try {
                    const nums = parts.slice(0, 4).map(p => parseFloat(p));
                    if (nums.every(n => !isNaN(n))) {
                        dataLines.push(nums);
                    }
                } catch { continue; }
            }
        }
        
        if (dataLines.length === 0) {
            throw new Error('PDF中未找到有效的数据表');
        }
        
        return {
            time: dataLines.map(row => row[0]),
            incident: dataLines.map(row => row[1]),
            reflected: dataLines.map(row => row[2]),
            transmitted: dataLines.map(row => row[3]),
            data_points: dataLines.length
        };
    }

    static async extractTextFromPdf(file) {
        const arrayBuffer = await file.arrayBuffer();
        
        try {
            if (typeof pdfjsLib !== 'undefined') {
                const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                let text = '';
                
                for (let i = 0; i < pdf.numPages; i++) {
                    const page = await pdf.getPage(i + 1);
                    const textContent = await page.getTextContent();
                    text += textContent.items.map(item => item.str).join(' ');
                }
                
                return text;
            } else {
                const bytes = new Uint8Array(arrayBuffer);
                let text = '';
                
                for (let i = 0; i < bytes.length; i++) {
                    if (bytes[i] >= 32 && bytes[i] <= 126) {
                        text += String.fromCharCode(bytes[i]);
                    } else if (bytes[i] === 10 || bytes[i] === 13) {
                        text += '\n';
                    }
                }
                
                return text;
            }
        } catch (error) {
            throw new Error(`PDF解析失败: ${error.message}`);
        }
    }

    static async readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = () => reject(new Error('无法读取文件'));
            reader.readAsText(file);
        });
    }
}