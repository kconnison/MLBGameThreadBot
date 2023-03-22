export namespace http {
    export function get<T>(url: string) {
        return fetch(url, { method: "GET" })
            .then((response) => {
                if( response.ok ) {
                    return response.json();
                } else {
                    throw new Error(`${response.status}: ${response.statusText}`);
                }
            }).then(data => {
                return data as T
            });
    }
}