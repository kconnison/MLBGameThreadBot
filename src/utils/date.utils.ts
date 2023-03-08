export namespace date {
    export namespace format {
        /**
         * Format date in MM/DD/YYYY format
         * @param date 
         * @returns 
         */
        export function toMM_DD_YYYY(date: Date) {
            return date.toLocaleDateString('en-US', {year: "numeric", month: "2-digit", day: "2-digit"});
        }

        /**
         * Format date in HH:mm AM/PM format
         * @param date 
         */
        export function toHHMM(date: Date) {
            return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' }).replace(/\s+(?=(AM|PM))/, "");
        }

        /**
         * Format date in YYYYMMDD_HHmmss format.
         * Used as `timecode` parameter in MLB API
         * @param date 
         * @returns 
         */
        export function toTimecode(date: Date) {
            let utcYear = date.getUTCFullYear();
            let utcMonth = (date.getUTCMonth()+1).toString().padStart(2,"0");
            let utcDate = date.getUTCDate().toString().padStart(2,"0");
            let utcHour = date.getUTCHours().toString().padStart(2,"0");
            let utcMins = date.getUTCMinutes().toString().padStart(2,"0");
            let utcSecs = date.getUTCSeconds().toString().padStart(2,"0");
            return `${utcYear}${utcMonth}${utcDate}_${utcHour}${utcMins}${utcSecs}`;            
        }

        /**
         * Converts timecode value (YYYYMMDD_HHmmss) into a Date
         * @param timecode 
         */
        export function fromTimecode(timecode: string) {
            let parts = timecode.split("_");
            let dateString = `${parts[0].substring(0,4)}-${parts[0].substring(4,6)}-${parts[0].substring(6)}T`
                + `${parts[1].substring(0,2)}:${parts[1].substring(2,4)}:${parts[1].substring(4)}Z`;
            return new Date(dateString);
        }
    }
}