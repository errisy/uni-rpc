import { Injectable } from '@angular/core';
import { NextObserver, Observable } from 'rxjs';
import { filter, first } from 'rxjs/operators';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { environment } from '../../environments/environment';
import { BaseMessage } from './BaseMessage';
import { TokenHolder } from './token-holder.service';

@Injectable({
  providedIn: 'root'
})
export class WebsocketService {
  openObserver: NextObserver<Event> = {
    next: () => console.debug('[Websocket] Connected')
};
  closeObserver: NextObserver<CloseEvent> = {
    next: () => console.debug('[Websocket] Disconnected')
};

  tracking: {[Id: string]: any} = {};
  options: {[Service: string]: string} = {};
  websockets: Map<string, WebSocketSubject<BaseMessage>> = new Map();
  constructor(public token: TokenHolder) {
    this.options = environment.webSocketOptions;
    // console.log(`connect to ${environment.webSocketUri}`);
    // this.subject = webSocket(`${environment.webSocketUri}?token=${token.Access}`);
    for (let service in this.options) {
      let endpoint = this.options[service];
      if (!this.websockets.has(endpoint)) {
        let subject = webSocket<BaseMessage>(`${endpoint}?token=${token.Access}`);
        this.websockets.set(endpoint, subject);
        subject.subscribe(this.onReceive, this.onError, this.onClose(endpoint));
      }
    }
  }

  onReceive = (item: BaseMessage) => {
    if (!item.Id) {
      console.warn('the incoming message has no "Id" attribute:', item);
      console.warn(this.tracking);
    } else {
      delete this.tracking[item.Id];
      console.log('incoming:', item);
    }
  };

  onError = (error: any) => {
  };

  onClose(endpoint: string) {
    return () => {
      console.log(`WebSocket at ${endpoint} closed.`);
    }
  }


  generateId(length: number): string{
    let now = new Date();
    let sections: string[] = [];
    sections.push(now.getUTCFullYear().toString().padStart(4, '0'));
    sections.push((now.getUTCMonth()+1).toString().padStart(2,'0'));
    sections.push(now.getUTCDate().toString().padStart(2,'0'));
    sections.push('-');
    sections.push(now.getUTCHours().toString().padStart(2,'0'));
    sections.push(now.getUTCMinutes().toString().padStart(2,'0'));
    sections.push(now.getUTCSeconds().toString().padStart(2,'0'));
    sections.push(now.getMilliseconds().toString().padStart(3,'0'));
    sections.push('-');
    for(let i = 0; i < length; i++){
      sections.push(Math.floor(Math.random() * 36).toString(36));
    }
    return sections.join('');
  }

  getWebSocketSubject(fullname: string) {
    let sections = fullname.split('.');
    while (sections.length > 0) {
      let service = sections.join('.');
      if (service in this.options) {
        let endpoind = this.options[service];
        return this.websockets.get(endpoind);
      }
      sections.pop();
    }
    let endpoind = this.options['__default'];
    return this.websockets.get(endpoind);
  }

  send(message: BaseMessage): Observable<BaseMessage> {
    let Id = this.generateId(16);
    message.Id = Id;
    this.tracking[Id] = message;
    console.log('tracking:', this.tracking);
    let subject = this.getWebSocketSubject(message.Service) as WebSocketSubject<BaseMessage>;
    let pipe = subject.pipe(filter(item => item.Id == Id)).pipe(first());
    subject.next(message);
    return pipe as any;
  }
}
