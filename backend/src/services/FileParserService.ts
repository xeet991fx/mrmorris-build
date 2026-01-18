import ExcelJS from "exceljs";
import pdf from "pdf-parse";

export interface RawRow {
    [key: string]: string | number | undefined;
}

export interface ParseResult {
    headers: string[];
    rows: RawRow[];
    rowCount: number;
}

/**
 * FileParserService - Parses CSV, Excel, and PDF files into structured data
 */
export class FileParserService {
    /**
     * Parse a file based on its MIME type
     */
    async parseFile(buffer: Buffer, mimeType: string, filename: string): Promise<ParseResult> {
        const extension = filename.split(".").pop()?.toLowerCase();

        if (mimeType === "text/csv" || extension === "csv") {
            return this.parseCSV(buffer);
        }

        if (
            mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
            mimeType === "application/vnd.ms-excel" ||
            extension === "xlsx" ||
            extension === "xls"
        ) {
            return await this.parseExcel(buffer);
        }

        if (mimeType === "application/pdf" || extension === "pdf") {
            return this.parsePDF(buffer);
        }

        throw new Error(`Unsupported file type: ${mimeType} (${extension})`);
    }

    /**
   * Parse CSV file - auto-detects delimiter (comma or semicolon)
   */
    parseCSV(buffer: Buffer): ParseResult {
        const content = buffer.toString("utf-8");
        const lines = content.split(/\r?\n/).filter((line) => line.trim());

        if (lines.length === 0) {
            return { headers: [], rows: [], rowCount: 0 };
        }

        // Auto-detect delimiter from first line
        const firstLine = lines[0];
        const semicolonCount = (firstLine.match(/;/g) || []).length;
        const commaCount = (firstLine.match(/,/g) || []).length;
        const delimiter = semicolonCount > commaCount ? ";" : ",";

        console.log(`📄 CSV delimiter detected: "${delimiter}"`);

        // Parse header row
        const headers = this.parseCSVLine(lines[0], delimiter);

        // Parse data rows
        const rows: RawRow[] = [];
        for (let i = 1; i < lines.length; i++) {
            const values = this.parseCSVLine(lines[i], delimiter);
            if (values.length > 0) {
                const row: RawRow = {};
                headers.forEach((header, index) => {
                    row[header] = values[index] || "";
                });
                rows.push(row);
            }
        }

        return { headers, rows, rowCount: rows.length };
    }

    /**
     * Parse a single CSV line, handling quoted values
     */
    private parseCSVLine(line: string, delimiter: string = ","): string[] {
        const result: string[] = [];
        let current = "";
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];

            if (char === '"') {
                if (inQuotes && line[i + 1] === '"') {
                    current += '"';
                    i++; // Skip escaped quote
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === delimiter && !inQuotes) {
                result.push(current.trim());
                current = "";
            } else {
                current += char;
            }
        }

        result.push(current.trim());
        return result;
    }

    /**
     * Parse Excel file (.xlsx, .xls)
     */
    async parseExcel(buffer: Buffer): Promise<ParseResult> {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);

        const worksheet = workbook.worksheets[0];
        if (!worksheet) {
            return { headers: [], rows: [], rowCount: 0 };
        }

        const jsonData: (string | number)[][] = [];
        worksheet.eachRow((row, rowNumber) => {
            const rowValues: (string | number)[] = [];
            row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                const value = cell.value;
                if (value === null || value === undefined) {
                    rowValues.push("");
                } else if (typeof value === "object" && "text" in value) {
                    // Handle rich text
                    rowValues.push(String(value.text || ""));
                } else if (typeof value === "object" && "result" in value) {
                    // Handle formula results
                    rowValues.push(String(value.result || ""));
                } else {
                    rowValues.push(typeof value === "number" ? value : String(value));
                }
            });
            jsonData.push(rowValues);
        });

        if (jsonData.length === 0) {
            return { headers: [], rows: [], rowCount: 0 };
        }

        // First row is headers
        const headers = jsonData[0].map((h) => String(h).trim());

        // Rest are data rows
        const rows: RawRow[] = [];
        for (let i = 1; i < jsonData.length; i++) {
            const rowData = jsonData[i];
            if (rowData.some((cell) => cell !== "")) {
                const row: RawRow = {};
                headers.forEach((header, index) => {
                    const value = rowData[index];
                    row[header] = value !== undefined ? String(value).trim() : "";
                });
                rows.push(row);
            }
        }

        return { headers, rows, rowCount: rows.length };
    }

    /**
     * Parse PDF file - extracts text and attempts to find tabular data
     */
    async parsePDF(buffer: Buffer): Promise<ParseResult> {
        const data = await pdf(buffer);
        const text = data.text;

        // Try to find table-like patterns in the PDF text
        // This is a basic implementation - the AI extractor will do heavy lifting
        const lines = text.split(/\r?\n/).filter((line) => line.trim());

        if (lines.length === 0) {
            return { headers: [], rows: [], rowCount: 0 };
        }

        // Return raw text lines for AI processing
        // The AIDataExtractor will handle intelligent parsing
        return {
            headers: ["_rawLine"],
            rows: lines.map((line, index) => ({
                _rawLine: line.trim(),
                _lineNumber: index + 1,
            })),
            rowCount: lines.length,
        };
    }

    /**
     * Get supported file extensions
     */
    static getSupportedExtensions(): string[] {
        return ["csv", "xlsx", "xls", "pdf"];
    }

    /**
     * Get supported MIME types
     */
    static getSupportedMimeTypes(): string[] {
        return [
            "text/csv",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/vnd.ms-excel",
            "application/pdf",
        ];
    }
}

export const fileParserService = new FileParserService();
