import * as fs from 'fs';

export interface pair {
    name: string;
    value: string;
}

export interface Package {
    name: string;
    version: string;
}

export function ReadFile(filename: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
        fs.readFile(filename, 'utf-8', (ex, data) => {
            if (ex) reject(ex)
            else resolve(data)
        })
    });
}

export function WriteFile(filename: string, data: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        fs.writeFile(filename, data, 'utf-8', ex => {
            if (ex) reject(ex)
            else resolve()
        })
    })
}

export function parseCommand(arg: string): pair {
    if (arg.startsWith('--')) {
        arg = arg.substr(2);
        let firstEqual = arg.indexOf('=');
        if (firstEqual >= 0) {
            let name = arg.substr(0, firstEqual);
            let value = arg.substr(firstEqual + 1);
            return  {
                name: name,
                value: value
            }
        }
    }
    return undefined;
}

export async function main(...args: string[]) {
    let firstSplitter = args.indexOf('--');
    console.log('args:', ...args);
    console.log('firstSplitter:', firstSplitter);
    if (firstSplitter >= 0) {
        let directives = args.slice(0, firstSplitter);
        let files = directives.map(parseCommand).filter(item => item && item.name == 'file');
        if (files.length == 0) throw `Expecting --file=path/to/package.json`;
        let file = files[0];
        let parameters = args.slice(firstSplitter + 1).filter(item => item).map(parseCommand);
        if (parameters.length > 0) {
            console.log('parameters:', parameters);
            let dict: {[key: string]: string} = {};
            for (let parameter of parameters) {
                dict[parameter.name] = parameter.value;
            }
            let data: Package = JSON.parse(await ReadFile(file.value));
            console.log('data:', data);
            data.version = data.version.replace(/\$\(([\w.]+)\)/ig, (text: string, ...groups: string[]) => {
                if (typeof dict[groups[0]] == 'undefined') {
                    return text; 
                } else {
                    return dict[groups[0]];
                }
            });
            await WriteFile(file.value, JSON.stringify(data, null, 4));
        }
    } else {
        throw `Expecting "--" in the command input.`;
    }
}

if (require.main === module) {
    (async () => {
        await main(...process.argv);
    })()
}
