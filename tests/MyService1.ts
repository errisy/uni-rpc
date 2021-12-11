
namespace MyService {

    export namespace SubService {
        export class SubMessage<T> {
            message: Message;
        }
        // export class Message {

        // }
        export namespace SubService {
            export class SubMessage<T> {
                message: Message;
            }
            export namespace SubService {
                export class TestMessage {
                    prop: SubMessage<string>;
                }
            }
        }
    }

    export abstract class DevService<Dog> {
        abstract Send(message: Message): boolean;
        abstract Get(): boolean;
        abstract StoryCount(): number;
        abstract Test(): string;
        abstract AB(my: double): float;
        abstract Gap(value: integer, enabled: boolean): List<long>;
        /** release resource */
        abstract Release<Cat> (/** the cat instance*/cat: Cat, dog: Dog): bytes;
        abstract GetMessage(): Message;
        abstract IncomingCall(): void;
    }

    export class Message {
        name: string;
        value: integer;
        tested: boolean;
        sub: SubService.SubMessage<Message>;
    }

    export class AdvancedMessage extends Message {
        story: string;
    }

    export interface ITestMessage {
        prop: string;
    }

    export interface IUICloseService {
        test(): string;
    }

    export interface IUXService extends IUICloseService {
        resolve(): void;
    }

    export interface IMXService {
        testJob(): boolean;
    }

    export abstract class MXU implements IMXService, IUXService {
        // comment 1;
        abstract testJob(): boolean;
        /** 
         * comment 2 is not
         * just one line
        */
        abstract resolve(): void;
        abstract test(): string;
        sendAdvancedMessage: EventEmitter<MyService.AdvancedMessage>;
    } 

    export class AdvancedMessage2 extends SubService.SubService.SubMessage<string> {
        story: string;
    }

}

namespace MyService {
    export enum StageEnum {
        Value = 'Value',
        Hello = 'Hello',
        Jade = 'Jade'
    }

    export abstract class TestService {
        abstract test(name: string, value: number, msg: TestMessage): void;
    }

    export class TestMessage {
        name: string;
        item: number;
    }
}


