export class GameStatsTable {
    private columns: GameStatsTableColumn[] = [];
    private rows: any[][] = [];

    constructor() {
        return this;
    }

    public setColumns(cols: GameStatsTableColumn[]) {
        this.columns = cols;
        return this;
    }

    public setRows(rows: any[][]) {
        for(let i=0; i<rows.length; i++) {
            let row = rows[i];
            row = this.standardizeRowLength(row);
        }        

        this.rows = rows;
        return this;
    }

    public addRow(row: any[]) {
        row = this.standardizeRowLength(row);
        this.rows.push(row);
    }

    public toString() {
        let tableWidth = this.columns.reduce((accum, col) => {
            return accum + col.width;
        }, 0);
        let separator = "".padEnd(tableWidth, "—");

        let header = this.columns.map((col) => {
            if( col.align == "right" ) {
                return col.label.padStart(col.width, " ");
            }
            return col.label.padEnd(col.width, " ");

        }).join("");

        let body = this.rows.map((row) => {
            return row.map((value, i) => {
                let col = this.columns.at(i);
                if( col?.align == "right" ) {
                    return ""+value.padStart(col.width, " ");
                }
                return ""+value.padEnd(col?.width, " ");

            }).join("");

        }).join("\n");

        return [header, separator, body].join("\n");
    }

    /**
     * Confirms that row length matches the number of columns defined
     * @param row 
     * @returns 
     */
    private standardizeRowLength(row: any[]) {
        if( row.length < this.columns.length ) {
            let filler = new Array((this.columns.length - row.length)).fill("");
            row = row.concat(filler);
        } else if( row.length > this.columns.length ) {
            let numToRemove = row.length - this.columns.length;
            row.splice(this.columns.length, numToRemove);
        }
        return row;
    }
}

export interface GameStatsTableColumn {
    label: string;
    width: number;
    align?: "left" | "right"
}