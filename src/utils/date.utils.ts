export namespace date {
    export namespace format {
        export function MMDDYYYY(date: Date) {
            let year = date.getFullYear();
            let month = (date.getMonth()+1).toString().padStart(2,"0");
            let day = date.getDate().toString().padStart(2,"0");
            return `${month}/${day}/${year}`;
        }

        export function timecode(date: Date) {
            let utcYear = date.getUTCFullYear();
            let utcMonth = (date.getUTCMonth()+1).toString().padStart(2,"0");
            let utcDate = date.getUTCDate().toString().padStart(2,"0");
            let utcHour = date.getUTCHours().toString().padStart(2,"0");
            let utcMins = date.getUTCMinutes().toString().padStart(2,"0");
            let utcSecs = date.getUTCSeconds().toString().padStart(2,"0");
            return `${utcYear}${utcMonth}${utcDate}_${utcHour}${utcMins}${utcSecs}`;            
        }
    }
}