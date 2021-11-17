import { Injectable } from '@angular/core';
import { Subscribable } from 'rxjs';
import { filter, first } from 'rxjs/operators';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { environment } from '../../environments/environment';
import { BaseMessage } from './base-message';
import { TokenHolder } from './token-holder.service';



@Injectable({
  providedIn: 'root'
})
export class WebsocketClient {
  subject: WebSocketSubject<BaseMessage>;
  tracking: {[serial: string]: any} = {};
  constructor(public token: TokenHolder) {
    console.log(`connect to ${environment.webSocketUri}`);
    this.subject = webSocket(`${environment.webSocketUri}?token=${token.Access}`);
    this.subject.subscribe(item => {
      if (!item.serial) {
        console.warn('the incoming message has no "serial" attribute:', item);
        console.warn(this.tracking);
      } else {
        delete this.tracking[item.serial];
        console.log('incoming:', item);
      }
    });
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
  send(message: BaseMessage): Subscribable<BaseMessage> {
    let Id = this.generateId(16);
    message.Id = Id;
    this.tracking[Id] = message;
    console.log('tracking:', this.tracking);
    let pipe = this.subject.pipe(filter(item => item.serial == Id)).pipe(first());
    this.subject.next(message);
    return pipe as any;
  }
}
