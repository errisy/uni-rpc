import * as http from 'http';
import { IWebsocketEvent } from './UniRpc/LambdaWebsocketTypes';
import { WebsocketService } from './UniRpc/WebsocketService';
import { IKEGGMessage, KEGGMethod } from './kegg';

export function KEGGRequest(message: IKEGGMessage) {
    return new Promise<IKEGGMessage>((resolve, reject) => {
        let url = `http://rest.kegg.jp/${message.Method}/${message.Key}`;
        let request = http.get(url, response => {
            let result = '';
            response.on('data', value => {
                result += value;
            });
            response.on('end', () => {
                message.Content = result;
                resolve(message);
            });
            response.on('error', () => {
                reject('response failed');
            });
        });
        request.on('error', () => {
            reject('request failed');
        });
        // request.end();
    });
}

export async function handler (event: IWebsocketEvent) {
    let service = new WebsocketService();
    return await service.ProcessEvent(event);
};
